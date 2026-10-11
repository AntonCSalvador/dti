import { afterEach, expect, it, vi } from "vitest";
import type { Catalog, ReferenceSearchResult } from "../src/lib/types";

const state = vi.hoisted(() => ({
  search: vi.fn(),
  parse: vi.fn(),
  config: vi.fn(),
}));
vi.mock("../src/lib/search", () => ({ searchReferences: state.search }));
vi.mock("openai", () => ({
  default: class {
    constructor(config: unknown) {
      state.config(config);
    }
    responses = { parse: state.parse };
  },
}));
import { recommendOutfits } from "../src/lib/recommend";

const notice =
  "SerpApi searches are exhausted. Switched to Openverse search; matches may be less specific.";
const reference = {
  id: "ref-1",
  title: "Dress",
  sourceUrl: "https://source.example/dress",
  imageUrl: "https://images.example/dress.jpg",
  thumbnailUrl: "https://images.example/thumb.jpg",
  creator: "Ada",
  license: "CC BY 4.0",
};
const item = {
  id: "dress",
  name: "Basic Dress",
  category: "Dress/Skirt",
  sourceUrl: "https://example.com/dress",
  imageUrl: "https://example.com/dress.jpg",
  bodyTypes: ["female"] as const,
  description: "A dress",
  colorSlots: [],
  toggles: [],
  location: null,
  sourceCheckedAt: "2026-10-10",
  eligibility: "standard-free" as const,
};
const catalog = {
  sourceUrl: "https://example.com",
  importedAt: "2026-10-10",
  items: [{ ...item, bodyTypes: ["female"] }],
  warnings: [],
} as Catalog;
const input = {
  theme: "Hollywood",
  style: "either" as const,
  body: "female" as const,
  provider: "openai" as const,
};
const signal = new AbortController().signal;

afterEach(() => {
  state.search.mockReset();
  state.parse.mockReset();
  state.config.mockReset();
  vi.unstubAllEnvs();
});

it("routes a page key to fixed free OpenRouter requests without putting it in prompts", async () => {
  vi.stubEnv("OPENAI_API_KEY", "other-provider-secret");
  vi.stubEnv("OPENAI_MODEL", "paid-override");
  state.parse.mockResolvedValueOnce({ output_parsed: { itemIds: ["dress"] } });
  state.parse.mockResolvedValueOnce({
    output_parsed: {
      looks: [
        {
          title: "Dress",
          referenceId: "uploaded",
          body: "female",
          why: "Shape",
          compromises: [],
          pieces: [
            {
              itemId: "dress",
              toggleId: null,
              colors: [],
              note: "Wear it",
              essential: true,
            },
          ],
        },
      ],
      warnings: [],
    },
  });
  await recommendOutfits(
    {
      ...input,
      provider: "openrouter",
      apiKey: "router-page-secret",
      imageDataUrl: "data:image/png;base64,AAAA",
    },
    catalog,
    signal,
  );
  expect(state.config).toHaveBeenCalledWith(
    expect.objectContaining({
      apiKey: "router-page-secret",
      baseURL: "https://openrouter.ai/api/v1",
    }),
  );
  expect(state.search).not.toHaveBeenCalled();
  expect(state.parse).toHaveBeenCalledTimes(2);
  for (const [request] of state.parse.mock.calls) {
    expect(request).toMatchObject({
      model: "openrouter/free",
      store: false,
      provider: { require_parameters: true },
    });
    expect(JSON.stringify(request)).not.toContain("router-page-secret");
    expect(JSON.stringify(request)).not.toContain("other-provider-secret");
  }
});

it.each([
  [401, "rejected the API key"],
  [429, "rate limited"],
  [404, "No compatible free OpenRouter model"],
  [503, "couldn't complete"],
])("sanitizes provider status %i", async (status, message) => {
  state.parse.mockRejectedValueOnce({ status, message: "raw-provider-secret" });
  try {
    await recommendOutfits(
      {
        ...input,
        provider: "openrouter",
        apiKey: "page-key",
        imageDataUrl: "data:image/png;base64,AAAA",
      },
      catalog,
      signal,
    );
    throw new Error("Expected provider failure");
  } catch (error) {
    expect(error).toMatchObject({
      code: "AI_FAILED",
      message: expect.stringContaining(message),
    });
    expect(String(error)).not.toContain("raw-provider-secret");
  }
});

it("calls incomplete free shortlists incomplete rather than no match", async () => {
  state.parse.mockResolvedValueOnce({ output_parsed: null });
  await expect(
    recommendOutfits(
      {
        ...input,
        provider: "openrouter",
        apiKey: "page-key",
        imageDataUrl: "data:image/png;base64,AAAA",
      },
      catalog,
      signal,
    ),
  ).rejects.toMatchObject({ code: "AI_INCOMPLETE" });
});

it("rejects a missing selected provider key before reference search", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "");
  vi.stubEnv("OPENROUTER_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "other-provider-secret");
  await expect(
    recommendOutfits({ ...input, provider: "openrouter" }, catalog, signal),
  ).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
  expect(state.search).not.toHaveBeenCalled();
  expect(state.config).not.toHaveBeenCalled();
});

it("retains fallback notice on a valid recommendation", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  state.search.mockResolvedValue({
    references: [reference],
    notice,
  } satisfies ReferenceSearchResult);
  state.parse.mockResolvedValueOnce({ output_parsed: { itemIds: ["dress"] } });
  state.parse.mockResolvedValueOnce({
    output_parsed: {
      looks: [
        {
          title: "Hollywood dress",
          referenceId: "ref-1",
          body: "female",
          why: "Shape",
          compromises: [],
          pieces: [
            {
              itemId: "dress",
              toggleId: null,
              colors: [],
              note: "Wear it",
              essential: true,
            },
          ],
        },
      ],
      warnings: [],
    },
  });
  expect((await recommendOutfits(input, catalog, signal)).searchNotice).toBe(
    notice,
  );
});

it("retains fallback context after empty references or AI failure", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  state.search.mockResolvedValueOnce({
    references: [],
    notice,
  } satisfies ReferenceSearchResult);
  await expect(recommendOutfits(input, catalog, signal)).rejects.toThrow(
    /SerpApi searches are exhausted/,
  );
  state.search.mockResolvedValueOnce({
    references: [reference],
    notice,
  } satisfies ReferenceSearchResult);
  state.parse.mockRejectedValueOnce(new Error("provider failure"));
  await expect(recommendOutfits(input, catalog, signal)).rejects.toThrow(
    /SerpApi searches are exhausted/,
  );
});

it("retains fallback context after an invalid recipe", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  state.search.mockResolvedValue({
    references: [reference],
    notice,
  } satisfies ReferenceSearchResult);
  state.parse.mockResolvedValueOnce({ output_parsed: { itemIds: ["dress"] } });
  state.parse.mockResolvedValueOnce({
    output_parsed: { looks: [], warnings: [] },
  });
  await expect(recommendOutfits(input, catalog, signal)).rejects.toThrow(
    /SerpApi searches are exhausted/,
  );
});
