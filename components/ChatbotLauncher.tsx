/* ============================================================
   FILE: components/ChatbotLauncher.tsx
   The CaliBot button (bottom right) and its chat window.

   - Sends a random session id with every message (kept for this visit only),
     so the chat log (Firestore "calibot_logs") can group one conversation.
   - Shows the server's own message when something goes wrong
     (e.g. "You're sending messages too fast").
   - Fits small phones: the window never gets wider than the screen.
   - Voice: replies are read aloud (🔊); tap it to mute.

   NOTE: the guided tour (lib/tutorialTargets.ts) finds this component by its
   wrapper classes "fixed bottom-6 right-6", the launcher button being a direct
   child, and the text input inside the <form>. Keep those if you edit it.
   ============================================================ */

"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ChatSource {
  collection: string;
  id: string;
  name?: string;
}

const HISTORY_LIMIT = 10;
const SESSION_KEY = "mc_calibot_session";

const CALIBOT_LOGO =
  "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/Logo%2FCalibotAi.png?alt=media&token=44e5b03e-1bd9-4d8e-a984-b92dddf2717a";

const INITIAL_MESSAGE =
  "Hey! I'm Calibot 🦅 — ask me about schools, hospitals, food, hotlines, tourism, healthcare, or barangay information in Calinan.";

const FALLBACK_ERROR = "I ran into a problem answering that. Please try again.";

/** One random id per visit (a new tab or a new day starts a new conversation in the log). */
function getSessionId(): string {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "unknown";
  }
}

export default function ChatbotLauncher() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: INITIAL_MESSAGE },
  ]);
  const [sources, setSources] = useState<ChatSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* Scroll to the newest message */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  /* Stop speaking when the component goes away */
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* Stop speaking when the chat is closed */
  useEffect(() => {
    if (!open) stopSpeaking();
  }, [open]);

  function stopSpeaking() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  function speak(text: string) {
    if (!voiceEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    // Prefer Philippine English. The voice actually used depends on the phone/browser.
    utterance.lang = "en-PH";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function toggleVoice() {
    if (voiceEnabled) {
      stopSpeaking();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const history = messages
      .filter((m) => !(m.role === "assistant" && m.text === INITIAL_MESSAGE))
      .slice(-HISTORY_LIMIT);

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsLoading(true);
    setSources([]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, sessionId: getSessionId() }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        // Show the server's own explanation when it gave one
        throw new Error(typeof data?.error === "string" ? data.error : FALLBACK_ERROR);
      }

      const reply = typeof data.reply === "string" ? data.reply : FALLBACK_ERROR;
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      setSources(Array.isArray(data.sources) ? data.sources : []);
      speak(reply);
    } catch (error) {
      console.error("Calibot error:", error);
      const text =
        typeof navigator !== "undefined" && navigator.onLine === false
          ? "You're offline. Calibot needs an internet connection — please try again when you're back online."
          : error instanceof Error && error.message
          ? error.message
          : FALLBACK_ERROR;
      setMessages((prev) => [...prev, { role: "assistant", text }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="Calibot chat"
          className="mb-3 flex h-[min(500px,70dvh)] w-[min(340px,calc(100vw-3rem))] flex-col overflow-hidden rounded-[20px] border border-canopy-600/30 bg-white shadow-2xl"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between bg-canopy-800 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CALIBOT_LOGO} alt="Calibot" className="h-8 w-8 rounded-full object-contain" />
              <div>
                <div className="font-display font-semibold" translate="no">
                  Calibot
                </div>
                {isSpeaking && <div className="text-[10px] text-white/70">Speaking...</div>}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={voiceEnabled ? "Mute Calibot" : "Unmute Calibot"}
                title={voiceEnabled ? "Mute Calibot" : "Unmute Calibot"}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {voiceEnabled ? "🔊" : "🔇"}
              </button>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  aria-label="Stop Calibot speaking"
                  title="Stop speaking"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  ■
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setOpen(false);
                }}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* CHAT */}
          <div ref={scrollRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`}>
                <div
                  className={
                    message.role === "assistant"
                      ? "max-w-[88%] whitespace-pre-wrap rounded-[var(--radius-stall)] bg-canopy-100 px-3 py-2 text-ink-900"
                      : "ml-auto max-w-[88%] whitespace-pre-wrap rounded-[var(--radius-stall)] bg-canopy-700 px-3 py-2 text-white"
                  }
                >
                  {message.text}
                </div>

                {/* Sources under the most recent answer */}
                {message.role === "assistant" && index === messages.length - 1 && sources.length > 0 && (
                  <div className="mt-2 max-w-[88%] rounded-lg border border-canopy-100 bg-gray-50 p-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      MyCalinan data
                    </div>
                    <div className="space-y-1">
                      {sources.slice(0, 5).map((source) => (
                        <div key={`${source.collection}-${source.id}`} className="truncate text-[11px] text-gray-600">
                          • {source.name || source.id}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[88%] rounded-[var(--radius-stall)] bg-canopy-100 px-3 py-2 text-ink-900">
                <span className="animate-pulse">Calibot is thinking…</span>
              </div>
            )}
          </div>

          {/* INPUT */}
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-canopy-100 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something…"
              aria-label="Ask Calibot a question"
              disabled={isLoading}
              autoComplete="off"
              maxLength={500}
              className="min-w-0 flex-1 rounded-full border border-canopy-600/30 px-3 py-2 text-sm outline-none transition focus:border-canopy-600 focus:ring-2 focus:ring-canopy-600/10 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-canopy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-canopy-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}

      {/* FLOATING CALIBOT BUTTON (must stay a direct child of the wrapper — the guided tour looks for it) */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close Calibot" : "Talk to Calibot"}
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-xl transition hover:scale-105 hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CALIBOT_LOGO} alt="Calibot" className="h-10 w-10 object-contain" />
      </button>
    </div>
  );
}