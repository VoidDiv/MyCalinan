/* ============================================================
   FILE: app/signup/page.tsx   (REPLACE whole file)
   Same sign-up flow as before (verified email -> /api/auth/signup),
   with a bold, highlighted design:
   - logo badge + gold top bar on a green background
   - 3 numbered sections (About you · Verify your email · Password)
   - the email check is a highlighted gold panel that turns green
   - live password checklist
   - big gold "Create my account" button
   Styles: globals-signup-bold.css  (classes "su-*" and "otp-*")
   ============================================================ */

"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EmailOtpVerifier from "@/components/EmailOtpVerifier";

interface FormErrors {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  sex?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const ERROR_FIELDS: (keyof FormErrors)[] = [
  "fullName",
  "phoneNumber",
  "address",
  "sex",
  "email",
  "password",
  "confirmPassword",
];

/* Same rules the server checks in /api/auth/signup */
const PASSWORD_RULES: { id: string; label: string; test: (p: string) => boolean }[] = [
  { id: "len", label: "8 or more characters", test: (p) => p.length >= 8 },
  { id: "up", label: "One uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "low", label: "One lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "num", label: "One number (0–9)", test: (p) => /\d/.test(p) },
  {
    id: "sym",
    label: "One symbol (! @ # $ % …)",
    test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
  },
];

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="su-field">
      <label className="su-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error && (
        <p className="su-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    sex: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP: token proving this exact email was verified.
  // verifierKey remounts the verifier when the server rejects the token.
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [verifierKey, setVerifierKey] = useState(0);

  const inputClass = (field: keyof FormErrors) => `su-input${errors[field] ? " has-error" : ""}`;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const { fullName, phoneNumber, address, sex, email, password, confirmPassword } = formData;

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    const phoneRegex = /^(09|\+639)\d{9}$/;
    const cleanPhone = phoneNumber.replace(/\s+/g, "");
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!phoneRegex.test(cleanPhone)) {
      newErrors.phoneNumber = "Use 09XXXXXXXXX or +639XXXXXXXXX";
    }

    if (!address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!sex) {
      newErrors.sex = "Please select your sex";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    } else if (!otpToken) {
      newErrors.email = "Verify your email with the code we send you before signing up";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else {
      const missing = PASSWORD_RULES.find((r) => !r.test(password));
      if (missing) newErrors.password = `Password needs: ${missing.label.toLowerCase()}`;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validateForm() || !otpToken) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.address.trim(),
          sex: formData.sex,
          email: formData.email.trim(),
          password: formData.password,
          verificationToken: otpToken,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The server no longer trusts the verification -> ask again
        if (res.status === 403) {
          setOtpToken(null);
          setVerifierKey((k) => k + 1);
        }

        const field = data.field as keyof FormErrors | undefined;
        if (field && ERROR_FIELDS.includes(field)) {
          setErrors((prev) => ({ ...prev, [field]: data.error }));
        } else {
          setFormError(data.error ?? "Registration failed. Please try again.");
        }
        return;
      }

      router.push("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setFormError("Cannot reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const password = formData.password;

  return (
    <div className="su-page">
      <div className="su-card">
        <div className="su-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="su-logo" src="/image/CALINAN LOGO.png" alt="MyCalinan" />
        </div>

        <h1 className="su-title">Create Account</h1>
        <p className="su-subtitle">Join MyCalinan — it only takes a minute.</p>

        {formError && (
          <div role="alert" className="su-alert">
            <strong>⚠</strong> {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="su-form" noValidate>
          {/* ── 1 · About you ── */}
          <div className="su-section">
            <span className="su-step">1</span> About you
          </div>

          <Field id="fullName" label="Full name" error={errors.fullName}>
            <input
              id="fullName"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Juan Dela Cruz"
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              className={inputClass("fullName")}
            />
          </Field>

          <div className="su-row">
            <Field id="phoneNumber" label="Phone number" error={errors.phoneNumber}>
              <input
                id="phoneNumber"
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="09XXXXXXXXX"
                autoComplete="tel"
                aria-invalid={!!errors.phoneNumber}
                className={inputClass("phoneNumber")}
              />
            </Field>

            <Field id="sex" label="Sex" error={errors.sex}>
              <select
                id="sex"
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                aria-invalid={!!errors.sex}
                className={inputClass("sex")}
              >
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>
          </div>

          <Field id="address" label="Address" error={errors.address}>
            <input
              id="address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Purok, Barangay, Calinan"
              autoComplete="street-address"
              aria-invalid={!!errors.address}
              className={inputClass("address")}
            />
          </Field>

          {/* ── 2 · Verify your email ── */}
          <div className="su-section">
            <span className={`su-step${otpToken ? " is-done" : ""}`}>{otpToken ? "✓" : "2"}</span>{" "}
            Verify your email
          </div>

          <div className={`su-panel${otpToken ? " is-verified" : ""}`}>
            <Field id="email" label="Email address" error={errors.email}>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@email.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                className={inputClass("email")}
              />
            </Field>

            <EmailOtpVerifier
              key={verifierKey}
              email={formData.email}
              disabled={loading}
              onVerified={(token) => {
                setOtpToken(token);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              onReset={() => setOtpToken(null)}
            />
          </div>

          {/* ── 3 · Password ── */}
          <div className="su-section">
            <span className="su-step">3</span> Secure your account
          </div>

          <Field id="password" label="Password" error={errors.password}>
            <div className="su-password">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                className={inputClass("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="su-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          <ul className="su-rules" aria-label="Password requirements">
            {PASSWORD_RULES.map((rule) => (
              <li key={rule.id} className={password && rule.test(password) ? "is-ok" : ""}>
                {rule.label}
              </li>
            ))}
          </ul>

          <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Type the password again"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              className={inputClass("confirmPassword")}
            />
          </Field>

          <button type="submit" disabled={loading} className="su-btn">
            {loading ? "Creating your account…" : "Create my account"}
          </button>
        </form>

        <div className="su-footer">
          Already have an account?{" "}
          <Link href="/login" className="su-link">
            Sign In
          </Link>
        </div>
        <div className="su-footer su-footer--small">
          <Link href="/" className="su-link">
            ← Back to MyCalinan
          </Link>
        </div>
      </div>
    </div>
  );
}