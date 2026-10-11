import { expect, it } from "vitest";
import { buildVisionContent, prepareVisualCandidates } from "../src/lib/vision";
import type { CatalogItem, ReferenceImage } from "../src/lib/types";

it("supplies actual reference and item images to the visual comparison", () => {
  const ref: ReferenceImage = {
    id: "r",
    title: "Reference",
    sourceUrl: null,
    imageUrl: "data:image/png;base64,AAAA",
    thumbnailUrl: "data:image/png;base64,AAAA",
  };
  const item: CatalogItem = {
    id: "top",
    name: "Top",
    category: "Tops",
    sourceUrl: "https://example.com",
    imageUrl: "https://images.example/top.png",
    bodyTypes: ["male"],
    description: "shirt",
    colorSlots: [],
    toggles: [],
    location: null,
    sourceCheckedAt: "2026-10-10",
    eligibility: "standard-free",
  };
  const content = buildVisionContent(
    { theme: "Runway", body: "male", style: "either" },
    [ref],
    [item],
  );
  const images = content.filter((part) => part.type === "input_image");
  expect(images).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ image_url: ref.imageUrl }),
      expect.objectContaining({ image_url: item.imageUrl }),
    ]),
  );
  expect(
    content.some(
      (part) =>
        part.type === "input_text" && JSON.parse(part.text).id === "top",
    ),
  ).toBe(true);
});

it("only offers toggles whose preview images fit in the visual budget", () => {
  const item = {
    id: "shirt",
    name: "Shirt",
    category: "Top",
    sourceUrl: "https://example.com",
    imageUrl: "https://images.example/top.png",
    bodyTypes: ["male"],
    description: "shirt",
    colorSlots: [],
    toggles: Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      label: String(i),
      imageUrl: `https://images.example/toggle-${i}.png`,
    })),
    location: null,
    sourceCheckedAt: "2026-10-10",
    eligibility: "standard-free",
  } as CatalogItem;
  const candidates = prepareVisualCandidates([item], 2);
  expect(candidates[0].toggles).toHaveLength(2);
  const content = buildVisionContent(
    { theme: "Runway", body: "male", style: "either" },
    [],
    candidates,
  );
  for (const toggle of candidates[0].toggles)
    expect(content).toContainEqual(
      expect.objectContaining({
        type: "input_image",
        image_url: toggle.imageUrl,
      }),
    );
  expect(content).not.toContainEqual(
    expect.objectContaining({
      type: "input_image",
      image_url: item.toggles[4].imageUrl,
    }),
  );
});
