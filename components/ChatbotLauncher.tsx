"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export default function ChatbotLauncher() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hey! I'm Calibot 🦅 — ask me about schools, hospitals, food, hotlines, or barangay documents in Calinan.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isLoading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I ran into a problem answering that. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

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

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto p-4 text-sm"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "assistant"
                    ? "max-w-[85%] rounded-[var(--radius-stall)] bg-canopy-100 px-3 py-2 text-ink-900"
                    : "ml-auto max-w-[85%] rounded-[var(--radius-stall)] bg-canopy-700 px-3 py-2 text-white"
                }
              >
                {msg.text}
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[85%] rounded-[var(--radius-stall)] bg-canopy-100 px-3 py-2 text-ink-900">
                Typing…
              </div>
            )}
          </div>

          <form
            onSubmit={sendMessage}
            className="flex gap-2 border-t border-canopy-100 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something…"
              disabled={isLoading}
              className="flex-1 rounded-full border border-canopy-600/30 px-3 py-2 text-sm outline-none focus:border-canopy-600"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-canopy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-canopy-800 disabled:opacity-50"
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