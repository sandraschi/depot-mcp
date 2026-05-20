import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { File, Upload as UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tier, setTier] = useState("auto");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function uploadFile(file: File) {
    setUploading(true);
    setStatus(`Uploading ${file.name}...`);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tier", tier);
      form.append("tags", tags);
      const res = await fetch("/api/v1/depot/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        setStatus(`Uploaded: ${file.name} (${data.tier})`);
        navigate(`/file/${data.file_id}`);
      } else {
        setStatus(`Upload failed: ${data.error || "unknown error"}`);
      }
    } catch (e: any) {
      setStatus(`Upload error: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Upload Files</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Storage Options</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm"
              >
                <option value="auto">Auto (policy-based)</option>
                <option value="fast">Fast (NVMe)</option>
                <option value="slow">Slow (HDD)</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="project-x, final, review"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 text-sm"
              />
            </div>
          </div>
        </Card>

        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragOver ? "border-depot-500 bg-depot-500/10" : "border-gray-700 bg-gray-900/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) uploadFile(file);
          }}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter") fileRef.current?.click();
          }}
          role="button"
          tabIndex={0}
        >
          <UploadIcon size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg mb-2">Drop files here</p>
          <p className="text-gray-600 text-sm mb-4">or click to browse</p>
          <Button variant="outline" disabled={uploading}>
            Select File
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
        </div>

        {status && (
          <Card className="text-gray-300 text-sm">
            <div className="flex items-center gap-2">
              <File size={16} className="text-depot-400" />
              {status}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
