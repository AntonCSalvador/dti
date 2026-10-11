# dti — wardrobe studio

A local AI outfit companion for Dress To Impress. Type the theme, find visual references, and get a dressing checklist made from standard/free items. V1 helps you choose the outfit; you put it on in Roblox.

## Run locally

Requires Node.js 22 or newer.

```powershell
npm ci
npm run dev
```

Open [localhost:3000](http://127.0.0.1:3000). The prepared wardrobe works immediately, without API keys.

To enable outfit recommendations, create `.env.local` using `.env.example` as the template and set:

```dotenv
OPENAI_API_KEY=your_openai_key
SERPAPI_API_KEY=your_serpapi_key
OPENAI_MODEL=gpt-4.1
```

Restart the app after changing configuration. Keep real keys out of Git and chat. The app sends theme/reference imagery and catalog details to OpenAI for matching; SerpApi retrieves Google Images results. These services may charge for usage. An uploaded reference bypasses SerpApi but still requires OpenAI.

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

Live provider output quality and in-game outfit assembly have not yet been verified with real API keys and actual rounds. The browser tests use explicitly labeled fixtures inside the test runner; fixtures are not served by the application. Winning and perfect replication are not guaranteed.

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
