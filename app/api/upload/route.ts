/* FILE: app/api/upload/route.ts   (REPLACE whole file)
   Thin on purpose: all the logic lives in lib/server/routes/UploadImageRoute.ts */
import type { NextRequest } from "next/server";
import { Container } from "@/lib/server/container";
import { UploadImageRoute } from "@/lib/server/routes/UploadImageRoute";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return new UploadImageRoute(Container.get()).execute(request);
}