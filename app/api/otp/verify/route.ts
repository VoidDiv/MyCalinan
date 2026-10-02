/* FILE: app/api/otp/verify/route.ts   (REPLACE whole file)
   Thin on purpose: all the logic lives in lib/server/routes/VerifyOtpRoute.ts */
import type { NextRequest } from "next/server";
import { Container } from "@/lib/server/container";
import { VerifyOtpRoute } from "@/lib/server/routes/VerifyOtpRoute";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return new VerifyOtpRoute(Container.get()).execute(request);
}