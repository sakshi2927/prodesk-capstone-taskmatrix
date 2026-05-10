import { NextResponse } from "next/server";

import { requestJson } from "@/lib/request";

type RequestBody = {
  title?: unknown;
  description?: unknown;
};

function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    null
  );
}

function extractText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSubtasks(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 6);
}

function parseJsonArray(text: string): string[] {
  const trimmed = text.trim();

  try {
    return normalizeSubtasks(JSON.parse(trimmed));
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) {
      return [];
    }

    try {
      return normalizeSubtasks(JSON.parse(match[0]));
    } catch {
      return [];
    }
  }
}

function fallbackSubtasks(title: string, description: string): string[] {
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();

  return [
    `Clarify the scope and success criteria for ${cleanTitle}.`,
    cleanDescription
      ? `Use the description to break ${cleanTitle} into smaller implementation steps.`
      : `List the key pieces needed to finish ${cleanTitle}.`,
    `Review edge cases, dependencies, and risks for ${cleanTitle}.`,
    `Test and ship ${cleanTitle} with a quick verification pass.`,
  ];
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false") {
    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const title = extractText(body?.title);
    const description = extractText(body?.description);

    return NextResponse.json({ subtasks: fallbackSubtasks(title, description) });
  }

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gemini is not configured. Set GEMINI_API_KEY, GOOGLE_GEMINI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const title = extractText(body?.title);
  const description = extractText(body?.description);

  if (!title) {
    return NextResponse.json({ error: "Task title is required." }, { status: 400 });
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const prompt = [
    "Generate 4 concise sub-steps for a task board item.",
    "Return only a valid JSON array of strings.",
    "Each string should be an action-oriented sub-step.",
    "Do not add markdown, numbering, or extra commentary.",
    `Task title: ${title}`,
    description ? `Task description: ${description}` : "Task description: none provided.",
  ].join("\n");

  try {
    const data = await requestJson<
      | {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        }
    >(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 256,
        },
      }),
      timeoutMs: 15000,
    });

    const modelText = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const subtasks = parseJsonArray(modelText);

    if (!subtasks.length) {
      return NextResponse.json({ subtasks: fallbackSubtasks(title, description) });
    }

    return NextResponse.json({ subtasks });
  } catch {
    return NextResponse.json({ subtasks: fallbackSubtasks(title, description) });
  }
}