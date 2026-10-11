# Search-credit fallback

User-approved scope: keep SerpApi first; if its search allowance is exhausted, use a free image source and inform the user. OpenAI remains the AI provider. No OpenRouter, key-entry UI, model change, or public hosting in this change.

## Design

- Use Openverse image search as the no-key fallback. A live read-only query returned results successfully. Keep source, creator, and license attribution with each fallback image.
- Detect SerpApi's documented exhausted-search error, including JSON errors on a successful HTTP status. HTTP 429 can also mean hourly throttling: describe an unspecified 429 as a search limit, not proof of exhausted credits.
- Do not fall back on invalid keys, unrelated provider errors, missing configuration, cancellations, or normal empty Google results.
- Search result carries references and an optional deterministic notice. Recommendation success carries that notice separately from AI-generated warnings. Errors after fallback retain the notice, so users know which search was attempted even if no outfit was produced.
- Show the notice above results/checklist using an accessible status message. Show image creator and license links wherever fallback reference images appear. Preserve the approved interface otherwise.
- One bounded fallback request, no retry loops, no extra paid calls, no new dependencies. Sanitize URLs and errors, exclude mature results, retain abort handling, and never forward the SerpApi key to Openverse.

## Tasks

- [x] Sol implementer: write failing search/fallback/integration tests; implement search result contract, Openverse normalization and quota routing, recommendation notice propagation, attribution, and browser coverage. Update README. Run focused tests and typecheck.
- [x] Luna spec reviewer: inspect requirements against diff, read-only; report missing or extra scope.
- [x] Sol quality reviewer: inspect trust boundaries, error/abort paths, and warning/attribution coverage after spec review passes.
- [x] Coordinator: verify tests, production build, browser behavior, and one live no-key fallback with simulated SerpApi quota exhaustion; inspect UI.

Verification: 67 unit tests and 6 browser tests passed; typecheck, build, and diff checks passed. Live Openverse returned six references with attribution while SerpApi's exhausted response was simulated (no paid request). No live AI recommendation was run. Both reviews passed; the quality review's README query-description correction was applied. Delivery uses the existing `feat/v1-companion` branch.

## Checks

Use injected fetch for provider boundaries: Google success makes one call; exhaustion makes exactly one additional Openverse call; 429 notice does not falsely claim credits; 401/403/500 and cancellation never fall back. Test malformed/empty/unsafe/mature fallback results, attribution, fallback failure, and warning survival through recommendation success/failure. Browser checks assert the notice and credit links on results and checklist. No paid provider calls or real secrets in fixtures/logs.

Sources: [SerpApi error semantics](https://serpapi.com/blog/fix-serpapi-errors-guide/), [Openverse client/API documentation](https://docs.openverse.org/packages/js/api_client/index.html).
