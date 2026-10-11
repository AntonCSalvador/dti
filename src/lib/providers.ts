import { AppError } from "./errors";
import type { AIProvider, ProviderStatus } from "./types";

const configured = (...values: (string | undefined)[]) =>
  values.map((value) => value?.trim()).find(Boolean);

export function providerStatus(): ProviderStatus {
  return {
    openrouter: Boolean(
      configured(process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_KEY),
    ),
    openai: Boolean(configured(process.env.OPENAI_API_KEY)),
    search: Boolean(
      configured(process.env.SERPAPI_API_KEY, process.env.SERP_KEY),
    ),
  };
}

export function resolveProvider(input: {
  provider?: AIProvider;
  apiKey?: string;
}) {
  const provider = input.provider ?? "openrouter";
  const apiKey = configured(
    input.apiKey,
    ...(provider === "openrouter"
      ? [process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_KEY]
      : [process.env.OPENAI_API_KEY]),
  );
  if (!apiKey)
    throw new AppError(
      "AI_NOT_CONFIGURED",
      `Add an ${provider === "openrouter" ? "OpenRouter" : "OpenAI"} API key in setup or .env.local to generate looks. You can browse the free wardrobe now.`,
      503,
    );
  return provider === "openrouter"
    ? {
        apiKey,
        provider,
        baseURL: "https://openrouter.ai/api/v1",
        model: "openrouter/free",
      }
    : {
        apiKey,
        provider,
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1",
      };
}
