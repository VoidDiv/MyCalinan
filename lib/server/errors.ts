/* ============================================================
   FILE: lib/server/errors.ts

   TECHNIQUE: INHERITANCE + POLYMORPHISM
   - Inheritance: one parent class (AppError) and small child classes
     (ValidationError, ForbiddenError ...). Every child "is an" AppError.
   - Polymorphism: each child answers the same question ("what is my HTTP
     status?") in its own way, so ONE catch block can handle all of them.

   SECURITY BENEFIT (safe error messages)
   Only errors from THIS family carry messages that are safe to show a visitor.
   Any other error (a bug, a database failure) is logged privately and the visitor
   only gets a generic message. Stack traces and internal details never leak.
   ============================================================ */

export interface AppErrorOptions {
  /** Which form field the message belongs to (the sign-up page shows it under that field). */
  field?: string;
  /** Seconds the visitor must wait (sent as the Retry-After header). */
  retryAfter?: number;
}

export class AppError extends Error {
  readonly status: number;
  readonly field?: string;
  readonly retryAfter?: number;

  constructor(message: string, status = 500, options: AppErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.field = options.field;
    this.retryAfter = options.retryAfter;
  }

  /** The JSON the browser receives. */
  toBody(): Record<string, unknown> {
    return {
      error: this.message,
      ...(this.field ? { field: this.field } : {}),
      ...(this.retryAfter ? { retryAfter: this.retryAfter } : {}),
    };
  }

  /** Extra response headers (e.g. Retry-After). */
  get headers(): Record<string, string> {
    return this.retryAfter ? { "Retry-After": String(this.retryAfter) } : {};
  }
}

/** 400 — the data sent is wrong. */
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, { field });
  }
}

/** 401 — not signed in / the session is not valid. */
export class UnauthorizedError extends AppError {
  constructor(message = "Not authenticated.") {
    super(message, 401);
  }
}

/** 403 — signed in (or verified) but not allowed. */
export class ForbiddenError extends AppError {
  constructor(message = "Not allowed.", field?: string) {
    super(message, 403, { field });
  }
}

/** 404 — the thing does not exist. */
export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, 404);
  }
}

/** 409 — clashes with something that already exists (e.g. email already registered). */
export class ConflictError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 409, { field });
  }
}

/** 413 — the request is bigger than we accept. */
export class PayloadTooLargeError extends AppError {
  constructor(message = "The request is too large.") {
    super(message, 413);
  }
}

/** 429 — too many requests; `retryAfter` says how many seconds to wait. */
export class TooManyRequestsError extends AppError {
  constructor(message: string, retryAfter?: number) {
    super(message, 429, { retryAfter });
  }
}

/** 502 — something we depend on (e.g. the email service) failed. */
export class UpstreamError extends AppError {
  constructor(message: string) {
    super(message, 502);
  }
}