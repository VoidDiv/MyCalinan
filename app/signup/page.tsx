/* ============================================================
   FILE: app/signup/page.tsx   (REPLACE whole file)
   Sign-up now requires a verified email:
   1. type your email -> "Send verification code"
   2. enter the 6-digit code from the email -> "Verify code"
   3. "Sign Up" is only accepted with the verification token

   The account itself is created by /api/auth/signup (server), so the
   browser is no longer left silently signed in after registering.
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
      newErrors.phoneNumber = "Invalid phone number. Format: 09XXXXXXXXX or +639XXXXXXXXX";
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
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = "Password must contain at least one lowercase letter";
    } else if (!/\d/.test(password)) {
      newErrors.password = "Password must contain at least one number";
    } else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      newErrors.password = "Password must contain at least one special character";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f4] p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-[#1b4332] mb-2">Create Account</h2>
        <p className="text-sm text-gray-600 text-center mb-6">Sign up for your MyCalinan account</p>

        {formError && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="09XXXXXXXXX"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            />
            {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Sex</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            >
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {errors.sex && <p className="text-xs text-red-500 mt-1">{errors.sex}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              autoComplete="email"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}

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

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="new-password"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-xs text-gray-500"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              autoComplete="new-password"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            />
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1b4332] text-white py-2 rounded-md font-medium text-sm hover:bg-[#143326] transition mt-2 disabled:opacity-50"
          >
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#1b4332] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}