import {
  inputSchema,
  MAX_IMAGE_DATA_LENGTH,
  MAX_IMAGE_BYTES,
} from "@/lib/schemas";
import { loadCatalog } from "@/lib/catalog/load";
import { recommendOutfits } from "@/lib/recommend";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 180;

function jsonError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function isLocalSameOrigin(request: Request, origin: string) {
  try {
    const browserOrigin = new URL(origin);
    const internalUrl = new URL(request.url);
    // Next normalizes loopback URLs to localhost; Host retains the browser's
    // actual authority. Only local hosts are supported by this v1 server.
    return (
      browserOrigin.origin === origin &&
      browserOrigin.host === (request.headers.get("host") ?? internalUrl.host) &&
      browserOrigin.protocol === internalUrl.protocol &&
      ["localhost", "127.0.0.1", "[::1]"].includes(browserOrigin.hostname)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !isLocalSameOrigin(request, origin))
    return jsonError(
      "FORBIDDEN",
      "Open this app directly to request looks.",
      403,
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return jsonError("INVALID_REQUEST", "Send a JSON request.", 415);
  const limit = MAX_IMAGE_DATA_LENGTH + 4096;
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    return jsonError("TOO_LARGE", "Choose an image under 4 MB.", 413);
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return jsonError("INVALID_REQUEST", "Enter a theme first.", 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) {
        await reader.cancel();
        return jsonError("TOO_LARGE", "Choose an image under 4 MB.", 413);
      }
      chunks.push(value);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return jsonError(
        "INVALID_REQUEST",
        "The request couldn't be read. Try again.",
        400,
      );
    }
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success)
      return jsonError(
        "INVALID_REQUEST",
        parsed.error.issues[0]?.message ?? "Check your inputs.",
        400,
      );
    if (parsed.data.imageDataUrl) {
      const bytes = Buffer.from(
        parsed.data.imageDataUrl.split(",")[1],
        "base64",
      );
      const png = bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp =
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP";
      const mimeMatches =
        (png && parsed.data.imageDataUrl.startsWith("data:image/png;")) ||
        (jpeg && parsed.data.imageDataUrl.startsWith("data:image/jpeg;")) ||
        (webp && parsed.data.imageDataUrl.startsWith("data:image/webp;"));
      if (bytes.length > MAX_IMAGE_BYTES || !mimeMatches)
        return jsonError(
          "INVALID_IMAGE",
          "Choose a valid JPEG, PNG, or WebP image under 4 MB.",
          400,
        );
    }
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(160_000),
    ]);
    const result = await recommendOutfits(parsed.data, loadCatalog(), signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AppError)
      return jsonError(error.code, error.message, error.status);
    if (
      error instanceof Error &&
      ["AbortError", "TimeoutError"].includes(error.name)
    )
      return jsonError(
        "TIMEOUT",
        "The request stopped or took too long. Try again.",
        504,
      );
    return jsonError(
      "REQUEST_FAILED",
      "We couldn't prepare your looks. Try again.",
      500,
    );
  }
}
