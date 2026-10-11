import { AppError } from "./errors";
import type { ReferenceImage, ReferenceSearchResult, Style } from "./types";

const QUOTA_NOTICE =
  "SerpApi searches are exhausted. Switched to Openverse search; matches may be less specific.";
const LIMIT_NOTICE =
  "SerpApi reached a search limit. Switched to Openverse search; matches may be less specific.";

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

export function normalizeOpenverseResults(payload: unknown): ReferenceImage[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("results" in payload) ||
    !Array.isArray(payload.results)
  )
    return [];
  const seen = new Set<string>();
  const references: ReferenceImage[] = [];
  for (const raw of payload.results) {
    if (!raw || typeof raw !== "object" || raw.mature !== false) continue;
    const imageUrl = httpsUrl(raw.url);
    const sourceUrl = httpsUrl(raw.foreign_landing_url);
    const licenseKey =
      typeof raw.license === "string" ? raw.license.toLowerCase() : "";
    if (
      !imageUrl ||
      !sourceUrl ||
      seen.has(imageUrl) ||
      !["cc0", "pdm", "by", "by-sa"].includes(licenseKey)
    )
      continue;
    seen.add(imageUrl);
    const version =
      typeof raw.license_version === "string"
        ? raw.license_version.slice(0, 20)
        : "";
    const license = `${licenseKey === "pdm" ? "Public Domain Mark" : licenseKey === "cc0" ? "CC0" : `CC ${licenseKey.toUpperCase()}`}${version ? ` ${version}` : ""}`;
    references.push({
      id: `ref-${references.length + 1}`,
      title:
        typeof raw.title === "string" && raw.title.trim()
          ? raw.title.slice(0, 200)
          : "Outfit reference",
      sourceUrl,
      imageUrl,
      thumbnailUrl: httpsUrl(raw.thumbnail) ?? imageUrl,
      ...(typeof raw.creator === "string" && raw.creator.trim()
        ? { creator: raw.creator.slice(0, 200) }
        : {}),
      ...(httpsUrl(raw.creator_url)
        ? { creatorUrl: httpsUrl(raw.creator_url)! }
        : {}),
      license,
      ...(httpsUrl(raw.license_url)
        ? { licenseUrl: httpsUrl(raw.license_url)! }
        : {}),
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
): Promise<ReferenceSearchResult> {
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
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = () =>
    AbortSignal.any([
      AbortSignal.timeout(25_000),
      ...(options.signal ? [options.signal] : []),
    ]);
  let notice: string | undefined;
  try {
    const response = await fetchImpl(query, {
      signal: signal(),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (
      response.status !== 401 &&
      response.status !== 403 &&
      typeof data?.error === "string" &&
      /your account has run out of searches/i.test(data.error)
    )
      notice = QUOTA_NOTICE;
    else if (response.status === 429) notice = LIMIT_NOTICE;
    else if (!response.ok || data?.error || !data)
      throw new Error("Search provider failure");
    else return { references: normalizeSearchResults(data) };
    if (options.signal?.aborted) throw options.signal.reason;
    const fallback = new URL("https://api.openverse.org/v1/images/");
    fallback.search = new URLSearchParams({
      q: `${theme.trim().replace(/\s+/g, " ").toLowerCase()} fashion`,
      page_size: "12",
      mature: "false",
      license: "cc0,pdm,by,by-sa",
    }).toString();
    const openverseResponse = await fetchImpl(fallback, {
      signal: signal(),
      cache: "no-store",
    });
    if (!openverseResponse.ok) throw new Error("Fallback HTTP failure");
    const references = normalizeOpenverseResults(
      await openverseResponse.json(),
    );
    if (!references.length) throw new Error("No usable fallback references");
    return { references, notice };
  } catch (error) {
    if (options.signal?.aborted) throw options.signal.reason;
    if (error instanceof AppError) throw error;
    throw new AppError(
      "SEARCH_FAILED",
      notice
        ? `${notice} Openverse could not provide a usable image. Try again or upload a reference image.`
        : "Reference search failed. Try again or upload a reference image.",
      502,
    );
  }
}
