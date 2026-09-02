// app/api/chat/route.ts
//
// Receives { message: string } from the chat widget, pulls loosely
// matching data out of Firestore for context, sends it to Claude, and
// returns { reply: string }.

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

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

  const chunks: string[] = [];

  for (const collectionName of SEARCHABLE_COLLECTIONS) {
    try {
      const snapshot = await adminDb.collection(collectionName).limit(50).get();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const searchable = JSON.stringify(data).toLowerCase();
        const isRelevant = words.some((word) => searchable.includes(word));

        if (isRelevant) {
          chunks.push(
            `[${collectionName}] ${data.name ?? ""}: ${data.description ?? ""} ${
              data.location ?? ""
            }`.trim()
          );
        }
      });
    } catch {
      // Collection might not exist yet (e.g. you haven't run that
      // link-*.js script) — just skip it, don't fail the whole request.
    }
  }

  // Cap how much context we send, to control token usage/cost.
  return chunks.slice(0, 15).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const context = await buildContext(message);

    const systemPrompt = `You are Calibot, a friendly assistant for MyCalinan, a community information website for Calinan district, Davao City. Answer using ONLY the context below when it's relevant to the question. If nothing relevant is found in the context, say you're not sure and suggest checking the site's Explore or Documents sections instead of guessing. Keep answers short and friendly.

Context:
${context || "(no matching data found for this question)"}`;

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
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json({ error: "AI request failed" }, { status: 500 });
    }

    const data = await response.json();
    const reply =
      data.content?.[0]?.text ?? "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}