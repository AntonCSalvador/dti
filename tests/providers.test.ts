import { afterEach, expect, it, vi } from "vitest";
import { inputSchema } from "../src/lib/schemas";
import { providerStatus, resolveProvider } from "../src/lib/providers";

afterEach(() => vi.unstubAllEnvs());

it("defaults requests to OpenRouter and accepts only bounded printable keys", () => {
  const base = { theme: "Gothic", style: "either", body: "female" };
  expect(inputSchema.parse(base).provider).toBe("openrouter");
  expect(inputSchema.parse({ ...base, apiKey: "  sk-test  " }).apiKey).toBe(
    "sk-test",
  );
  for (const apiKey of ["", "  ", "a b", "a\nb", "x".repeat(513)]) {
    expect(inputSchema.safeParse({ ...base, apiKey }).success).toBe(false);
  }
  expect(inputSchema.safeParse({ ...base, provider: "unknown" }).success).toBe(
    false,
  );
  expect(inputSchema.safeParse({ ...base, searchKey: "secret" }).success).toBe(
    false,
  );
});

it("resolves explicit key before selected provider aliases without cross-provider fallback", () => {
  vi.stubEnv("OPENROUTER_API_KEY", "router-primary");
  vi.stubEnv("OPENROUTER_KEY", "router-alias");
  vi.stubEnv("OPENAI_API_KEY", "openai-key");
  expect(
    resolveProvider({ provider: "openrouter", apiKey: "page-key" }),
  ).toMatchObject({
    apiKey: "page-key",
    model: "openrouter/free",
    baseURL: "https://openrouter.ai/api/v1",
  });
  expect(resolveProvider({ provider: "openrouter" }).apiKey).toBe(
    "router-primary",
  );
  vi.stubEnv("OPENROUTER_API_KEY", "");
  expect(resolveProvider({ provider: "openrouter" }).apiKey).toBe(
    "router-alias",
  );
  vi.stubEnv("OPENROUTER_KEY", "");
  expect(() => resolveProvider({ provider: "openrouter" })).toThrow(
    /OpenRouter/,
  );
  expect(resolveProvider({ provider: "openai" }).apiKey).toBe("openai-key");
});

it("reports only provider availability booleans and search aliases", () => {
  vi.stubEnv("OPENROUTER_API_KEY", "");
  vi.stubEnv("OPENROUTER_KEY", "alias-secret");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("SERPAPI_API_KEY", "");
  vi.stubEnv("SERP_KEY", "search-secret");
  expect(providerStatus()).toEqual({
    openrouter: true,
    openai: false,
    search: true,
  });
});
