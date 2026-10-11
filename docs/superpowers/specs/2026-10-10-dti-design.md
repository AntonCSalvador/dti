# Dress To Impress companion design

Date: 2026-10-10

## Objective

Help a player quickly choose and assemble a recognizable, theme-appropriate outfit using standard/free items. V1 supplies instructions; the player dresses the avatar manually. Winning is an intended benefit, not a guaranteed outcome.

## Agreed scope

- Live reference search backed by a prepared item catalog.
- Theme entered as text.
- Support feminine and masculine outfits, with an either option.
- Only standard/free items available without VIP, purchases, codes, or event unlocks.
- Recoloring and item toggles are part of matching, rather than treating default item images as the only possible appearance.
- Roblox desktop automation is a v2 release.

## User experience

1. Enter a theme and select outfit styling. Track the avatar body separately where needed to enforce item compatibility; styling alone does not establish compatibility.
2. Retrieve relevant visual references, including celebrity looks, characters, and fashion imagery as appropriate to the theme.
3. Evaluate candidates against the available catalog before selecting a reference to recreate.
4. Return up to three achievable looks, showing each reference image, source link, theme explanation, and significant compromises.
5. Open a look to see a dressing checklist: item thumbnails and names, verified locations, chosen toggles, per-region colors, and assembly order. Put recognizable essentials before optional details.
6. Follow the checklist manually in Roblox.

If fewer than three supported looks exist, return fewer results with an explanation instead of inventing items or availability.

## Prepared catalog

Each entry records a stable ID, name, category, source URL, item images, standard/free eligibility, avatar compatibility, shape and garment attributes, documented toggles, recolorable regions, supported patterns/materials when known, location when verified, and verification date.

Keep unknown attributes explicit. A documented toggle count is not enough to claim the visual effect of every toggle. Unverified layering combinations must be described as suggestions requiring in-game checking.

The supplied wiki and related item pages are starting sources. Direct page access failed during initial research, although search results exposed item descriptions. Catalog acquisition and completeness must be validated before implementation depends on them. Do not claim that the prepared catalog already exists.

Refresh catalog data outside the round-time request path. Preserve source provenance and distinguish verified entries from candidates awaiting review.

## Recommendation flow

- Reference search retrieves actual images with their source links.
- Visual analysis identifies silhouette, garment lengths, necklines, sleeves, texture, accessories, and distinctive color regions.
- Catalog retrieval finds plausible items and documented variants, prioritizing structural similarity over default color.
- Outfit composition chooses compatible items, proposes colors per supported region, and identifies gaps.
- Ranking considers theme fit, recognizability, achievable similarity, and assembly effort. Scores are comparative estimates, not measured win probabilities.
- Output validation requires every recommended item ID to resolve to an eligible catalog entry. Unsupported variants, color regions, and incompatible items must not be presented as verified instructions.

## Component boundaries

- Catalog preparation: import and review source data; produce the searchable catalog.
- Reference search: retrieve candidate images and source metadata for a theme.
- Outfit matching: combine image understanding with constrained catalog retrieval and composition.
- Recipe validation: check inventory eligibility and supported item attributes.
- Browser companion: collect input and display references and manual dressing recipes.

Service credentials belong on the server, outside version control. Specific providers and application framework will be selected during implementation planning.

## Failure behavior

- Search unavailable: show an actionable retry message and allow a user-supplied reference image as an alternate input.
- No feasible reference: explain the limiting garment or inventory gap and offer a simpler interpretation when supported.
- Missing catalog details: identify what needs in-game checking instead of inventing instructions.
- Unavailable source image: retain attribution and clearly show that the image cannot be loaded.
- Slow requests: show progress and allow cancellation; preserve the entered theme for retry.

## Validation

Check the complete flow on a small, varied set of themes across both outfit styles. Verify catalog eligibility, body compatibility, documented toggles and color regions, image provenance, and rendering of incomplete results. Manually assemble representative recipes in Roblox to assess combined silhouette, layering, and instruction clarity. Measure response and assembly time before setting performance claims.

## V2: Roblox desktop execution

Use a selected, validated recipe to control the Roblox desktop app: navigate, equip items, configure toggles and colors, then inspect screenshots and correct discrepancies. First validate the available control mechanism and its reliability in the actual game. Include visible progress and a stop control. This release is recorded as future scope and is not part of v1 implementation.
