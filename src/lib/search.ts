import { AppError } from "./errors";
import type { ReferenceImage, Style } from "./types";

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function normalizeSearchResults(payload: unknown): ReferenceImage[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("images_results" in payload) ||
    !Array.isArray(payload.images_results)
  )
    return [];
  const seen = new Set<string>();
  const references: ReferenceImage[] = [];
  for (const raw of payload.images_results) {
    if (!raw || typeof raw !== "object") continue;
    const sourceUrl = httpsUrl(raw.link);
    const imageUrl = httpsUrl(raw.original);
    if (!sourceUrl || !imageUrl || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    references.push({
      id: `ref-${references.length + 1}`,
      title:
        typeof raw.title === "string"
          ? raw.title.slice(0, 200)
          : "Outfit reference",
      sourceUrl,
      imageUrl,
      thumbnailUrl: httpsUrl(raw.thumbnail) ?? imageUrl,
    });
    if (references.length === 6) break;
  }
  return references;
}

export async function searchReferences(
  theme: string,
  style: Style,
  options: {
    apiKey?: string;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<ReferenceImage[]> {
  const key = options.apiKey ?? process.env.SERPAPI_API_KEY;
  if (!key?.trim())
    throw new AppError(
      "SEARCH_NOT_CONFIGURED",
      "Live search needs a SerpApi key. Add it in .env.local, or upload a reference image.",
      503,
    );
  const query = new URL("https://serpapi.com/search.json");
  query.search = new URLSearchParams({
    engine: "google_images",
    q: `${theme} ${style === "either" ? "" : style} fashion full outfit reference`,
    safe: "active",
    hl: "en",
    api_key: key,
  }).toString();
  try {
    const signal = AbortSignal.any([
      AbortSignal.timeout(25_000),
      ...(options.signal ? [options.signal] : []),
    ]);
    const response = await (options.fetchImpl ?? fetch)(query, {
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Search HTTP failure");
    const data = await response.json();
    if (data?.error) throw new Error("Search provider failure");
    return normalizeSearchResults(data);
  } catch {
    if (options.signal?.aborted) throw options.signal.reason;
    throw new AppError(
      "SEARCH_FAILED",
      "Reference search failed. Try again or upload a reference image.",
      502,
    );
  }
}
