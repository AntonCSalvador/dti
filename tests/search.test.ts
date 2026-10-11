import { expect, it } from "vitest";
import { normalizeSearchResults, searchReferences } from "../src/lib/search";

it("normalizes attributed HTTPS image results and removes duplicates and unsafe URLs", () => {
  const result = normalizeSearchResults({
    images_results: [
      {
        title: "Runway look",
        link: "https://fashion.example/look",
        original: "https://images.example/look.jpg",
        thumbnail: "https://images.example/thumb.jpg",
      },
      {
        title: "Duplicate",
        link: "https://fashion.example/other",
        original: "https://images.example/look.jpg",
      },
      {
        title: "Unsafe",
        link: "javascript:alert(1)",
        original: "https://images.example/other.jpg",
      },
      { title: "Missing image", link: "https://fashion.example/look" },
    ],
  });
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    title: "Runway look",
    sourceUrl: "https://fashion.example/look",
    imageUrl: "https://images.example/look.jpg",
  });
});

it("distinguishes missing search configuration", async () => {
  await expect(
    searchReferences("Gothic", "either", { apiKey: "" }),
  ).rejects.toMatchObject({ code: "SEARCH_NOT_CONFIGURED" });
});

it("does not leak provider error bodies", async () => {
  const fetchImpl = (async () =>
    new Response("secret-provider-error", { status: 403 })) as typeof fetch;
  await expect(
    searchReferences("Gothic", "either", { apiKey: "test-secret", fetchImpl }),
  ).rejects.toThrow("Reference search failed");
});

it("handles a provider JSON error even with a successful HTTP status", async () => {
  const fetchImpl = (async () =>
    Response.json({ error: "secret-provider-error" })) as typeof fetch;
  await expect(
    searchReferences("Gothic", "either", { apiKey: "test-secret", fetchImpl }),
  ).rejects.toMatchObject({ code: "SEARCH_FAILED" });
});

const openverse = {
  results: [
    {
      title: "Old Hollywood dress",
      url: "https://images.example/dress.jpg",
      thumbnail: "https://images.example/thumb.jpg",
      foreign_landing_url: "https://source.example/dress",
      creator: "Ada Artist",
      creator_url: "https://source.example/ada",
      license: "by-sa",
      license_version: "4.0",
      license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
      mature: false,
    },
  ],
};

it("uses one unkeyed Openverse request after a SerpApi quota error", async () => {
  const calls: URL[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url);
    return calls.length === 1
      ? Response.json({ error: "Your account has run out of searches." })
      : Response.json(openverse);
  }) as typeof fetch;
  const result = await searchReferences("Hollywood", "feminine", {
    apiKey: "test-secret",
    fetchImpl,
  });
  expect(calls).toHaveLength(2);
  expect(calls[1].origin).toBe("https://api.openverse.org");
  expect(calls[1].href).not.toContain("test-secret");
  expect(calls[1].searchParams.get("page_size")).toBe("12");
  expect(calls[1].searchParams.get("mature")).toBe("false");
  expect(calls[1].searchParams.get("q")).toBe("hollywood fashion");
  expect(calls[1].searchParams.get("license")).toBe("cc0,pdm,by,by-sa");
  expect(result.notice).toContain("SerpApi searches are exhausted");
  expect(result.references[0]).toMatchObject({
    imageUrl: "https://images.example/dress.jpg",
    sourceUrl: "https://source.example/dress",
    creator: "Ada Artist",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  });
});

it("calls a generic 429 a search limit without claiming exhausted credits", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    return calls === 1
      ? new Response(null, { status: 429 })
      : Response.json(openverse);
  }) as typeof fetch;
  const result = await searchReferences("Gothic", "either", {
    apiKey: "test",
    fetchImpl,
  });
  expect(result.notice).toContain("search limit");
  expect(result.notice).not.toContain("exhausted");
  expect(calls).toBe(2);
});

it("recognizes a quota error in a non-success JSON response", async () => {
  let calls = 0;
  const result = await searchReferences("Gothic", "either", {
    apiKey: "test",
    fetchImpl: (async () =>
      ++calls === 1
        ? Response.json(
            { error: "Your account has run out of searches." },
            { status: 400 },
          )
        : Response.json(openverse)) as typeof fetch,
  });
  expect(calls).toBe(2);
  expect(result.notice).toContain("searches are exhausted");
});

it("does not fall back for unrelated failures or normal empty results", async () => {
  for (const response of [
    new Response(null, { status: 401 }),
    new Response(null, { status: 403 }),
    new Response(null, { status: 500 }),
    Response.json({ error: "Invalid API key" }),
  ]) {
    let calls = 0;
    await expect(
      searchReferences("Gothic", "either", {
        apiKey: "test",
        fetchImpl: (async () => {
          calls++;
          return response;
        }) as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "SEARCH_FAILED" });
    expect(calls).toBe(1);
  }
  let calls = 0;
  const result = await searchReferences("Gothic", "either", {
    apiKey: "test",
    fetchImpl: (async () => {
      calls++;
      return Response.json({ images_results: [] });
    }) as typeof fetch,
  });
  expect(result).toEqual({ references: [] });
  expect(calls).toBe(1);
});

it("filters unsafe, mature, unlicensed, and duplicate Openverse images", async () => {
  const results = [
    openverse.results[0],
    { ...openverse.results[0], title: "duplicate" },
    { ...openverse.results[0], url: "http://images.example/insecure.jpg" },
    {
      ...openverse.results[0],
      url: "https://images.example/mature.jpg",
      mature: true,
    },
    {
      ...openverse.results[0],
      url: "https://images.example/nc.jpg",
      license: "by-nc",
    },
    {
      ...openverse.results[0],
      url: "https://images.example/no-source.jpg",
      foreign_landing_url: "javascript:alert(1)",
    },
  ];
  let calls = 0;
  const result = await searchReferences("Gothic", "either", {
    apiKey: "test",
    fetchImpl: (async () =>
      ++calls === 1
        ? Response.json({ error: "Your account has run out of searches." })
        : Response.json({ results })) as typeof fetch,
  });
  expect(result.references).toHaveLength(1);
});

it("retains fallback notice when fallback has no usable images or fails", async () => {
  for (const response of [
    Response.json({ results: [] }),
    new Response(null, { status: 500 }),
  ]) {
    let calls = 0;
    await expect(
      searchReferences("Gothic", "either", {
        apiKey: "test",
        fetchImpl: (async () =>
          ++calls === 1
            ? Response.json({ error: "Your account has run out of searches." })
            : response) as typeof fetch,
      }),
    ).rejects.toThrow(/SerpApi searches are exhausted/);
    expect(calls).toBe(2);
  }
});

it("does not request fallback after cancellation", async () => {
  const controller = new AbortController();
  let calls = 0;
  await expect(
    searchReferences("Gothic", "either", {
      apiKey: "test",
      signal: controller.signal,
      fetchImpl: (async () => {
        calls++;
        controller.abort();
        throw controller.signal.reason;
      }) as typeof fetch,
    }),
  ).rejects.toBeDefined();
  expect(calls).toBe(1);
});
