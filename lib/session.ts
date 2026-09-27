// lib/session.ts
import { signOut } from "firebase/auth";
import { auth } from "./Firebase";

const SESSION_KEYS = [
  "mycalinan_uid",
  "mycalinan_token",
  "mycalinan_username",
  "mycalinan_role",
];

export async function fullLogout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Firebase sign-out failed:", err);
  }

  SESSION_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  sessionStorage.removeItem("mycalinan_guest");
  sessionStorage.removeItem("mycalinan_guest_name");
}