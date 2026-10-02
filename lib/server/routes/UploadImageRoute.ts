/* ============================================================
   FILE: lib/server/routes/UploadImageRoute.ts   (NEW)
   POST /api/upload   (multipart/form-data: file + folder)   — ADMIN ONLY

   TECHNIQUE: INHERITANCE + DEPENDENCY INJECTION
   Extends ApiRoute. The admin check (AuthService) and the file rules
   (ImageUploadService) are handed in, not created here.

   SECURITY: the caller must be a real admin (checked against the database, with
   revoked-token check) BEFORE any file is read. The file itself is judged by its
   real bytes (see ImageUploadService), not by its name or claimed type.
   ============================================================ */

import type { NextRequest } from "next/server";
import { ApiRoute, type ApiResult } from "../ApiRoute";
import { ValidationError } from "../errors";
import type { Services } from "../container";

export class UploadImageRoute extends ApiRoute {
  constructor(private readonly services: Services) {
    super({});
  }

  protected async run(req: NextRequest): Promise<ApiResult> {
    await this.services.auth.requireAdmin(req); // 1) who is calling?

    this.assertDeclaredSize(req, this.services.uploads.maxFileBytes + 512 * 1024); // 2) cheap size check first
    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "");
    if (!(file instanceof File)) throw new ValidationError("No file received.");

    const bytes = Buffer.from(await file.arrayBuffer());
    const url = await this.services.uploads.upload(bytes, folder); // 3) judge the real bytes
    return { body: { url } };
  }
}