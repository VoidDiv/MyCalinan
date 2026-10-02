/* FILE: app/api/auth/signup/route.ts   (REPLACE whole file)
   Thin on purpose: all the logic lives in lib/server/routes/SignupRoute.ts */
import type { NextRequest } from "next/server";
import { Container } from "@/lib/server/container";
import { SignupRoute } from "@/lib/server/routes/SignupRoute";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return new SignupRoute(Container.get()).execute(request);
}