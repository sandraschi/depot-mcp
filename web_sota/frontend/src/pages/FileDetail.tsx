import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatDate, mimeIcon } from "@/lib/utils";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function FileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<any>(null);
  const [tags, setTags] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/depot/files/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((found) => {
        setFile(found);
        setTags((found.tags || []).join(", "));
      })
      .catch(() => setFile(null));
  }, [id]);

  async function download() {
    window.open(`/api/v1/depot/download/${id}`);
  }

  async function updateTags() {
    await fetch(`/api/v1/depot/files/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
  }

  async function deleteFile() {
    await fetch(`/api/v1/depot/files/${id}`, { method: "DELETE" });
    navigate("/");
  }

  if (!file) {
    return <div className="text-gray-500 animate-pulse">Loading file...</div>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-gray-500 hover:text-gray-300 flex items-center gap-1 mb-4 text-sm"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-4 mb-6">
        <span className="text-4xl">{mimeIcon(file.mime_type)}</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{file.filename}</h1>
          <p className="text-gray-500 text-sm">
            {file.mime_type} · {formatBytes(file.size_bytes)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>File Metadata</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">ID</dt>
              <dd className="text-gray-300 font-mono text-xs">{file.file_id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tier</dt>
              <dd className={`${file.tier === "fast" ? "text-green-400" : "text-amber-400"}`}>{file.tier}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Size</dt>
              <dd className="text-gray-300 font-mono">{formatBytes(file.size_bytes)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">MIME</dt>
              <dd className="text-gray-300">{file.mime_type}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Button onClick={download} className="w-full flex items-center justify-center gap-2">
              <Download size={16} /> Download
            </Button>

            <div>
              <label className="text-gray-400 text-xs block mb-1">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm placeholder-gray-500"
                  placeholder="tag1, tag2"
                />
                <Button variant="outline" size="sm" onClick={updateTags}>
                  Save
                </Button>
              </div>
            </div>

            {!deleteConfirm ? (
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirm(true)}
                className="w-full text-red-400 hover:text-red-300"
              >
                <Trash2 size={16} className="mr-2" /> Delete File
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={deleteFile} className="flex-1 bg-red-600 hover:bg-red-500">
                  Confirm Delete
                </Button>
                <Button variant="ghost" onClick={() => setDeleteConfirm(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
