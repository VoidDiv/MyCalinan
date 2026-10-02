/* ============================================================
   FILE: lib/server/RateLimiter.ts   (NEW)

   TECHNIQUE: ENCAPSULATION + REUSABLE CLASS (one class, many instances)
   - Encapsulation: the list of hits is `private`; outside code can only ask
     consume() / assert(). Nobody can accidentally reset someone's counter.
   - Reusable: `new RateLimiter(10, 15 * 60_000)` for one route and
     `new RateLimiter(30, 15 * 60_000)` for another — same code, different limits.

   SECURITY BENEFIT
   Stops brute force (guessing 6-digit codes) and spam (flooding the email sender)
   by limiting how many requests one visitor (IP address) can make in a time window.

   NOTE: counters live in the memory of ONE server instance. That is fine for a
   capstone and stops most abuse. For a hard limit across all instances use
   Redis / Upstash with the same consume() idea.
   ============================================================ */

import { TooManyRequestsError } from "./errors";

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    /** Safety valve so the Map can never grow forever. */
    private readonly maxKeys = 10_000
  ) {}

  /**
   * Records one request for `key`.
   * Returns 0 when allowed, or the number of seconds to wait when the limit is reached.
   */
  consume(key: string, now: number = Date.now()): number {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);

    if (recent.length >= this.maxRequests) {
      this.hits.set(key, recent);
      return Math.max(1, Math.ceil((recent[0] + this.windowMs - now) / 1000));
    }

    recent.push(now);
    this.hits.set(key, recent);
    this.cleanup(now);
    return 0;
  }

  /** Same as consume(), but throws the 429 error for you. */
  assert(key: string, now: number = Date.now()): void {
    const wait = this.consume(key, now);
    if (wait > 0) {
      throw new TooManyRequestsError("Too many requests. Please wait a moment and try again.", wait);
    }
  }

  private cleanup(now: number): void {
    if (this.hits.size <= this.maxKeys) return;
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
    // Still too many? Drop the oldest entries (a Map remembers insertion order).
    while (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest === undefined) break;
      this.hits.delete(oldest);
    }
  }
}