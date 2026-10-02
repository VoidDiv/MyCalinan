/* ============================================================
   FILE: components/EmailOtpVerifier.tsx   (REPLACE whole file)
   Same behaviour as before — sends the code, takes the 6 digits and hands the
   parent a verification token via onVerified() — with the bold sign-up look
   (classes "otp-*" in globals-signup-bold.css).

   If the email text changes after sending/verifying, it resets itself and
   calls onReset() so the parent drops the old token.
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
    <div className="otp">
      {status === "verified" && (
        <p role="status" className="otp-verified">
          <span className="otp-verified-icon" aria-hidden="true">
            ✓
          </span>
          Email verified — you can finish signing up.
        </p>
      )}

      {status === "idle" && (
        <>
          <button type="button" onClick={sendCode} disabled={!canSend} className="otp-btn">
            {sending ? "Sending code…" : "Send verification code"}
          </button>
          <p className="otp-hint">We&rsquo;ll email you a 6-digit code to confirm it&rsquo;s really you.</p>
        </>
      )}

      {status === "sent" && (
        <>
          <div className="otp-row">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              aria-label="6-digit verification code"
              placeholder="••••••"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                // Enter here should verify the code, not submit the whole form
                if (e.key === "Enter") {
                  e.preventDefault();
                  verifyCode();
                }
              }}
              className="otp-code"
            />
            <button
              type="button"
              onClick={verifyCode}
              disabled={code.length !== 6 || verifying || disabled}
              className="otp-verify"
            >
              {verifying ? "Checking…" : "Verify"}
            </button>
          </div>

          <button
            type="button"
            onClick={sendCode}
            disabled={cooldown > 0 || sending || disabled}
            className="otp-resend"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : sending ? "Sending code…" : "Resend code"}
          </button>
        </>
      )}

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`otp-msg ${message.ok ? "is-ok" : "is-err"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}