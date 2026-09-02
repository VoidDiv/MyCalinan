// app/api/chat/route.ts
//
// Receives { message: string, history?: ChatMessage[] } from the chat
// widget, pulls loosely matching data out of Firestore for context,
// sends the full conversation (with history) to Claude, and returns
// { reply: string }.

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

// Collections Calibot can pull context from.
// IMPORTANT: adjust this list to match your ACTUAL Firestore collection
// names — check the Firebase Console to confirm (e.g. your link-*.js
// scripts may have created "transportation" instead of "transport", etc).
const SEARCHABLE_COLLECTIONS = [
  "documents",
  "hotspots",
  "history",
  "community",
  "education",
  "finance",
  "food",
  "healthcare",
  "lifestyle",
  "shopping",
  "transportation",
];

async function buildContext(query: string): Promise<string> {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3); // skip tiny/common words

  // Fetch every collection IN PARALLEL instead of one-at-a-time.
  // The sequential version awaited each collection before starting the
  // next, which added up across 11 collections and risked hitting the
  // serverless function timeout.
  const results = await Promise.all(
    SEARCHABLE_COLLECTIONS.map(async (collectionName) => {
      try {
        const snapshot = await adminDb
          .collection(collectionName)
          .limit(50)
          .get();

        const matches: string[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const searchable = JSON.stringify(data).toLowerCase();
          const isRelevant = words.some((word) => searchable.includes(word));

          if (isRelevant) {
            matches.push(
              `[${collectionName}] ${data.name ?? ""}: ${
                data.description ?? ""
              } ${data.location ?? ""}`.trim()
            );
          }
        });
        return matches;
      } catch {
        // Collection might not exist yet (e.g. you haven't run that
        // link-*.js script) — just skip it, don't fail the whole request.
        return [];
      }
    })
  );

  const chunks = results.flat();

  // Cap how much context we send, to control token usage/cost.
  return chunks.slice(0, 15).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = (await req.json()) as {
      message?: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const context = await buildContext(message);

    const systemPrompt = `You are Calibot, a friendly assistant for MyCalinan, a community information website for Calinan district, Davao City. Answer using ONLY the context below when it's relevant to the question. If nothing relevant is found in the context, say you're not sure and suggest checking the site's Explore or Documents sections instead of guessing. Keep answers short and friendly.

Context:
${context || "(no matching data found for this question)"}`;

    // Turn the widget's local ChatMessage[] into the Anthropic API's
    // messages[] shape, then append the new user message. This is what
    // gives Calibot actual conversation memory across turns.
    const apiMessages = [
      ...(Array.isArray(history) ? history : []).map((m) => ({
        role: m.role,
        content: m.text,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 500,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json({ error: "AI request failed" }, { status: 500 });
    }

    const data = await response.json();

    // Don't assume content[0] is text — find the first text block.
    // Robust against the response including a non-text block first.
    const textBlock = Array.isArray(data.content)
      ? data.content.find((block: { type: string }) => block.type === "text")
      : null;
    const reply = textBlock?.text ?? "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}