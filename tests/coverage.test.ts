import { expect, it } from "vitest";
import { loadCatalog } from "../src/lib/catalog/load";
import { validateRecipes } from "../src/lib/validate-recipes";
import type { RecipePiece, ReferenceImage } from "../src/lib/types";

const catalog = loadCatalog();
const reference: ReferenceImage = {
  id: "ref",
  title: "Test",
  sourceUrl: null,
  imageUrl: "https://example.com/image.jpg",
  thumbnailUrl: "https://example.com/image.jpg",
};
function check(pieces: Pick<RecipePiece, "itemId" | "toggleId">[]) {
  return validateRecipes(
    [
      {
        title: "Test",
        referenceId: "ref",
        body: "female",
        why: "Test",
        compromises: [],
        pieces: pieces.map((piece) => ({
          ...piece,
          colors: [],
          note: "",
          essential: true,
        })),
      },
    ],
    catalog.items,
    [reference],
    "female",
  ).looks;
}

it("does not treat a dress's skirt-only toggle as full coverage", () => {
  expect(
    check([{ itemId: "shard-dress", toggleId: "Skirt_Only" }]),
  ).toHaveLength(0);
});

it("does not count flowers and a belt as top and bottom coverage", () => {
  expect(
    check([
      { itemId: "tropical-top-2026", toggleId: "Tropical_Top:Only_Flowers" },
      { itemId: "tropical-skirt-2026", toggleId: "Tropical_Skirt:Only_Belt" },
    ]),
  ).toHaveLength(0);
});

it("uses parent toggle groups when a dress becomes a top", () => {
  expect(
    check([{ itemId: "granny-dress", toggleId: "Top:3_(No_Waistband)" }]),
  ).toHaveLength(0);
});

it("allows a default full dress and a real top with a skirt-only dress", () => {
  expect(check([{ itemId: "shard-dress", toggleId: null }])).toHaveLength(1);
  expect(
    check([
      { itemId: "shard-dress", toggleId: "Skirt_Only" },
      { itemId: "tropical-top-2026", toggleId: null },
    ]),
  ).toHaveLength(1);
});
