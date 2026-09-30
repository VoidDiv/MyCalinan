"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/Firebase";

/** Firebase Auth + users/{uid}.role === "admin". Kung dili, i-redirect sa /login. */
export default function useAdminGuard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists() && snap.data().role === "admin") {
          setUser(u);
          setReady(true);
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return { user, ready };
}