"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  currentImage: string; // existing saved image (URL or old "image/x.jpg" path)
  file: File | null;
  onFileChange: (file: File | null) => void;
  onClearCurrent: () => void;
  onError: (message: string) => void;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 4 * 1024 * 1024;

export default function ImagePicker({
  currentImage,
  file,
  onFileChange,
  onClearCurrent,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const saved =
    currentImage && !currentImage.startsWith("http") && !currentImage.startsWith("/")
      ? `/${currentImage}`
      : currentImage;
  const shown = preview || saved;

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      onError("Only JPG, PNG, WEBP or GIF images are allowed.");
    } else if (f.size > MAX_BYTES) {
      onError("Image is too large. Max 4 MB.");
    } else {
      onFileChange(f);
    }
    e.target.value = ""; // allow re-picking the same file
  }

  function remove() {
    onFileChange(null);
    onClearCurrent();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={pick}
        style={{ display: "none" }}
      />

      {shown ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shown}
            alt="Preview"
            style={{
              width: 96,
              height: 72,
              objectFit: "cover",
              borderRadius: 8,
              border: "1.5px solid #dce8e0",
              background: "#e8f0ec",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#d4edda", color: "#155724", fontWeight: 600, fontSize: ".78rem", cursor: "pointer" }}
            >
              Change image
            </button>
            <button
              type="button"
              onClick={remove}
              style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#f8d7da", color: "#721c24", fontWeight: 600, fontSize: ".78rem", cursor: "pointer" }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{ width: "100%", padding: "18px 12px", borderRadius: 8, border: "1.5px dashed #9cc5ad", background: "#f4faf6", color: "#1a5c38", fontWeight: 600, fontSize: ".85rem", cursor: "pointer" }}
        >
          Click to choose an image (JPG, PNG, WEBP, max 4 MB)
        </button>
      )}
    </div>
  );
}