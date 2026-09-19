"""Fleet error telemetry store - the depot-side sink for fleet_error/v1.

[RATIONALE]: The depot is the fleet aggregation point for cross-server failure
telemetry (see mcp-central-docs patterns/FLEET_ERROR_TELEMETRY.md). Servers POST
their local ring-buffer tails here; agents query "why did the last three
attempts fail across similar tools?" against this table.
"""

from __future__ import annotations

import json
import logging
import sqlite3
import threading
from datetime import UTC, datetime
from pathlib import Path

logger = logging.getLogger(__name__)

SCHEMA = "fleet_error/v1"
RING_SIZE = 10_000
_REQUIRED = ("ts", "server", "tool", "error_type", "message")

_DDL = """
CREATE TABLE IF NOT EXISTS fleet_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schema TEXT NOT NULL,
    ts TEXT NOT NULL,
    server TEXT NOT NULL,
    tool TEXT NOT NULL,
    operation TEXT,
    error_type TEXT NOT NULL,
    message TEXT NOT NULL,
    params TEXT,
    failure_state TEXT,
    recovery TEXT,
    ingested_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fleet_errors_dedupe ON fleet_errors(server, ts);
CREATE INDEX IF NOT EXISTS idx_fleet_errors_type ON fleet_errors(tool, error_type);
"""


class FleetErrorStore:
    """SQLite-backed fleet_error/v1 aggregator (thread-safe, ring-bounded)."""

    def __init__(self, config) -> None:
        self._db_path = Path(config.data_dir) / "fleet_errors.sqlite3"
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self) -> None:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            conn = self._connect()
            conn.executescript(_DDL)
            conn.close()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=5)
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    @staticmethod
    def _sanitize(record: dict) -> dict:
        """Keep only v1 schema fields; drop unknown keys. No secret scrubbing
        beyond field whitelisting - producers must sanitize params themselves."""
        out = {"schema": record.get("schema", SCHEMA)}
        for key in ("ts", "server", "tool", "operation", "error_type", "message"):
            out[key] = record.get(key)
        for key in ("params", "failure_state", "recovery"):
            value = record.get(key)
            out[key] = json.dumps(value) if value is not None else None
        return out

    def ingest(self, records: list[dict]) -> dict:
        """Upsert v1 records, deduped by (server, ts). Never raises."""
        ingested, deduped = 0, 0
        if not records:
            return {"ingested": 0, "deduped": 0}
        now = datetime.now(UTC).isoformat()
        try:
            with self._lock:
                conn = self._connect()
                for raw in records:
                    if not isinstance(raw, dict) or any(
                        not raw.get(k) for k in ("ts", "server", "tool", "error_type", "message")
                    ):
                        continue
                    row = self._sanitize(raw)
                    cur = conn.execute(
                        "INSERT OR IGNORE INTO fleet_errors (schema, ts, server, tool, operation, "
                        "error_type, message, params, failure_state, recovery, ingested_at) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (
                            row["schema"],
                            row["ts"],
                            row["server"],
                            row["tool"],
                            row["operation"],
                            row["error_type"],
                            row["message"],
                            row["params"],
                            row["failure_state"],
                            row["recovery"],
                            now,
                        ),
                    )
                    if cur.rowcount == 1:
                        ingested += 1
                    else:
                        deduped += 1
                conn.execute(
                    "DELETE FROM fleet_errors WHERE id NOT IN (SELECT id FROM fleet_errors ORDER BY id DESC LIMIT ?)",
                    (RING_SIZE,),
                )
                conn.commit()
                conn.close()
        except Exception:
            logger.warning("fleet error ingest failed", exc_info=True)
        return {"ingested": ingested, "deduped": deduped}

    def query(
        self,
        *,
        server: str | None = None,
        tool: str | None = None,
        error_type: str | None = None,
        since: str | None = None,
        last_n: int = 20,
    ) -> list[dict]:
        """Newest-first records matching the filters."""
        clauses, values = [], []
        if server:
            clauses.append("server = ?")
            values.append(server)
        if tool:
            clauses.append("tool = ?")
            values.append(tool)
        if error_type:
            clauses.append("error_type = ?")
            values.append(error_type)
        if since:
            clauses.append("ts >= ?")
            values.append(since)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        values.append(max(1, min(int(last_n), 500)))
        try:
            with self._lock:
                conn = self._connect()
                conn.row_factory = sqlite3.Row
                rows = conn.execute(
                    "SELECT * FROM fleet_errors" + where + " ORDER BY id DESC LIMIT ?",
                    values,
                ).fetchall()
                conn.close()
        except Exception:
            logger.warning("fleet error query failed", exc_info=True)
            return []
        out = []
        for row in rows:
            out.append(
                {
                    "schema": row["schema"],
                    "ts": row["ts"],
                    "server": row["server"],
                    "tool": row["tool"],
                    "operation": row["operation"],
                    "error_type": row["error_type"],
                    "message": row["message"],
                    "params": json.loads(row["params"]) if row["params"] else None,
                    "failure_state": json.loads(row["failure_state"]) if row["failure_state"] else None,
                    "recovery": json.loads(row["recovery"]) if row["recovery"] else None,
                    "ingested_at": row["ingested_at"],
                }
            )
        return out

    def stats(self) -> dict:
        """Totals by server and error_type, newest ts, ring size."""
        try:
            with self._lock:
                conn = self._connect()
                conn.row_factory = sqlite3.Row
                total = conn.execute("SELECT COUNT(*) AS c FROM fleet_errors").fetchone()["c"]
                by_server = conn.execute(
                    "SELECT server, COUNT(*) AS c FROM fleet_errors GROUP BY server ORDER BY c DESC"
                ).fetchall()
                by_type = conn.execute(
                    "SELECT error_type, COUNT(*) AS c FROM fleet_errors GROUP BY error_type ORDER BY c DESC"
                ).fetchall()
                newest = conn.execute("SELECT MAX(ts) AS t FROM fleet_errors").fetchone()["t"]
                conn.close()
        except Exception:
            logger.warning("fleet error stats failed", exc_info=True)
            return {"total": 0, "by_server": [], "by_error_type": [], "newest_ts": None}
        return {
            "total": total,
            "ring_size": RING_SIZE,
            "by_server": [{"server": r["server"], "count": r["c"]} for r in by_server],
            "by_error_type": [{"error_type": r["error_type"], "count": r["c"]} for r in by_type],
            "newest_ts": newest,
        }
