import type { Body, Catalog, CatalogItem } from "../types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadCatalog(): Catalog {
  return JSON.parse(
    readFileSync(join(process.cwd(), "data", "catalog.json"), "utf8"),
  ) as Catalog;
}

export function eligibleItems(catalog: Catalog, body?: Body): CatalogItem[] {
  return catalog.items.filter(
    (item) =>
      item.eligibility === "standard-free" &&
      (!body || item.bodyTypes.includes(body)),
  );
}
