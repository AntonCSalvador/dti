import { describe, expect, it } from "vitest";
import { validateRecipes } from "../src/lib/validate-recipes";
import { inputSchema } from "../src/lib/schemas";
import type { CatalogItem, Recipe, ReferenceImage } from "../src/lib/types";

const item: CatalogItem = {
  id: "dress",
  name: "Basic Dress",
  category: "Dress/Skirt",
  sourceUrl: "https://example.com/visor",
  imageUrl: "https://example.com/visor.png",
  bodyTypes: ["female", "male"],
  description: "A visor",
  colorSlots: [
    { id: "1", label: "Visor", defaultHex: "#c1c1c1", patterns: true },
  ],
  toggles: [{ id: "1", label: "Clear", imageUrl: null }],
  location: null,
  sourceCheckedAt: "2026-10-10",
  eligibility: "standard-free",
};
const reference: ReferenceImage = {
  id: "ref-1",
  title: "Look",
  sourceUrl: "https://example.com/look",
  imageUrl: "https://example.com/look.jpg",
  thumbnailUrl: "https://example.com/look.jpg",
};
function recipe(): Recipe {
  return {
    title: "Sporty visor",
    referenceId: "ref-1",
    body: "female",
    why: "Matches the shape",
    compromises: ["Illustrative test outfit"],
    pieces: [
      {
        itemId: "dress",
        toggleId: "1",
        colors: [{ slotId: "1", hex: "#112233" }],
        note: "Wear first",
        essential: true,
      },
    ],
  };
}

describe("recipe validation", () => {
  it("preserves a recipe using actual compatible IDs and customization options", () => {
    expect(
      validateRecipes([recipe()], [item], [reference], "female").looks,
    ).toEqual([recipe()]);
  });
  it.each([
    [
      "unknown item",
      (r: Recipe) => {
        r.pieces[0].itemId = "invented";
      },
    ],
    [
      "unknown reference",
      (r: Recipe) => {
        r.referenceId = "invented";
      },
    ],
    [
      "wrong body",
      (r: Recipe) => {
        r.body = "male";
      },
    ],
    [
      "unknown toggle",
      (r: Recipe) => {
        r.pieces[0].toggleId = "invented";
      },
    ],
    [
      "unknown region",
      (r: Recipe) => {
        r.pieces[0].colors[0].slotId = "999";
      },
    ],
    [
      "invalid color",
      (r: Recipe) => {
        r.pieces[0].colors[0].hex = "pink";
      },
    ],
    [
      "empty recipe",
      (r: Recipe) => {
        r.pieces = [];
      },
    ],
    [
      "duplicate item",
      (r: Recipe) => {
        r.pieces.push(r.pieces[0]);
      },
    ],
    [
      "duplicate color region",
      (r: Recipe) => {
        r.pieces[0].colors.push(r.pieces[0].colors[0]);
      },
    ],
  ])("rejects the whole recipe for %s", (_name, mutate) => {
    const r = recipe();
    mutate(r);
    const result = validateRecipes([r], [item], [reference], "female");
    expect(result.looks).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it("rejects undocumented compatibility and unconfirmed eligibility", () => {
    expect(
      validateRecipes(
        [recipe()],
        [{ ...item, bodyTypes: [] }],
        [reference],
        "female",
      ).looks,
    ).toEqual([]);
    expect(
      validateRecipes(
        [recipe()],
        [{ ...item, eligibility: "needs-review" }],
        [reference],
        "female",
      ).looks,
    ).toEqual([]);
  });
  it("does not discard another valid look when one recipe is invalid", () => {
    const invalid = recipe();
    invalid.referenceId = "fake";
    expect(
      validateRecipes([invalid, recipe()], [item], [reference], "female").looks,
    ).toHaveLength(1);
  });
  it("requires a color region's variant to match the selected toggle", () => {
    const variantItem = {
      ...item,
      colorSlots: [
        {
          id: "Roses:1",
          label: "Roses / Paper",
          defaultHex: null,
          patterns: true,
        },
        {
          id: "Flowers:1",
          label: "Flowers / Paper",
          defaultHex: null,
          patterns: true,
        },
      ],
      toggles: [
        { id: "Roses:Default", label: "Roses / Default", imageUrl: null },
      ],
    };
    const r = recipe();
    r.pieces[0].toggleId = "Roses:Default";
    r.pieces[0].colors[0].slotId = "Flowers:1";
    expect(
      validateRecipes([r], [variantItem], [reference], "female").looks,
    ).toHaveLength(0);
    r.pieces[0].colors[0].slotId = "Roses:1";
    expect(
      validateRecipes([r], [variantItem], [reference], "female").looks,
    ).toHaveLength(1);
    r.pieces[0].toggleId = null;
    expect(
      validateRecipes([r], [variantItem], [reference], "female").looks,
    ).toHaveLength(0);
  });
  it("rejects accessory-only and incomplete separates, accepts top plus bottom", () => {
    expect(
      validateRecipes(
        [recipe()],
        [{ ...item, name: "Visor", category: "Headwear" }],
        [reference],
        "female",
      ).looks,
    ).toHaveLength(0);
    const top = { ...item, name: "Shirt", category: "Top" };
    const bottom = { ...item, id: "pants", name: "Pants", category: "Bottom" };
    expect(
      validateRecipes([recipe()], [top], [reference], "female").looks,
    ).toHaveLength(0);
    const r = recipe();
    r.pieces.push({ ...r.pieces[0], itemId: "pants" });
    expect(
      validateRecipes([r], [top, bottom], [reference], "female").looks,
    ).toHaveLength(1);
  });
});

describe("request input", () => {
  const base = { theme: "  Old Hollywood  ", style: "either", body: "male" };
  it("trims the theme", () => {
    expect(inputSchema.parse(base).theme).toBe("Old Hollywood");
  });
  it.each([
    { theme: " " },
    { theme: "a".repeat(161) },
    { style: "random" },
    { body: "either" },
    { imageDataUrl: "https://localhost/private" },
  ])("rejects invalid input %j", (change) => {
    expect(inputSchema.safeParse({ ...base, ...change }).success).toBe(false);
  });
  it("rejects SVG and oversized uploads", () => {
    expect(
      inputSchema.safeParse({
        ...base,
        imageDataUrl: "data:image/svg+xml;base64,AAAA",
      }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({
        ...base,
        imageDataUrl: "data:image/png;base64," + "A".repeat(6_000_000),
      }).success,
    ).toBe(false);
  });
});
