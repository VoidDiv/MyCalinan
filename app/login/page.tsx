"use client";
import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/Firebase";

type UserRole = "admin" | "user";

interface LoginSuccessPayload {
  uid: string;
  token: string;
  username: string;
  role: UserRole;
}

type AuthMode = "signin" | "guest";

/**
 * Where each role lands after a successful sign in.
 * "user" role = business owner accounts.
 */
const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/adminpage/AdminDashboard",
  user: "/",
};
const LoginPage: React.FC = () => {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");

  /* ---------------- Unified sign-in state ---------------- */
  const [identifier, setIdentifier] = useState<string>(""); // email
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

    storage.setItem("mycalinan_uid", payload.uid);
    storage.setItem("mycalinan_token", payload.token);
    storage.setItem("mycalinan_username", payload.username);
    storage.setItem("mycalinan_role", payload.role);

    const otherStorage: Storage = shouldRemember ? sessionStorage : localStorage;

    otherStorage.removeItem("mycalinan_uid");
    otherStorage.removeItem("mycalinan_token");
    otherStorage.removeItem("mycalinan_username");
    otherStorage.removeItem("mycalinan_role");
  };

  const handleSignIn = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError("");

    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Firebase Auth sign-in
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedIdentifier,
        password
      );
      const user = userCredential.user;

      // 2. Get role + profile info from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError("No profile found for this account. Please contact support.");
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const role: UserRole = userData.role === "admin" ? "admin" : "user";
      const username: string = userData.fullName || user.email?.split("@")[0] || "User";

      // Get Firebase ID token — used as the auth token for backend API calls
      const idToken = await user.getIdToken();

      storeSession(remember, {
        uid: user.uid,
        token: idToken,
        username,
        role,
      });

      // 3. Redirect based on role
      const destination = ROLE_REDIRECTS[role] ?? "/";
      router.push(destination);
    } catch (err: any) {
      console.error("Sign in error:", err);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Cannot connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = (): void => {
    setGuestLoading(true);

    sessionStorage.setItem("mycalinan_guest", "true");
    sessionStorage.setItem("mycalinan_guest_name", "Guest");

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
              <label htmlFor="identifier">Email Address</label>

              <input
                type="email"
                id="identifier"
                placeholder="Enter email address"
                autoComplete="email"
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
              Works for administrator and business accounts.
              <br />
              Don&apos;t have a business account?{" "}
              <Link href="/signup">Sign up here</Link>
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