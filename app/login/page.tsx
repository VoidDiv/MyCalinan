"use client";
import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface LoginSuccessPayload {
  token: string;
  username: string;
  role: string;
}

interface LoginErrorPayload {
  error?: string;
}

const API_BASE_URL: string = "http://localhost:5000";

type AuthMode = "admin" | "guest";

const LoginPage: React.FC = () => {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("admin");

  /* ---------------- Admin login state ---------------- */
  const [username, setUsername] = useState<string>("");
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

    storage.setItem("mycalinan_admin_token", payload.token);
    storage.setItem("mycalinan_admin_username", payload.username);
    storage.setItem("mycalinan_admin_role", payload.role);

    /*
      Clear the opposite storage so an old session
      does not remain active.
    */
    const otherStorage: Storage = shouldRemember ? sessionStorage : localStorage;

    otherStorage.removeItem("mycalinan_admin_token");
    otherStorage.removeItem("mycalinan_admin_username");
    otherStorage.removeItem("mycalinan_admin_role");
  };

  const handleAdminSubmit = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    setError("");

    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
        }),
      });

      const data: LoginSuccessPayload & LoginErrorPayload =
        await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      storeSession(remember, data);

      /*
        Redirect to the admin dashboard only after
        successful authentication.
      */
      window.location.href = "Admin-Dashboard.html";
    } catch (err) {
      console.error("Admin login error:", err);

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
            {mode === "admin"
              ? "Administrator Portal"
              : "Discover Calinan. Explore. Stay Informed."}
          </p>
        </div>

        {/* MODE TABS */}
        <div className="login-page-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "admin"}
            className={mode === "admin" ? "active" : ""}
            onClick={() => setMode("admin")}
          >
            Admin Login
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

        {/* ---------------- ADMIN LOGIN FORM ---------------- */}
        {mode === "admin" && (
          <form
            className="login-page-form"
            id="admin-login-form"
            onSubmit={handleAdminSubmit}
          >
            <h2>Admin Login</h2>

            {error && (
              <div id="login-error" className="login-page-error" role="alert">
                {error}
              </div>
            )}

            <div className="login-page-input-group">
              <label htmlFor="username">Username</label>

              <input
                type="text"
                id="username"
                placeholder="Enter username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
              Authorized Administrators Only
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
                be available only to authorized administrators.
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