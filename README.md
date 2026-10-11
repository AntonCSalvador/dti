# dti — wardrobe studio

A local AI outfit companion for Dress To Impress. Type the theme, find visual references, and get a dressing checklist made from standard/free items. V1 helps you choose the outfit; you put it on in Roblox.

## Run locally

Requires Node.js 22 or newer.

```powershell
npm ci
npm run dev
```

Open [localhost:3000](http://127.0.0.1:3000). The prepared wardrobe works immediately, without API keys.

To enable outfit recommendations, create `.env.local` using `.env.example` as the template. OpenRouter is selected by default and uses its free model route:

```dotenv
OPENROUTER_API_KEY=your_openrouter_key
SERPAPI_API_KEY=your_serpapi_key
```

You can also use `OPENROUTER_KEY` and `SERP_KEY` as aliases. To use OpenAI, select it in setup and configure `OPENAI_API_KEY`; its model defaults to `gpt-4.1` and can be set with `OPENAI_MODEL`. Setup also accepts an optional key for the selected provider. That key stays in page memory, clears when you switch providers or reload, and is sent only with a look request. It is never saved to browser storage. Server keys stay on the server; the page receives only configured/not-configured flags. Restart the app after changing `.env.local`. Keep real keys out of Git and chat.

The selected AI provider receives your theme, reference imagery, and catalog details for matching. OpenRouter may route a request to an available free model provider; free model availability and quality vary. There is no automatic paid-model or cross-provider fallback. OpenAI usage may incur charges. SerpApi receives search themes and retrieves Google Images results; it may charge for usage. An uploaded reference bypasses SerpApi but still requires the selected AI provider.

If SerpApi reports exhausted searches or a search limit, the app makes one no-key request to [Openverse](https://openverse.org/) and tells you about the switch. Openverse searches openly licensed images, so matches may be less specific; creator, source, and license credits appear with each result. If Openverse fails or has no suitable images, try another theme or upload a reference. Missing or invalid SerpApi keys and unrelated search errors do not trigger the fallback. Openverse receives the theme plus the word "fashion," and its image hosts may receive requests when images are shown. Openverse needs no key or per-search fee; OpenAI usage still may cost money.

- [OpenRouter API keys](https://openrouter.ai/settings/keys)
- [OpenAI API setup](https://developers.openai.com/api/docs/quickstart)
- [SerpApi Google Images setup](https://serpapi.com/google-images-api)

For a local production build, run `npm run build`, then `npm start`. Both startup commands bind to `127.0.0.1`. Public hosting, accounts, and rate limiting are outside v1.

## What v1 does

- Separate theme, outfit style (feminine / masculine / either), and avatar-body inputs.
- Live reference search or a JPEG/PNG/WebP upload under 4 MB.
- Prepared catalog of 278 source-documented permanent core items: 266 support the female avatar, 187 the male avatar, and 175 both.
- Two-pass matching: consider the full compatible inventory, then visually compare shortlisted item and toggle images against reference photos.
- Up to three outfit recipes with actual item IDs, body compatibility, documented toggles, per-region hex colors, source links, and compromises.
- Manual dressing checklist with copyable colors, copy-recipe action, and completion tracking.
- A searchable free wardrobe, including categories and links to each item's documentation.
- Actionable configuration/error states, cancellation, and no mock recommendations in the live flow.

## Matching limits

The first pass shortlists up to 30 items. The second pass examines default images plus up to 48 toggle previews, distributed across candidates with at most four per item. Only examined toggles can appear in recommendations. This is a bounded search, not an exhaustive test of every outfit combination.

Validation rejects unknown items/references, incompatible bodies, unsupported toggles/color slots, mixed variant color regions, duplicate pieces, invalid colors, and missing basic garment coverage. Coverage is a conservative check for a named dress/abaya or top plus bottom/skirt; it is not a simulation of the dressed avatar. The model remains responsible for visual suitability. Layering, clipping, exact room placement, and current game availability still need in-game checking. Locations are generally documented as “Dressing Room,” not precise coordinates.

Free OpenRouter models may be unavailable, reject required structured parameters, or return an incomplete result. Try again later or select OpenAI with its own key. Live testing on October 11, 2026 confirmed structured-text connectivity but the full free-router recommendation returned no compatible endpoint (404). A separate vision probe described a linked wiki image as blank while correctly describing the same image sent inline. Reliable image delivery and free-model routing still need work; the default OpenRouter outfit flow is not yet verified end to end. In-game outfit assembly has not been verified with actual rounds. The browser tests use explicitly labeled fixtures inside the test runner; fixtures are not served by the application. Winning and perfect replication are not guaranteed.

## Refresh the catalog

```powershell
npm run catalog:import
```

The importer uses the community wiki's MediaWiki API, at most four concurrent detail requests, and one retry for transient failures. It excludes entries without explicit permanent core status, ignores historical item versions, preserves unknown fields, and writes the catalog only after a usable import. Inspect `data/catalog.json` warnings after refreshing. A partial import may contain fewer entries if individual detail requests fail.

Catalog metadata is adapted from the [Dress To Impress Wiki standard-item index](https://dti-dress-to-impress.fandom.com/wiki/Dressing_Room/Standard/Items) and linked item pages. Every item retains its source URL and source-check timestamp. Images remain linked to their original wiki hosts. This is community documentation, not in-game verification or official Roblox/DTI affiliation.

## Checks

```powershell
npm test
npm run typecheck
npm run build
npm run test:browser
```

Browser tests use installed Microsoft Edge by default and start their own local dev server. Unit tests cover parsing, historical versions, customization constraints, provider-result normalization, request validation, and visual payloads. Browser tests cover input, wardrobe filtering, uploads/errors, results, checklists, cancellation, and mobile overflow.

## V2: Roblox desktop automation

Use a chosen recipe to navigate the Roblox desktop app, equip items, apply toggles/colors, inspect screenshots, and correct the result. Validate desktop-control feasibility and reliability first. No game control is implemented in v1.

See the [approved design](docs/superpowers/specs/2026-10-10-dti-design.md) and [implementation plan](docs/superpowers/plans/2026-10-10-v1.md).
