import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

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

const HISTORY_LIMIT = 10;
const DOCUMENT_LIMIT_PER_COLLECTION = 50;
const CONTEXT_LIMIT = 15;

/* ---------------------------------------------------------
   Firestore Context Search
--------------------------------------------------------- */

async function buildContext(query: string): Promise<string> {
  const words = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  if (words.length === 0) {
    return "";
  }

  let adminDb;

  try {
    adminDb = getAdminDb();
  } catch (error) {
    console.error(
      "Firebase Admin unavailable:",
      error
    );

    return "";
  }

  const collectionResults = await Promise.all(
    SEARCHABLE_COLLECTIONS.map(async (collectionName) => {
      try {
        const snapshot = await adminDb
          .collection(collectionName)
          .limit(DOCUMENT_LIMIT_PER_COLLECTION)
          .get();

        const matches: string[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          const searchableText = JSON.stringify(
            data
          ).toLowerCase();

          const isRelevant = words.some((word) =>
            searchableText.includes(word)
          );

          if (!isRelevant) {
            return;
          }

          matches.push(
            `[Collection: ${collectionName}]
${JSON.stringify(
  {
    id: doc.id,
    ...data,
  },
  null,
  2
)}`
          );
        });

        return matches;
      } catch (error) {
        console.error(
          `Firestore error in collection "${collectionName}":`,
          error
        );

        return [];
      }
    })
  );

  return collectionResults
    .flat()
    .slice(0, CONTEXT_LIMIT)
    .join("\n\n");
}

/* ---------------------------------------------------------
   Normalize Conversation
--------------------------------------------------------- */

function buildApiMessages(
  history: ChatMessage[],
  currentMessage: string
) {
  const cleanedHistory = history
    .filter(
      (item) =>
        (item.role === "user" ||
          item.role === "assistant") &&
        typeof item.text === "string" &&
        item.text.trim().length > 0
    )
    .filter(
      (item) =>
        !(
          item.role === "assistant" &&
          item.text.startsWith("Hey! I'm Calibot")
        )
    )
    .slice(-HISTORY_LIMIT);

  const messages: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  for (const item of cleanedHistory) {
    const content = item.text.trim();

    // Anthropic conversations should begin with a user message.
    if (
      messages.length === 0 &&
      item.role === "assistant"
    ) {
      continue;
    }

    // Avoid consecutive messages with the same role.
    if (
      messages.length > 0 &&
      messages[messages.length - 1].role === item.role
    ) {
      messages[messages.length - 1].content +=
        `\n\n${content}`;

      continue;
    }

    messages.push({
      role: item.role,
      content,
    });
  }

  // Add the current user message.
  if (
    messages.length > 0 &&
    messages[messages.length - 1].role === "user"
  ) {
    messages[messages.length - 1].content +=
      `\n\n${currentMessage}`;
  } else {
    messages.push({
      role: "user",
      content: currentMessage,
    });
  }

  return messages;
}

/* ---------------------------------------------------------
   POST /api/chat
--------------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    /* -------------------------------------------------------
       Parse request
    ------------------------------------------------------- */

    const body = await req.json();

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------------------------------------
       API key
    ------------------------------------------------------- */

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error(
        "ANTHROPIC_API_KEY is missing."
      );

      return NextResponse.json(
        {
          error:
            "Anthropic API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /* -------------------------------------------------------
       Conversation history
    ------------------------------------------------------- */

    const history: ChatMessage[] =
      Array.isArray(body.history)
        ? body.history
            .filter(
              (item: ChatMessage) =>
                (item.role === "user" ||
                  item.role === "assistant") &&
                typeof item.text === "string"
            )
            .slice(-HISTORY_LIMIT)
        : [];

    /* -------------------------------------------------------
       Firestore context
    ------------------------------------------------------- */

    const context = await buildContext(message);

    /* -------------------------------------------------------
       System prompt
    ------------------------------------------------------- */

    const systemPrompt = `
You are Calibot, the AI assistant for MyCalinan.

MyCalinan is a community information website for
Calinan, Davao City, Philippines.

You help users find information about:

- Schools
- Hospitals
- Healthcare
- Restaurants
- Food
- Transportation
- Barangay services
- Community information
- Local history
- Documents
- Businesses
- Places in Calinan
- Local services

IMPORTANT RULES:

1. Use the database context when it is relevant.

2. Never invent facts about Calinan.

3. Never make up addresses, phone numbers, prices,
   schedules, services, businesses, schools, hospitals,
   or other local information.

4. If the database does not contain enough information,
   clearly say that you do not have enough information.

5. When appropriate, tell the user to check the
   MyCalinan Explore or Documents sections.

6. Keep answers concise, clear, and friendly.

7. Use conversation history to understand follow-up
   questions such as "where is it?", "how much?",
   "what about its phone number?", or "how do I get there?"

8. If a question is unrelated to Calinan, politely explain
   that Calibot primarily provides information about Calinan.

DATABASE CONTEXT:

${
  context ||
  "(No matching database information was found.)"
}
`;

    /* -------------------------------------------------------
       Claude messages
    ------------------------------------------------------- */

    const apiMessages = buildApiMessages(
      history,
      message
    );

    /* -------------------------------------------------------
       Anthropic API
    ------------------------------------------------------- */

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },

        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 500,
          system: systemPrompt,
          messages: apiMessages,
        }),
      }
    );

    /* -------------------------------------------------------
       Anthropic error
    ------------------------------------------------------- */

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Anthropic API error:",
        response.status,
        errorText
      );

      return NextResponse.json(
        {
          error: "AI request failed.",

          ...(process.env.NODE_ENV === "development"
            ? {
                details: errorText,
              }
            : {}),
        },
        {
          status: 500,
        }
      );
    }

    /* -------------------------------------------------------
       Parse response
    ------------------------------------------------------- */

    const data = await response.json();

    const reply = Array.isArray(data.content)
      ? data.content
          .filter(
            (block: { type?: string }) =>
              block.type === "text"
          )
          .map(
            (block: { text?: string }) =>
              block.text ?? ""
          )
          .join("")
          .trim()
      : "";

    if (!reply) {
      console.error(
        "Anthropic returned empty response:",
        JSON.stringify(data)
      );

      return NextResponse.json(
        {
          error:
            "AI returned an empty response.",
        },
        {
          status: 500,
        }
      );
    }

    /* -------------------------------------------------------
       Success
    ------------------------------------------------------- */

    return NextResponse.json({
      reply,
    });
  } catch (error) {
    console.error(
      "Calibot API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while processing your request.",
      },
      {
        status: 500,
      }
    );
  }
}