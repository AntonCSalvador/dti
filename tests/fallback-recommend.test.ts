import { afterEach, expect, it, vi } from "vitest";
import type { Catalog, ReferenceSearchResult } from "../src/lib/types";

const state = vi.hoisted(() => ({
  search: vi.fn(),
  parse: vi.fn(),
}));
vi.mock("../src/lib/search", () => ({ searchReferences: state.search }));
vi.mock("openai", () => ({
  default: class {
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
};
const signal = new AbortController().signal;

afterEach(() => {
  state.search.mockReset();
  state.parse.mockReset();
  vi.unstubAllEnvs();
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
