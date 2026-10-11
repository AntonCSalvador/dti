import { mkdir, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Catalog, CatalogItem } from "../src/lib/types";
import {
  parseIndex,
  parseItem,
  SOURCE_ORIGIN,
  SOURCE_URL,
} from "../src/lib/catalog/parse";

async function fetchPage(page: string): Promise<string> {
  const url = new URL("/api.php", SOURCE_ORIGIN);
  url.search = new URLSearchParams({
    action: "parse",
    page,
    prop: "text",
    format: "json",
  }).toString();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(25_000),
        headers: {
          "User-Agent":
            "DTI-Companion-Catalog/1.0 (personal reference catalog)",
        },
      });
      if (!response.ok) {
        if (response.status !== 429 && response.status < 500)
          throw new PermanentSourceError(`HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (payload.error)
        throw new PermanentSourceError(
          payload.error.info ?? payload.error.code,
        );
      const html = payload.parse?.text?.["*"];
      if (typeof html !== "string" || !html.trim())
        throw new PermanentSourceError("Missing parsed HTML");
      return html;
    } catch (error) {
      if (attempt === 1 || error instanceof PermanentSourceError) throw error;
      await new Promise((resolveRetry) => setTimeout(resolveRetry, 750));
    }
  }
  throw new Error("Source request failed");
}
class PermanentSourceError extends Error {}

export async function buildCatalog(
  fetchHtml: (page: string) => Promise<string>,
  checkedAt: string,
): Promise<Catalog> {
  const candidates = parseIndex(
    await fetchHtml("Dressing_Room/Standard/Items"),
  );
  if (!candidates.length)
    throw new Error(
      "Index contained no item cards; existing catalog retained.",
    );
  const warnings = [
    "Source-documented from the community wiki; not verified in-game. Availability and layouts may change.",
    "Only index-listed items whose detail page explicitly identifies a Core Item are eligible. Empty compatibility, color, toggle, or location fields mean undocumented, not confirmed absent.",
    "Toggle IDs and color-slot numbers follow the source page. Toggle-specific color remapping and precise room coordinates are not verified.",
  ];
  const results: (CatalogItem | null)[] = new Array(candidates.length).fill(
    null,
  );
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, candidates.length) }, async () => {
      while (cursor < candidates.length) {
        const i = cursor++;
        const candidate = candidates[i];
        const page = decodeURIComponent(
          new URL(candidate.sourceUrl).pathname.slice(6),
        );
        try {
          const item = parseItem(await fetchHtml(page), candidate, checkedAt);
          if (item.eligibility !== "standard-free") {
            warnings.push(
              `Excluded ${candidate.name}: permanent free/core status not established (${candidate.sourceUrl}).`,
            );
          } else {
            results[i] = item;
            if (!item.bodyTypes.length)
              warnings.push(
                `${candidate.name}: body compatibility undocumented; excluded from body-specific recommendations.`,
              );
          }
        } catch (error) {
          warnings.push(
            `Skipped ${candidate.name}: ${error instanceof Error ? error.message : "source unavailable"} (${candidate.sourceUrl}).`,
          );
        }
      }
    }),
  );
  const items = results.filter((item): item is CatalogItem => item !== null);
  if (!items.length)
    throw new Error("No usable items fetched; existing catalog retained.");
  return { sourceUrl: SOURCE_URL, importedAt: checkedAt, items, warnings };
}

async function main() {
  const catalog = await buildCatalog(fetchPage, new Date().toISOString());
  const directory = join(process.cwd(), "data");
  await mkdir(directory, { recursive: true });
  const temporary = join(directory, `catalog.${process.pid}.tmp`);
  // Generated import output; write only after a usable import, then replace atomically.
  await writeFile(temporary, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  await rename(temporary, join(directory, "catalog.json"));
  console.log(
    `Imported ${catalog.items.length} core items. Female: ${catalog.items.filter((i) => i.bodyTypes.includes("female")).length}; male: ${catalog.items.filter((i) => i.bodyTypes.includes("male")).length}.`,
  );
  console.log(
    `Source: ${catalog.sourceUrl}; checked ${catalog.importedAt}; warnings: ${catalog.warnings.length}.`,
  );
  for (const warning of catalog.warnings) console.log(warning);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
