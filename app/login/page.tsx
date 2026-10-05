/* ============================================================
   FILE: app/login/page.tsx
   ============================================================ */

"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
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

const GUEST_PERKS = [
  "Access community information",
  "Explore tourism and establishments",
  "View announcements and events",
  "Use available public service guides",
];

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

  const storeSession = (shouldRemember: boolean, payload: LoginSuccessPayload): void => {
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

  /* Clears every trace of a previous session — Firebase Auth itself,
     plus any leftover localStorage/sessionStorage flags from a real
     login or a previous guest visit. Used before starting either a
     fresh sign-in or a guest session, so the two modes can never
     bleed into each other. */
  const clearAllSessionState = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Could not clear the previous Firebase session:", err);
    }

    ["mycalinan_uid", "mycalinan_token", "mycalinan_username", "mycalinan_role"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    sessionStorage.removeItem("mycalinan_guest");
    sessionStorage.removeItem("mycalinan_guest_name");
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");

    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    setLoading(true);

    try {
      // Make sure no guest flags or stale session survive into a real login
      sessionStorage.removeItem("mycalinan_guest");
      sessionStorage.removeItem("mycalinan_guest_name");

      // 1. Firebase Auth sign-in
      const userCredential = await signInWithEmailAndPassword(auth, trimmedIdentifier, password);
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
    } catch (err: unknown) {
      console.error("Sign in error:", err);
      const code = (err as { code?: string })?.code;

      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Cannot connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async (): Promise<void> => {
    setGuestLoading(true);

    // Force any previously signed-in Firebase session to end first.
    // Without this, someone who signed in once and later clicks
    // "Continue as Guest" would stay authenticated under the hood —
    // review forms and other auth-gated features would still treat
    // them as logged in, even though the UI says "Guest".
    await clearAllSessionState();

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
    <div className="su-page">
      <div className="su-card">
        {/* LOGO BADGE */}
        <div className="su-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="su-logo" src="/image/CALINAN LOGO.png" alt="MyCalinan" />
        </div>

        <h1 className="su-title">{mode === "signin" ? "Welcome Back" : "Browse as Guest"}</h1>
        <p className="su-subtitle">
          {mode === "signin"
            ? "Sign in to your MyCalinan account."
            : "Discover Calinan. Explore. Stay Informed."}
        </p>

        {/* MODE TABS */}
        <div className="lg-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={`lg-tab${mode === "signin" ? " is-active" : ""}`}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "guest"}
            className={`lg-tab${mode === "guest" ? " is-active" : ""}`}
            onClick={() => setMode("guest")}
          >
            Continue as Guest
          </button>
        </div>

        {/* ---------------- SIGN IN ---------------- */}
        {mode === "signin" && (
          <>
            <form className="su-form" id="signin-form" onSubmit={handleSignIn} noValidate>
              {error && (
                <div id="login-error" className="su-alert" role="alert">
                  <strong>⚠</strong> {error}
                </div>
              )}

              <div className="su-field" style={{ marginTop: error ? "1rem" : 0 }}>
                <label className="su-label" htmlFor="identifier">
                  Email address
                </label>
                <input
                  type="email"
                  id="identifier"
                  className={`su-input${error ? " has-error" : ""}`}
                  placeholder="you@email.com"
                  autoComplete="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  aria-invalid={!!error}
                />
              </div>

              <div className="su-field">
                <label className="su-label" htmlFor="password">
                  Password
                </label>
                <div className="su-password">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className={`su-input${error ? " has-error" : ""}`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!error}
                  />
                  <button
                    type="button"
                    className="su-toggle"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <label className="lg-remember" htmlFor="remember">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button type="submit" className="su-btn" id="login-submit-btn" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {/* NEW: the "Sign up here" button, in a highlighted panel */}
            <div className="lg-register">
              <p className="lg-register-title">New to MyCalinan?</p>
              <p className="lg-register-text">
                Create an account to register your business and leave reviews.
              </p>
              <Link href="/signup" className="lg-register-btn">
                Sign up here <span aria-hidden="true">→</span>
              </Link>
            </div>

            <p className="lg-hint">Works for administrator and business accounts.</p>
          </>
        )}

        {/* ---------------- GUEST ---------------- */}
        {mode === "guest" && (
          <div className="lg-guest">
            <div className="lg-guest-icon" aria-hidden="true">
              👤
            </div>

            <p className="lg-guest-text">
              Continue to MyCalinan without creating an account. You can explore community
              information, tourism spots, public services, events, announcements, and other
              available features as a guest.
            </p>

            <ul className="lg-guest-list">
              {GUEST_PERKS.map((perk) => (
                <li key={perk} className="lg-guest-item">
                  <span className="lg-guest-check" aria-hidden="true">
                    ✓
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="su-btn lg-btn-flex"
              onClick={handleGuestSignIn}
              disabled={guestLoading}
            >
              {guestLoading ? (
                <>
                  <span className="lg-spinner" />
                  Entering…
                </>
              ) : (
                "Continue as Guest"
              )}
            </button>

            <div className="lg-notice">
              <strong>Guest access</strong>
              <p>
                Guest access does not require an account. Reviews and other account-only features
                are disabled while browsing as a guest.
              </p>
            </div>
          </div>
        )}

        {/* HOME LINK — shared by both modes */}
        <div className="su-footer su-footer--small">
          <button type="button" className="lg-home" onClick={handleBackToHome}>
            ← Back to MyCalinan
          </button>
        </div>
      </div>

      <p className="lg-page-footer">MyCalinan • Barangay Calinan, Davao City</p>
    </div>
  );
};

export default LoginPage;