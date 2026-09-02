"use client";
import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type UserRole = "admin" | "business" | "user";

interface LoginSuccessPayload {
  token: string;
  username: string;
  role: UserRole;
}

interface LoginErrorPayload {
  error?: string;
}

const API_BASE_URL: string = "http://localhost:5000";

type AuthMode = "signin" | "guest";

/**
 * Where each role lands after a successful sign in.
 * Extend this map if new roles are introduced later.
 */
const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/adminpage/AdminDashboard",
  business: "/business/dashboard",
  user: "/",
};

const LoginPage: React.FC = () => {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");

  /* ---------------- Unified sign-in state (admin, business, or user) --- */
  const [identifier, setIdentifier] = useState<string>(""); // username OR email
  const [password, setPassword] = useState<string>("");
  const [remember, setRemember] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  /* ---------------- Guest sign-in state --------------- */
  const [guestLoading, setGuestLoading] = useState<boolean>(false);

  const storeSession = (
    shouldRemember: boolean,
    payload: LoginSuccessPayload
  ): void => {
    const storage: Storage = shouldRemember ? localStorage : sessionStorage;

    storage.setItem("mycalinan_token", payload.token);
    storage.setItem("mycalinan_username", payload.username);
    storage.setItem("mycalinan_role", payload.role);

    /*
      Clear the opposite storage so an old session
      does not remain active.
    */
    const otherStorage: Storage = shouldRemember ? sessionStorage : localStorage;

    otherStorage.removeItem("mycalinan_token");
    otherStorage.removeItem("mycalinan_username");
    otherStorage.removeItem("mycalinan_role");
  };

  /**
   * Single sign-in handler for every account type.
   * The backend looks up the identifier, verifies the password, and
   * reports back which role that account has — the frontend never has
   * to guess or ask the user to pick a tab.
   */
  const handleSignIn = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    setError("");

    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      setError("Please enter both your username/email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: trimmedIdentifier,
          password,
        }),
      });

      const data: LoginSuccessPayload & LoginErrorPayload =
        await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed. Please check your credentials.");
        return;
      }

      storeSession(remember, data);

      /*
        Route based on whatever role the backend says this account is —
        admin, business owner, or a regular user. No manual tab needed.
      */
      const destination = ROLE_REDIRECTS[data.role] ?? "/";
      router.push(destination);
    } catch (err) {
      console.error("Sign in error:", err);

      setError("Cannot connect to the server. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = (): void => {
    setGuestLoading(true);

    // Store guest session
    sessionStorage.setItem("mycalinan_guest", "true");
    sessionStorage.setItem("mycalinan_guest_name", "Guest");

    // Small delay for a natural loading experience
    setTimeout(() => {
      router.push("/");
    }, 500);
  };

  const handleBackToHome = (): void => {
    router.push("/");
  };

  return (
    <div className="login-page">
      <div className="login-page-card">
        {/* LOGO SECTION */}
        <div className="login-page-logo-section">
          <img src="/image/CALINAN LOGO.png" alt="MyCalinan Logo" />
          <h1>MyCalinan</h1>
          <p>
            {mode === "signin"
              ? "Sign in to your MyCalinan account."
              : "Discover Calinan. Explore. Stay Informed."}
          </p>
        </div>

        {/* MODE TABS */}
        <div className="login-page-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={mode === "signin" ? "active" : ""}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "guest"}
            className={mode === "guest" ? "active" : ""}
            onClick={() => setMode("guest")}
          >
            Continue as Guest
          </button>
        </div>

        {/* ---------------- UNIFIED SIGN IN FORM ---------------- */}
        {mode === "signin" && (
          <form
            className="login-page-form"
            id="signin-form"
            onSubmit={handleSignIn}
          >
            <h2>Sign In</h2>

            {error && (
              <div id="login-error" className="login-page-error" role="alert">
                {error}
              </div>
            )}

            <div className="login-page-input-group">
              <label htmlFor="identifier">Username or Email</label>

              <input
                type="text"
                id="identifier"
                placeholder="Enter username or email"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="login-page-input-group">
              <label htmlFor="password">Password</label>

              <div className="login-page-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="login-page-show-password"
                  onClick={() => setShowPassword((previous) => !previous)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="login-page-remember">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />

              <label htmlFor="remember">Remember Me</label>
            </div>

            <button
              type="submit"
              className="login-page-btn"
              id="login-submit-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="login-page-footer-text">
              Works for administrator, business, and personal accounts.
            </div>
          </form>
        )}

        {/* ---------------- GUEST SIGN-IN ---------------- */}
        {mode === "guest" && (
          <div className="login-page-guest-content">
            <div className="login-page-guest-icon">
              <span>👤</span>
            </div>

            <h2>Sign in as Guest</h2>

            <p className="login-page-guest-description">
              Continue to MyCalinan without creating an account. You can
              explore community information, tourism spots, public services,
              events, announcements, and other available features as a
              guest.
            </p>

            <div className="login-page-guest-info">
              <div className="login-page-info-item">
                <span className="login-page-info-icon">✓</span>
                <span>Access community information</span>
              </div>

              <div className="login-page-info-item">
                <span className="login-page-info-icon">✓</span>
                <span>Explore tourism and establishments</span>
              </div>

              <div className="login-page-info-item">
                <span className="login-page-info-icon">✓</span>
                <span>View announcements and events</span>
              </div>

              <div className="login-page-info-item">
                <span className="login-page-info-icon">✓</span>
                <span>Use available public service guides</span>
              </div>
            </div>

            <button
              type="button"
              className="login-page-guest-btn"
              onClick={handleGuestSignIn}
              disabled={guestLoading}
            >
              {guestLoading ? (
                <>
                  <span className="login-page-guest-spinner"></span>
                  Entering...
                </>
              ) : (
                <>Continue as Guest</>
              )}
            </button>

            <div className="login-page-guest-notice">
              <strong>Guest Access</strong>
              <p>
                Guest access does not require an account. Some features may
                be available only to signed-in accounts.
              </p>
            </div>
          </div>
        )}

        {/* HOME LINK — shared by both modes */}
        <div className="login-page-home-link">
          <button
            type="button"
            className="login-page-home-btn"
            onClick={handleBackToHome}
          >
            ← Back to MyCalinan
          </button>
        </div>
      </div>

      <div className="login-page-footer">
        MyCalinan • Barangay Calinan, Davao City
      </div>
    </div>
  );
};

export default LoginPage;