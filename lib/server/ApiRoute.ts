/* ============================================================
   FILE: lib/server/ApiRoute.ts

   TECHNIQUE: ABSTRACT CLASS + TEMPLATE METHOD PATTERN
   - Abstract class: ApiRoute cannot be used on its own; it is a blueprint.
   - Template Method: execute() is the fixed recipe that EVERY route follows:
        1) same-origin check  2) rate limit  3) run the route  4) safe error handling
     Each real route (SendOtpRoute, SignupRoute ...) only writes step 3: run().
     So nobody can forget the security steps on a new route.

   SECURITY BENEFITS built into every route that extends this class
   - Same-origin check (blocks other websites from posting to our forms = CSRF).
   - Rate limiting per IP address.
   - JSON body size limit + "must be a JSON object" check.
   - Errors: known AppErrors show their safe message; unknown errors are logged
     with a request id and the visitor gets a generic message (no leaking).
   - Every answer is sent with  Cache-Control: no-store  (sensitive data is never cached)
     and  X-Content-Type-Options: nosniff.
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AppError, ForbiddenError, PayloadTooLargeError, ValidationError } from "./errors";
import type { RateLimiter } from "./RateLimiter";

export interface RequestContext {
  ip: string;
  requestId: string;
}

/** What a route's run() returns: the JSON body and (optionally) a status code. */
export interface ApiResult {
  body: unknown;
  status?: number;
}

export interface RouteOptions {
  /** Only accept requests that come from our own website (for public forms). */
  sameOrigin?: boolean;
  /** Limit requests per IP address. */
  limiter?: RateLimiter;
  /** Largest JSON body accepted, in bytes. */
  maxBodyBytes?: number;
}

/* ───────────── small helpers (also classes, only static methods) ───────────── */

/** Works out the visitor's IP address from the headers the hosting platform adds. */
export class ClientIp {
  static from(req: NextRequest): string {
    return (
      req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  }
}

/** CSRF protection: the browser tells us which website sent the request (Origin header). */
export class OriginGuard {
  static assertSameOrigin(req: NextRequest): void {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!origin || !host) throw new ForbiddenError("Not allowed.");
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new ForbiddenError("Not allowed.");
    }
    if (originHost !== host) throw new ForbiddenError("Not allowed.");
  }
}

/* ───────────── the abstract blueprint ───────────── */

export abstract class ApiRoute {
  protected constructor(private readonly options: RouteOptions = {}) {}

  /** The ONLY thing a child route has to write. */
  protected abstract run(req: NextRequest, ctx: RequestContext): Promise<ApiResult>;

  /** The fixed recipe (Template Method). Call this from route.ts. */
  async execute(req: NextRequest): Promise<NextResponse> {
    const ctx: RequestContext = { ip: ClientIp.from(req), requestId: randomUUID() };
    try {
      if (this.options.sameOrigin) OriginGuard.assertSameOrigin(req);
      this.options.limiter?.assert(ctx.ip);

      const result = await this.run(req, ctx);
      return ApiRoute.respond(result.body, result.status ?? 200);
    } catch (err) {
      return this.fail(err, ctx);
    }
  }

  /* ---------- helpers children can use ---------- */

  /** Reads the body as JSON with a size limit; it must be a plain object ({...}). */
  protected async readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
    const max = this.options.maxBodyBytes ?? 16 * 1024;
    if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      throw new ValidationError("Invalid request.");
    }
    this.assertDeclaredSize(req, max);

    const text = await req.text();
    if (Buffer.byteLength(text) > max) throw new PayloadTooLargeError();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ValidationError("Invalid request.");
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new ValidationError("Invalid request.");
    }
    return parsed as Record<string, unknown>;
  }

  /** Quick check using the Content-Length header (before reading a big upload). */
  protected assertDeclaredSize(req: NextRequest, maxBytes: number): void {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadTooLargeError();
  }

  /* ---------- private ---------- */

  private fail(err: unknown, ctx: RequestContext): NextResponse {
    if (err instanceof AppError) {
      return ApiRoute.respond(err.toBody(), err.status, err.headers);
    }
    // Unknown error = a bug or an outage. Log it privately, tell the visitor nothing sensitive.
    console.error(`[${ctx.requestId}] Unexpected error:`, err);
    return ApiRoute.respond(
      { error: "Something went wrong. Please try again.", requestId: ctx.requestId },
      500
    );
  }

  private static respond(body: unknown, status: number, extra: Record<string, string> = {}): NextResponse {
    return NextResponse.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...extra,
      },
    });
  }
}