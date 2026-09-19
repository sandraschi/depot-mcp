"""LLM API endpoints for model management and chat with Ollama."""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
import time
from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from depot_mcp.llm.manager import get_llm_manager
from depot_mcp.llm.providers import ProviderType

if TYPE_CHECKING:
    from depot_mcp.server import DepoMCPServer

logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role (user, assistant, system)")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., description="List of chat messages")
    provider: str | None = Field(None, description="Provider type (ollama, lm_studio, openai)")
    stream: bool = Field(False, description="Whether to stream the response")
    model: str | None = Field(None, description="Model name")


class ProviderConfig(BaseModel):
    type: str = Field(..., description="Provider type")
    base_url: str = Field(..., description="Base URL for the provider")
    api_key: str | None = Field(None, description="API key (for OpenAI)")


def _detect_gpu() -> dict[str, Any]:
    """Best-effort GPU detection via nvidia-smi. Never raises."""
    info: dict[str, Any] = {"present": False, "name": None, "detail": "nvidia-smi not found"}
    exe = shutil.which("nvidia-smi")
    if not exe:
        return info
    try:
        out = subprocess.run(
            [exe, "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        name = (out.stdout or "").strip().splitlines()
        if out.returncode == 0 and name:
            info = {"present": True, "name": name[0].strip(), "detail": f"{len(name)} GPU(s) via nvidia-smi"}
        else:
            info["detail"] = "nvidia-smi ran but reported no GPUs"
    except Exception as e:
        info["detail"] = f"nvidia-smi probe failed: {e}"
    return info


async def _probe(url: str, timeout_s: float = 1.5) -> tuple[bool, float]:
    """Quick liveness probe. Returns (reachable, latency_ms). Never raises."""
    import httpx

    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_s)) as client:
            r = await client.get(url)
            if r.status_code == 200:
                return True, round((time.time() - start) * 1000, 1)
    except Exception:
        pass
    return False, round((time.time() - start) * 1000, 1)


def create_llm_router(server: DepoMCPServer | None = None):
    router = APIRouter(prefix="/api/llm", tags=["llm"])

    @router.get("/providers", summary="List all registered providers")
    async def list_providers() -> dict[str, Any]:
        try:
            manager = get_llm_manager()
            providers = await manager.list_providers()
            return {"success": True, "providers": providers}
        except Exception as e:
            logger.exception("Failed to list providers")
            raise HTTPException(500, detail=str(e)) from e

    @router.post("/providers/register", summary="Register a new provider")
    async def register_provider(config: ProviderConfig) -> dict[str, Any]:
        try:
            manager = get_llm_manager()
            provider_type = ProviderType(config.type)
            success = manager.register_provider(provider_type, config.base_url, config.api_key)
            if success:
                return {"success": True, "message": f"Provider {config.type} registered"}
            raise HTTPException(400, detail=f"Failed to register provider {config.type}")
        except ValueError as e:
            raise HTTPException(400, detail=str(e)) from e
        except Exception as e:
            logger.exception("Failed to register provider")
            raise HTTPException(500, detail=str(e)) from e

    @router.get("/models", summary="List available models")
    async def list_models(provider: str | None = None) -> dict[str, Any]:
        try:
            manager = get_llm_manager()
            models = await manager.list_models(provider)
            return {"success": True, "models": models}
        except Exception as e:
            logger.exception("Failed to list models")
            raise HTTPException(500, detail=str(e)) from e

    @router.get("/discover", summary="Probe local LLM runtimes + GPU (no keys, no side effects)")
    async def discover() -> dict[str, Any]:
        ollama_ok, ollama_ms = await _probe("http://127.0.0.1:11434/api/tags")
        lm_ok, lm_ms = await _probe("http://127.0.0.1:1234/v1/models")
        manager = get_llm_manager()
        registered = {pt.value for pt in manager.providers}
        return {
            "providers": [
                {
                    "type": "ollama",
                    "detected": ollama_ok,
                    "latency_ms": ollama_ms,
                    "registered": "ollama" in registered,
                    "default_url": "http://127.0.0.1:11434",
                    "free": True,
                },
                {
                    "type": "lm_studio",
                    "detected": lm_ok,
                    "latency_ms": lm_ms,
                    "registered": "lm_studio" in registered,
                    "default_url": "http://127.0.0.1:1234",
                    "free": True,
                },
            ],
            "gpu": _detect_gpu(),
            "localStorage_keys": {"provider": "llm_provider", "model": "llm_model"},
        }

    @router.get("/onboarding", summary="Fresh-install starter facts + recommended path")
    async def onboarding() -> dict[str, Any]:
        facts: dict[str, Any] = {"configured": True, "checks": {}, "recommended_path": []}
        if server is not None:
            try:
                fast = server.file_store.tier_usage("fast")
                slow = server.file_store.tier_usage("slow")
                facts["checks"]["tiers"] = {
                    "ok": True,
                    "fast_root": str(server.config.fast_root),
                    "slow_root": str(server.config.slow_root),
                    "total_files": fast["file_count"] + slow["file_count"],
                }
            except Exception as e:
                facts["checks"]["tiers"] = {"ok": False, "error": str(e)}
                facts["configured"] = False
            try:
                lance = server.lance_store.stats()
                facts["checks"]["index"] = {"ok": True, **lance}
            except Exception:
                facts["checks"]["index"] = {"ok": False, "note": "index not initialized yet"}
        ollama_ok, _ = await _probe("http://127.0.0.1:11434/api/tags")
        lm_ok, _ = await _probe("http://127.0.0.1:1234/v1/models")
        facts["checks"]["llm"] = {"ollama": ollama_ok, "lm_studio": lm_ok}
        if not (ollama_ok or lm_ok):
            facts["recommended_path"] = [
                "Install Ollama (https://ollama.com) or LM Studio for free local chat",
                "Pull a model: ollama pull llama3.2",
                "Return here - providers are auto-detected on next load",
            ]
        else:
            facts["recommended_path"] = [
                "Pick a provider + model in Chat",
                "Upload a file or import a fleet depot",
                "Ask the AI about your depot",
            ]
        return facts

    class LoadModelRequest(BaseModel):
        model_name: str
        provider: str = "ollama"

    @router.post("/models/load", summary="Load a model on a provider")
    async def load_model(body: LoadModelRequest) -> dict[str, Any]:
        try:
            manager = get_llm_manager()
            result = await manager.load_model(body.model_name, body.provider)
            return result
        except Exception as e:
            logger.exception("Failed to load model")
            raise HTTPException(500, detail=str(e)) from e

    @router.post("/chat", summary="Send a chat message")
    async def chat(request: ChatRequest) -> dict[str, Any]:
        import httpx

        try:
            manager = get_llm_manager()
            msgs = [{"role": m.role, "content": m.content} for m in request.messages]
            result = await manager.chat(msgs, provider=request.provider, stream=False, model=request.model)
        except httpx.HTTPError as e:
            logger.warning("Chat provider transport failed: %s", e)
            raise HTTPException(503, detail=f"LLM provider unreachable: {e}") from e
        except Exception as e:
            logger.exception("Chat failed")
            raise HTTPException(500, detail=str(e)) from e
        if isinstance(result, dict) and "error" in result:
            return {"success": False, "error": result["error"]}
        if isinstance(result, dict) and "content" in result:
            return {"success": True, "message": result}
        return {"success": True, "message": {"role": "assistant", "content": str(result), "provider": "auto"}}

    @router.post("/chat/stream", summary="Chat with server-side chunked SSE (streamId first)")
    async def chat_stream(request: ChatRequest) -> StreamingResponse:
        import httpx

        try:
            manager = get_llm_manager()
            msgs = [{"role": m.role, "content": m.content} for m in request.messages]
            result = await manager.chat(msgs, provider=request.provider, stream=False, model=request.model)
        except httpx.HTTPError as e:
            logger.warning("Chat stream provider transport failed: %s", e)
            raise HTTPException(503, detail=f"LLM provider unreachable: {e}") from e
        except Exception as e:
            logger.exception("Chat stream failed")
            raise HTTPException(500, detail=str(e)) from e
        if isinstance(result, dict) and "error" in result:
            raise HTTPException(503, detail=result["error"])
        if isinstance(result, dict):
            content = str(result.get("content", ""))
            provider = str(result.get("provider", request.provider or "auto"))
            model = str(result.get("model", request.model or ""))
        else:
            content, provider, model = str(result), request.provider or "auto", request.model or ""
        stream_id = f"depot-{int(time.time() * 1000)}"

        def gen():
            yield f"event: meta\ndata: {json.dumps({'streamId': stream_id, 'provider': provider, 'model': model})}\n\n"
            words = content.split(" ")
            step = max(1, len(words) // 40)
            for i in range(0, len(words), step):
                yield f"data: {json.dumps({'delta': ' '.join(words[i : i + step]) + ' '})}\n\n"
            yield "event: done\ndata: {}\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream")

    return router
