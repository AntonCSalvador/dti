import { expect, it } from "vitest";
import { normalizeSearchResults, searchReferences } from "../src/lib/search";

it("normalizes attributed HTTPS image results and removes duplicates and unsafe URLs", () => {
  const result = normalizeSearchResults({
    images_results: [
      {
        title: "Runway look",
        link: "https://fashion.example/look",
        original: "https://images.example/look.jpg",
        thumbnail: "https://images.example/thumb.jpg",
      },
      {
        title: "Duplicate",
        link: "https://fashion.example/other",
        original: "https://images.example/look.jpg",
      },
      {
        title: "Unsafe",
        link: "javascript:alert(1)",
        original: "https://images.example/other.jpg",
      },
      { title: "Missing image", link: "https://fashion.example/look" },
    ],
  });
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    title: "Runway look",
    sourceUrl: "https://fashion.example/look",
    imageUrl: "https://images.example/look.jpg",
  });
});

it("distinguishes missing search configuration", async () => {
  await expect(
    searchReferences("Gothic", "either", { apiKey: "" }),
  ).rejects.toMatchObject({ code: "SEARCH_NOT_CONFIGURED" });
});

it("does not leak provider error bodies", async () => {
  const fetchImpl = (async () =>
    new Response("secret-provider-error", { status: 403 })) as typeof fetch;
  await expect(
    searchReferences("Gothic", "either", { apiKey: "test-secret", fetchImpl }),
  ).rejects.toThrow("Reference search failed");
});

it("handles a provider JSON error even with a successful HTTP status", async () => {
  const fetchImpl = (async () =>
    Response.json({ error: "secret-provider-error" })) as typeof fetch;
  await expect(
    searchReferences("Gothic", "either", { apiKey: "test-secret", fetchImpl }),
  ).rejects.toMatchObject({ code: "SEARCH_FAILED" });
});
