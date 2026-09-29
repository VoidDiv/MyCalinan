/* ============================================================
   FILE: components/EmailOtpVerifier.tsx   (NEW)
   Drop-in "verify this email" block. Put it right under an email
   input. It sends the code, takes the 6 digits, and hands the
   parent a verification token via onVerified().

   If the email text changes after sending/verifying, it resets
   itself and calls onReset() so the parent drops the old token.

   Usage:
     <EmailOtpVerifier
       email={formData.email}
       onVerified={(token) => setOtpToken(token)}
       onReset={() => setOtpToken(null)}
     />
   ============================================================ */

"use client";

import { useEffect, useRef, useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "sent" | "verified";

export interface EmailOtpVerifierProps {
  email: string;
  /** "signup" refuses emails that already have an account. */
  purpose?: "signup" | "verify";
  disabled?: boolean;
  onVerified: (verificationToken: string) => void;
  onReset: () => void;
}

export default function EmailOtpVerifier({
  email,
  purpose = "signup",
  disabled = false,
  onVerified,
  onReset,
}: EmailOtpVerifierProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const sentTo = useRef("");
  const trimmed = email.trim().toLowerCase();

  /* The address was edited after a code was sent -> start over. */
  useEffect(() => {
    if (status !== "idle" && trimmed !== sentTo.current) {
      setStatus("idle");
      setCode("");
      setCooldown(0);
      setMessage(null);
      onReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  /* Resend countdown */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    setMessage(null);
    setSending(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, purpose }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Only show a live countdown for short waits (not the hourly cap)
        if (res.status === 429 && data.retryAfter && data.retryAfter <= 120) {
          setCooldown(Number(data.retryAfter));
        }
        setMessage({ ok: false, text: data.error ?? "Could not send the code. Try again." });
        return;
      }

      sentTo.current = trimmed;
      setStatus("sent");
      setCode("");
      setCooldown(Number(data.cooldownSeconds ?? 60));
      setMessage({
        ok: true,
        text: `We sent a 6-digit code to ${trimmed}. It expires in ${
          data.expiresInMinutes ?? 10
        } minutes.`,
      });
    } catch {
      setMessage({
        ok: false,
        text: "Cannot reach the server. Check your connection and try again.",
      });
    } finally {
      setSending(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6 || verifying) return;
    setMessage(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sentTo.current, code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Could not verify the code. Try again." });
        return;
      }

      setStatus("verified");
      setMessage(null);
      onVerified(data.verificationToken as string);
    } catch {
      setMessage({
        ok: false,
        text: "Cannot reach the server. Check your connection and try again.",
      });
    } finally {
      setVerifying(false);
    }
  }

  const canSend = EMAIL_REGEX.test(trimmed) && !sending && !disabled && cooldown === 0;

  return (
    <div className="mt-2">
      {status === "verified" && (
        <p
          role="status"
          className="rounded-md bg-green-50 px-3 py-2 text-xs font-semibold text-green-800"
        >
          Email verified. You can finish signing up.
        </p>
      )}

      {status === "idle" && (
        <button
          type="button"
          onClick={sendCode}
          disabled={!canSend}
          className="w-full rounded-md border border-[#1b4332] px-3 py-2 text-xs font-semibold text-[#1b4332] transition hover:bg-[#1b4332] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#1b4332]"
        >
          {sending ? "Sending code..." : "Send verification code"}
        </button>
      )}

      {status === "sent" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              aria-label="6-digit verification code"
              placeholder="6-digit code"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                // Enter here should verify the code, not submit the whole form
                if (e.key === "Enter") {
                  e.preventDefault();
                  verifyCode();
                }
              }}
              className="w-full rounded-md border px-3 py-2 text-center text-sm tracking-[0.35em] focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            />
            <button
              type="button"
              onClick={verifyCode}
              disabled={code.length !== 6 || verifying || disabled}
              className="shrink-0 rounded-md bg-[#1b4332] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#143326] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifying ? "Checking..." : "Verify code"}
            </button>
          </div>

          <button
            type="button"
            onClick={sendCode}
            disabled={cooldown > 0 || sending || disabled}
            className="text-xs font-semibold text-[#1b4332] underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : sending
              ? "Sending code..."
              : "Resend code"}
          </button>
        </div>
      )}

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`mt-2 text-xs ${message.ok ? "text-gray-600" : "text-red-500"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}