import "server-only";

import { z } from "zod";

const FAL_OPENROUTER_BASE_URL = "https://fal.run/openrouter/router/openai/v1";
const DEFAULT_FAL_OPENROUTER_MODEL = "google/gemini-2.5-flash";

const falOpenRouterChatResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

function getFalCredentials() {
  const credentials = process.env.FAL_KEY;

  if (!credentials) {
    throw new Error("FAL_KEY is not configured on the server.");
  }

  return credentials;
}

function getFalOpenRouterModel() {
  return (
    process.env.FAL_OPENROUTER_MODEL ?? process.env.OPENROUTER_MODEL ?? DEFAULT_FAL_OPENROUTER_MODEL
  );
}

export async function runFalOpenRouterCompatibilityTest() {
  const model = getFalOpenRouterModel();
  const response = await fetch(
    `${FAL_OPENROUTER_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Key ${getFalCredentials()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You are helping test an OpenAI-compatible chat completions endpoint. Reply with exactly 3 short lines, no markdown, each line prefixed by a speaker label.",
          },
          {
            role: "user",
            content:
              "Write a tiny transcript between Jordan Peterson and Ben Shapiro about why moving Remotion rendering to fal serverless could be useful.",
          },
        ],
      }),
      cache: "no-store",
    },
  );

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(
      `fal OpenAI-compatible endpoint returned HTTP ${response.status}: ${raw}`,
    );
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error(
      `fal OpenAI-compatible endpoint returned non-JSON output: ${raw}`,
    );
  }

  const parsed = falOpenRouterChatResponseSchema.parse(parsedJson);
  const output = parsed.choices[0]?.message.content?.trim();

  if (!output) {
    throw new Error("fal OpenAI-compatible endpoint returned an empty message.");
  }

  return {
    ok: true,
    endpoint: `${FAL_OPENROUTER_BASE_URL}/chat/completions`,
    model: parsed.model ?? model,
    requestId: parsed.id ?? null,
    output,
    usage: parsed.usage ?? null,
  };
}
