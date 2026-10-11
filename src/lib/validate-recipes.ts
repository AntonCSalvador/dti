import { recipeSchema } from "./schemas";
import type { Body, CatalogItem, Recipe, ReferenceImage } from "./types";

function coverage(
  item: CatalogItem | undefined,
  toggleId: string | null,
): "full" | "upper" | "lower" | "none" {
  if (!item) return "none";
  const toggle = item.toggles.find((entry) => entry.id === toggleId);
  const variants = (toggle?.label ?? "")
    .toLowerCase()
    .split("/")
    .map((part) => part.trim().replaceAll("_", " "))
    .reverse();
  for (const variant of variants) {
    if (/^(only )?(skirt|bottom|pants|shorts)( only)?$/.test(variant))
      return "lower";
    if (/^(only )?(top|shirt|bodice)( only)?$/.test(variant)) return "upper";
    if (/^(only )?(dress|abaya)( only)?$/.test(variant)) return "full";
    if (/\bonly\b|\ball off\b/.test(variant)) return "none";
  }
  if (item.category === "Dress/Skirt" && /\bdress\b|\babaya\b/i.test(item.name))
    return "full";
  if (item.category === "Top") return "upper";
  if (item.category === "Bottom" || item.category === "Dress/Skirt")
    return "lower";
  return "none";
}

export function validateRecipes(
  raw: unknown[],
  items: CatalogItem[],
  references: ReferenceImage[],
  body: Body,
) {
  const catalog = new Map(items.map((item) => [item.id, item]));
  const referenceIds = new Set(references.map((ref) => ref.id));
  const looks: Recipe[] = [];
  const warnings: string[] = [];
  for (const value of raw.slice(0, 3)) {
    const parsed = recipeSchema.safeParse(value);
    if (!parsed.success) {
      warnings.push(
        "An outfit was omitted because its instructions were incomplete.",
      );
      continue;
    }
    const look = parsed.data;
    const garments = look.pieces.map((piece) =>
      coverage(catalog.get(piece.itemId), piece.toggleId),
    );
    const fullBody = garments.includes("full");
    const upper = garments.includes("upper");
    const lower = garments.includes("lower");
    const seen = new Set<string>();
    const valid =
      look.body === body &&
      referenceIds.has(look.referenceId) &&
      (fullBody || (upper && lower)) &&
      look.pieces.length > 0 &&
      look.pieces.length <= 20 &&
      look.pieces.some((piece) => piece.essential) &&
      look.pieces.every((piece) => {
        const item = catalog.get(piece.itemId);
        if (
          !item ||
          seen.has(item.id) ||
          item.eligibility !== "standard-free" ||
          !item.bodyTypes.includes(body)
        )
          return false;
        seen.add(item.id);
        if (
          piece.toggleId !== null &&
          !item.toggles.some((toggle) => toggle.id === piece.toggleId)
        )
          return false;
        const slots = new Set<string>();
        return piece.colors.every((color) => {
          if (
            slots.has(color.slotId) ||
            !/^#[0-9a-fA-F]{6}$/.test(color.hex) ||
            !item.colorSlots.some((slot) => slot.id === color.slotId)
          )
            return false;
          const separator = color.slotId.lastIndexOf(":");
          if (separator >= 0) {
            const variant = color.slotId.slice(0, separator);
            if (
              !piece.toggleId ||
              !(
                piece.toggleId === variant ||
                piece.toggleId.startsWith(`${variant}:`)
              )
            )
              return false;
          }
          slots.add(color.slotId);
          return true;
        });
      });
    if (valid) looks.push(look);
    else
      warnings.push(
        "An outfit was omitted because its items or customization options could not be confirmed.",
      );
  }
  return { looks, warnings: [...new Set(warnings)] };
}
