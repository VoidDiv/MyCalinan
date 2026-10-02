/* FILE: app/api/otp/send/route.ts   (REPLACE whole file)
   Thin on purpose: all the logic lives in lib/server/routes/SendOtpRoute.ts */
import type { NextRequest } from "next/server";
import { Container } from "@/lib/server/container";
import { SendOtpRoute } from "@/lib/server/routes/SendOtpRoute";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return new SendOtpRoute(Container.get()).execute(request);
}