import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/recommend/route";

afterEach(() => vi.unstubAllEnvs());
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
const input = {
  theme: "Gothic",
  style: "either",
  body: "male",
  provider: "openai",
};

it("rejects cross-origin requests before provider work", async () => {
  expect(
    (await POST(request(input, { Origin: "https://another.example" }))).status,
  ).toBe(403);
});
it("accepts the browser Host when Next normalizes a loopback URL", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const response = await POST(
    request(input, {
      Host: "127.0.0.1:3000",
      Origin: "http://127.0.0.1:3000",
    }),
  );
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("AI_NOT_CONFIGURED");
});
it("rejects non-local hosts and mismatched local origins", async () => {
  for (const headers of [
    { Host: "another.example", Origin: "http://another.example" },
    { Host: "127.0.0.1:3000", Origin: "http://localhost:3000" },
    { Host: "127.0.0.1:3000", Origin: "null" },
  ])
    expect((await POST(request(input, headers))).status).toBe(403);
});
it("rejects missing and malformed input", async () => {
  expect((await POST(request({ ...input, theme: " " }))).status).toBe(400);
});
it("reports absent AI configuration without leaking environment data", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const response = await POST(request(input));
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("AI_NOT_CONFIGURED");
});
it("rejects an image whose bytes do not match its declared type", async () => {
  expect(
    (
      await POST(
        request({ ...input, imageDataUrl: "data:image/png;base64,AAAA" }),
      )
    ).status,
  ).toBe(400);
});
it("enforces body-size limits before parsing", async () => {
  expect(
    (await POST(request(input, { "Content-Length": "7000000" }))).status,
  ).toBe(413);
});
