import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

const MIME_ICONS: Record<string, string> = {
  "application/x-blender": "\u{1F9CA}",
  "model/gltf+json": "\u{1F4E6}",
  "model/obj": "\u{1F4E6}",
  "model/stl": "\u{1F4E6}",
  "image/vnd.dxf": "\u{1F4D0}",
  "image/x-gimp": "\u{1F3A8}",
  "image/svg+xml": "\u{1F3A8}",
  "image/png": "\u{1F5BC}",
  "image/jpeg": "\u{1F5BC}",
  "video/mp4": "\u{1F3AC}",
  "application/x-splat": "\u{1F4A0}",
  "text/markdown": "\u{1F4DD}",
  "application/pdf": "\u{1F4C4}",
  "text/x-autohotkey": "\u{2328}",
};

export function mimeIcon(mime: string): string {
  for (const [key, icon] of Object.entries(MIME_ICONS)) {
    if (mime.startsWith(key)) return icon;
  }
  return "\u{1F4C4}";
}
