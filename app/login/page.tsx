"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/Firebase";

type UserRole = "admin" | "business" | "user";

interface LoginSuccessPayload {
  token: string;
  username: string;
  role: UserRole;
}

type AuthMode = "signin" | "guest";

/**
 * Hardcoded default admin account for local testing/demo purposes.
 */
const DEFAULT_ADMIN_USERNAME = "mycalinanadmin@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "@admin1906";

/**
 * Where each role lands after a successful sign in.
 */
const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/adminpage/AdminDashboard",
  business: "/business/dashboard",
  user: "/",
};

const LoginPage: React.FC = () => {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");

  /* ---------------- Unified sign-in state ---------------- */
  const [identifier, setIdentifier] = useState<string>(""); // Email address
  const [password, setPassword] = useState<string>("");
  const [remember, setRemember] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  /* ---------------- Guest sign-in state ---------------- */
  const [guestLoading, setGuestLoading] = useState<boolean>(false);

  const storeSession = (
    shouldRemember: boolean,
    payload: LoginSuccessPayload
  ): void => {
    const storage: Storage = shouldRemember ? localStorage : sessionStorage;

    storage.setItem("mycalinan_token", payload.token);
    storage.setItem("mycalinan_username", payload.username);
    storage.setItem("mycalinan_role", payload.role);

    const otherStorage: Storage = shouldRemember ? sessionStorage : localStorage;

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

    /* ---------------- Default admin bypass ---------------- */
    if (
      trimmedIdentifier === DEFAULT_ADMIN_USERNAME &&
      password === DEFAULT_ADMIN_PASSWORD
    ) {
      setLoading(true);

      storeSession(remember, {
        token: "default-admin-token",
        username: DEFAULT_ADMIN_USERNAME,
        role: "admin",
      });

      router.push(ROLE_REDIRECTS.admin);
      return;
    }

    setLoading(true);

    try {
      // 1. Firebase Auth Sign-in
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedIdentifier,
        password
      );
      const user = userCredential.user;

      // 2. Kuhanin ang user profile/role sa Firestore
      let userRole: UserRole = "user";
      let username = user.email?.split("@")[0] || "User";

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          if (
            data.role &&
            (data.role === "admin" || data.role === "business" || data.role === "user")
          ) {
            userRole = data.role as UserRole;
          }
          if (data.fullName) {
            username = data.fullName;
          }
        }
      } catch (firestoreErr) {
        console.warn("Could not fetch user profile from Firestore:", firestoreErr);
      }

      const idToken = await user.getIdToken();

      storeSession(remember, {
        token: idToken,
        username: username,
        role: userRole,
      });

      // 3. I-redirect ang user depende sa kanyang role
      const destination = ROLE_REDIRECTS[userRole] ?? "/";
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
        setError("Failed to sign in. Please check your internet connection.");
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
          <img
            src="https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/Logo%2FCALINAN%20LOGO.png?alt=media&token=42cb2f15-375c-4975-a8ce-591018ceb036"
            alt="MyCalinan Logo"
          />
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
              <p className="mb-1">Works for administrator, business, and personal accounts.</p>
              <div>
                <span>New user? </span>
                <Link href="/signup" style={{ fontWeight: "bold", color: "#1b4332" }}>
                  Sign Up
                </Link>
              </div>
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