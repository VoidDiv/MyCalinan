"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const HISTORY_LIMIT = 10;

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
    const element = scrollRef.current;

    if (element) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = input.trim();

    if (!trimmed || isLoading) {
      return;
    }

    // Keep only actual conversation history.
    // The current message is sent separately below.
    const history = messages
      .filter(
        (message) =>
          !(
            message.role === "assistant" &&
            message.text.startsWith("Hey! I'm Calibot")
          )
      )
      .slice(-HISTORY_LIMIT);

    // Immediately display the user's message.
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: trimmed,
      },
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to get a response."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            typeof data.reply === "string"
              ? data.reply
              : "Sorry, I couldn't generate a response.",
        },
      ]);
    } catch (error) {
      console.error("Calibot error:", error);

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
          {/* Header */}
          <div className="flex items-center justify-between bg-canopy-800 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/Logo%2FCalibotAi.png?alt=media&token=44e5b03e-1bd9-4d8e-a984-b92dddf2717a"
                alt="Calibot"
                className="h-7 w-7 rounded-full object-contain"
              />

              <span className="font-display font-semibold">
                Calibot
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-lg text-white/80 transition hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto p-4 text-sm"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "assistant"
                    ? "max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-stall)] bg-canopy-100 px-3 py-2 text-ink-900"
                    : "ml-auto max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-stall)] bg-canopy-700 px-3 py-2 text-white"
                }
              >
                {message.text}
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[85%] rounded-[var(--radius-stall)] bg-canopy-100 px-3 py-2 text-ink-900">
                <span className="animate-pulse">
                  Calibot is thinking…
                </span>
              </div>
            )}
          </div>

          {/* Input */}
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
              autoComplete="off"
              className="flex-1 rounded-full border border-canopy-600/30 px-3 py-2 text-sm outline-none transition focus:border-canopy-600 focus:ring-2 focus:ring-canopy-600/10 disabled:bg-gray-100"
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

      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          open ? "Close Calibot" : "Talk to Calibot"
        }
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-xl transition hover:scale-105 hover:opacity-90"
      >
        <img
          src="https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/Logo%2FCalibotAi.png?alt=media&token=44e5b03e-1bd9-4d8e-a984-b92dddf2717a"
          alt="Calibot"
          className="h-10 w-10 object-contain"
        />
      </button>
    </div>
  );
}