# AI provider options implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Offer OpenRouter and OpenAI, default to free OpenRouter for testing, and accept page-memory API keys or private server environment keys.

**Architecture:** Reuse the OpenAI SDK Responses API with fixed provider URLs. Keep keys outside prompt data; no persistence, automatic paid fallback, or arbitrary provider endpoints. Preserve catalog validation, search fallback, cancellation, and local-only protection.

**Tech Stack:** Existing Next.js, React, OpenAI SDK, Zod, Vitest, Playwright. No new dependencies.

### Task 1: Provider integration and session credentials

Files: `src/lib/providers.ts` (small server configuration helper), `src/lib/types.ts`, `src/lib/schemas.ts`, `src/lib/recommend.ts`, `src/lib/search.ts`, `src/app/page.tsx`, `src/components/stylist.tsx`, relevant tests, `.env.example`, `README.md`.

- [ ] Add failing tests for provider enum, bounded optional key, env aliases, isolated provider routing, prompt non-disclosure, sanitized errors, and preserved fallback.
- [ ] Run `npm test` and confirm new assertions fail for missing behavior.
- [ ] Implement `AIProvider = "openrouter" | "openai"`; optional input provider defaults to OpenRouter; optional request `apiKey` is trimmed and limited to 512 printable non-whitespace characters. Explicit fields only in model prompts.
- [ ] Resolve request key before provider-specific env key; OpenRouter accepts `OPENROUTER_API_KEY` or `OPENROUTER_KEY`, OpenAI accepts `OPENAI_API_KEY`; SerpApi accepts `SERPAPI_API_KEY` or `SERP_KEY`. Never cross-provider fallback. Missing credentials fail before search.
- [ ] OpenRouter uses fixed `https://openrouter.ai/api/v1`, fixed `openrouter/free`, `provider: { require_parameters: true }`, `store: false`, existing bounded requests. OpenAI retains current default/model override. Validate structured output with existing schemas and recipes; sanitize auth/rate-limit/unavailable-provider failures without raw provider messages.
- [ ] Add accessible AI-provider select and masked optional key in setup. Hold key only in component memory; clear on provider change and explicit clear, never browser storage. Disable changes while running. Correct readiness and provider-specific privacy/cost instructions. Serialize only booleans from server page.
- [ ] Add browser checks for selection, outgoing selected provider/key, clear/switch/reload behavior, no browser storage persistence. Mock requests for automated tests so they never consume real credentials or quota.
- [ ] Run `npm test`, `npm run typecheck`, update example env and README including aliases, privacy, free-model availability limits, and no automatic paid fallback.

### Task 2: Verification and review

- [ ] Independent spec review; resolve findings, then independent code-quality review.
- [ ] Build and run browser tests; inspect desktop/mobile provider UI.
- [ ] Launch app with root `.env` loaded into process memory only; do not copy credentials or alter user file.
- [ ] Live OpenRouter + SerpApi test with actual catalog. Bound number of attempts; report actual successes and limitations, not merely mocked checks.
- [ ] Check Git ignores `.env`, diff contains no key values, and commit reviewed source only.

## Initial evidence

Root `.env` exists with nonempty `OPENROUTER_KEY` and `SERP_KEY`; Git ignores it. Free-router structured-output connectivity probe succeeded using Responses API. Full vision/outfit workflow not yet verified.

## Verification and handoff

Provider integration implemented; independent Luna spec review and Sol quality review passed. Fresh verification: 78 unit tests, 7 browser tests, TypeScript check, and production build passed. Desktop and mobile setup screenshots inspected; no horizontal overflow. App launched with root `.env` loaded into process memory using Node's `--env-file`; credentials were not copied into the worktree.

Live checks: free-router structured text passed. SerpApi search completed in the real recommendation pipeline, which then returned OpenRouter 404 (no compatible free endpoint). A direct free vision-model probe treated a linked wiki garment image as blank; sending the same image inline produced an accurate description. No end-to-end outfit success is claimed. These are follow-on integration tasks, not solved by mocked tests. No paid-model fallback was used.

Remaining: bounded, safe direct image delivery and reliable selection of an available free vision/structured-output model, followed by a successful full-catalog live test. Keep current feature branch/worktree; no merge to main.
