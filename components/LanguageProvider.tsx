"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { startPageTranslator } from "@/lib/domTranslator";

/* ============================================================
   LanguageProvider — the ENG / CEB switch.

   - The choice is saved on the device (localStorage "mycalinan_lang").
   - Cebuano: translates the page live through /api/translate.
   - English: reloads the page, which restores every original word.
   Use it anywhere with:  const { lang, setLang } = useLanguage();
   ============================================================ */

export type Lang = "en" | "ceb";

const STORAGE_KEY = "mycalinan_lang";
const CHANGE_EVENT = "mycalinan-lang-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const getSnapshot = (): Lang =>
  localStorage.getItem(STORAGE_KEY) === "ceb" ? "ceb" : "en";

const getServerSnapshot = (): Lang => "en";

type LanguageContextValue = { lang: Lang; setLang: (lang: Lang) => void };

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      localStorage.setItem(STORAGE_KEY, next);
      if (next === "en") {
        // Reloading restores every original English word reliably
        window.location.reload();
        return;
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [lang]
  );

  useEffect(() => {
    document.documentElement.lang = lang === "ceb" ? "ceb" : "en";
    if (lang !== "ceb") return;

    // Wait a moment so the page finishes hydrating before we touch its text
    let stop: (() => void) | undefined;
    const timer = setTimeout(() => {
      stop = startPageTranslator();
    }, 700);

    return () => {
      clearTimeout(timer);
      stop?.();
    };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
  );
}