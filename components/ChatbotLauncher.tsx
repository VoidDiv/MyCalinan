"use client";

import { useState } from "react";

/**
 * UI shell for Calibot. Handles open/close and the static layout only —
 * the actual send/receive logic (and its Anthropic-powered backend call)
 * is a separate migration step from the Flask version.
 */
export default function ChatbotLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 flex h-[420px] w-[320px] flex-col overflow-hidden rounded-[20px] border border-canopy-600/30 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-canopy-800 px-4 py-3 text-white">
            <span className="font-display font-semibold">Calibot</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-white/80 transition hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            <div className="max-w-[85%] rounded-[var(--radius-stall)] bg-canopy-100 px-3 py-2 text-ink-900">
              Hey! I&rsquo;m Calibot 🦅 — ask me about schools, hospitals,
              food, hotlines, or barangay documents in Calinan.
            </div>
          </div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex gap-2 border-t border-canopy-100 p-3"
          >
            <input
              type="text"
              placeholder="Ask something…"
              className="flex-1 rounded-full border border-canopy-600/30 px-3 py-2 text-sm outline-none focus:border-canopy-600"
            />
            <button
              type="submit"
              className="rounded-full bg-canopy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-canopy-800"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Calibot" : "Talk to Calibot"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-durian-500 text-2xl shadow-xl transition hover:bg-durian-400"
      >
        🦅
      </button>
    </div>
  );
}
