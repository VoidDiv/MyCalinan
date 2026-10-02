/* ============================================================
   FILE: lib/server/ImageUploadService.ts   (NEW)

   TECHNIQUES IN THIS FILE
   1) INTERFACE + POLYMORPHISM — FileStorage is a contract; FirebaseFileStorage
      is one version of it (another could save to a folder or to S3).
   2) ENCAPSULATION — ImageSignature hides the "magic numbers" knowledge.
      ImageUploadService keeps its rules (folders, size) private.
   3) DEPENDENCY INJECTION — the storage is passed in.

   SECURITY BENEFITS (the big upgrade for uploads)
   - We do NOT trust the file's name or the "type" the browser claims — both can be
     faked (e.g. a script renamed to photo.png). We read the FIRST BYTES of the file
     ("magic numbers") and only accept real JPEG / PNG / WEBP / GIF images.
   - The stored name is random (never the visitor's file name → no path tricks, no
     overwriting), and the content type saved is the one we DETECTED.
   - Folder must be on an allow-list; size is capped; SVG (can hold scripts) is refused.
   ============================================================ */

import crypto from "crypto";
import type { Storage } from "firebase-admin/storage";
import { ValidationError } from "./errors";

/* ───────────── 1) storage contract + Firebase version ───────────── */
export interface FileStorage {
  /** Saves the bytes and returns a URL the website can show. */
  save(path: string, data: Buffer, contentType: string, downloadToken: string): Promise<string>;
}

export class FirebaseFileStorage implements FileStorage {
  constructor(private readonly bucket: ReturnType<Storage["bucket"]>) {}

  async save(path: string, data: Buffer, contentType: string, downloadToken: string): Promise<string> {
    await this.bucket.file(path).save(data, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000", // the name is random & unique, so long caching is safe
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });
    return `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodeURIComponent(
      path
    )}?alt=media&token=${downloadToken}`;
  }
}

/* ───────────── 2) reads the first bytes of a file ───────────── */
export interface DetectedImage {
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  ext: "jpg" | "png" | "webp" | "gif";
}

export class ImageSignature {
  static detect(bytes: Buffer): DetectedImage | null {
    if (bytes.length < 12) return null;
    const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);

    if (starts(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
    if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: "image/png", ext: "png" };
    const head = bytes.subarray(0, 6).toString("latin1");
    if (head === "GIF87a" || head === "GIF89a") return { mime: "image/gif", ext: "gif" };
    if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") {
      return { mime: "image/webp", ext: "webp" };
    }
    return null;
  }
}

/* ───────────── 3) the service ───────────── */
export class ImageUploadService {
  constructor(
    private readonly storage: FileStorage,
    private readonly allowedFolders: readonly string[],
    private readonly maxBytes = 4 * 1024 * 1024 // Vercel limits request bodies to about 4.5 MB
  ) {}

  get maxFileBytes(): number {
    return this.maxBytes;
  }

  /** Validates and saves one image. Returns its URL. */
  async upload(bytes: Buffer, folder: string): Promise<string> {
    if (!this.allowedFolders.includes(folder)) throw new ValidationError("Invalid folder.");
    if (bytes.length === 0) throw new ValidationError("No file received.");
    if (bytes.length > this.maxBytes) throw new ValidationError("Image is too large. Max 4 MB.");

    const image = ImageSignature.detect(bytes);
    if (!image) throw new ValidationError("Only JPG, PNG, WEBP or GIF images are allowed.");

    const path = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${image.ext}`;
    return this.storage.save(path, bytes, image.mime, crypto.randomUUID());
  }
}