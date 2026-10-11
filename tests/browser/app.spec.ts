import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Catalog } from "../../src/lib/types";

const catalog: Catalog = JSON.parse(readFileSync("data/catalog.json", "utf8"));
const item = catalog.items.find(
  (i) =>
    i.bodyTypes.includes("female") &&
    i.colorSlots.some((s) => !s.id.includes(":")),
)!;
const fixture = {
  looks: [
    {
      title: "Test outfit",
      referenceId: "r1",
      body: "female",
      why: "Browser test fixture, not a live recommendation.",
      compromises: ["Test fixture"],
      pieces: [
        {
          itemId: item.id,
          toggleId: null,
          colors: [
            {
              slotId: item.colorSlots.find((s) => !s.id.includes(":"))!.id,
              hex: "#123456",
            },
          ],
          note: "Equip this piece first.",
          essential: true,
        },
      ],
    },
  ],
  references: [
    {
      id: "r1",
      title: "Test reference",
      imageUrl: item.imageUrl,
      thumbnailUrl: item.imageUrl,
      sourceUrl: item.sourceUrl,
    },
  ],
  warnings: ["Test data only."],
};

test("real endpoint accepts same-origin browser requests", async ({ page }) => {
  await page.goto("/");
  // Invalid input exercises the actual route without spending provider credits.
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: "", style: "either", body: "female" }),
    });
    return { status: response.status, body: await response.json() };
  });
  expect(result.status).toBe(400);
  expect(result.body.error.code).toBe("INVALID_REQUEST");
});

test("theme, catalog filters, setup guidance, and responsive layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What’s the theme?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Find looks", exact: true }).click();
  await expect(page.locator(".error-message")).toContainText("Enter the round");
  await page
    .getByRole("button", { name: "Old Hollywood", exact: true })
    .click();
  await expect(page.getByLabel("Round theme")).toHaveValue("Old Hollywood");
  await page.getByRole("button", { name: "Setup and about" }).click();
  await expect(
    page.getByRole("heading", { name: "Connect your stylist" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close setup" }).click();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page
    .getByRole("button", { name: "Free wardrobe", exact: true })
    .click();
  await page.getByLabel("Search wardrobe").fill("Visor");
  await expect(page.locator(".catalog-item")).toHaveCount(1);
  await page.getByLabel("Avatar body").selectOption("male");
  await expect(page.locator(".catalog-item")).toHaveCount(1);
  await page.getByLabel("Search wardrobe").fill("no-item-matches-this-query");
  await expect(
    page.getByText("No items match.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Your looks", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("results open a usable dressing checklist", async ({ page }) => {
  await page.route("**/api/recommend", (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.goto("/");
  await page.getByLabel("Round theme").fill("Runway");
  await page.getByRole("button", { name: "Find looks", exact: true }).click();
  await page.getByRole("button", { name: "Build this look" }).click();
  await expect(
    page.getByRole("heading", { name: "Your dressing checklist" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await expect(
    page.getByText("Everything is on.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset checklist" }).click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.screenshot({ path: "test-results/checklist.png", fullPage: true });
});

test("fallback notice and image attribution persist into the checklist", async ({
  page,
}) => {
  await page.route("**/api/recommend", (route) =>
    route.fulfill({
      json: {
        ...fixture,
        searchNotice:
          "SerpApi searches are exhausted. Switched to Openverse search; matches may be less specific.",
        references: [
          {
            ...fixture.references[0],
            creator: "Ada Artist",
            creatorUrl: "https://source.example/ada",
            license: "CC BY-SA 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Round theme").fill("Runway");
  await page.getByRole("button", { name: "Find looks", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "SerpApi searches are exhausted" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ada Artist" })).toHaveAttribute(
    "href",
    "https://source.example/ada",
  );
  await page.getByRole("button", { name: "Build this look" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "SerpApi searches are exhausted" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "CC BY-SA 4.0" }),
  ).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
  await page.screenshot({ path: "test-results/fallback.png", fullPage: true });
});

test("cancel preserves the theme and suppresses late results", async ({
  page,
}) => {
  let finish: (() => void) | undefined;
  await page.route("**/api/recommend", async (route) => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    await route.fulfill({ json: fixture }).catch(() => {});
  });
  await page.goto("/");
  await page.getByLabel("Round theme").fill("Gothic");
  await page.getByRole("button", { name: "Find looks", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cancel search" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel search" }).click();
  finish?.();
  await expect(page.getByLabel("Round theme")).toHaveValue("Gothic");
  await expect(page.getByRole("heading", { name: "Test outfit" })).toHaveCount(
    0,
  );
});

test("upload errors and provider errors give actionable feedback", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.locator(".error-message")).toContainText("Choose a JPEG");
  await page.route("**/api/recommend", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "Add your OpenRouter API key in setup." } },
    }),
  );
  await page.getByLabel("Round theme").fill("Gothic");
  await page.getByRole("button", { name: "Find looks", exact: true }).click();
  await expect(page.locator(".error-message")).toContainText(
    "OpenRouter API key",
  );
});

test("provider and page key follow the selected request and clear on switch or reload", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/recommend", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: fixture });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Setup and about" }).click();
  const provider = page.getByLabel("AI provider");
  const key = page.getByLabel("OpenRouter API key (optional)");
  await expect(provider).toHaveValue("openrouter");
  await key.fill("router-page-key");
  await expect(key).toHaveAttribute("type", "password");
  await page.getByLabel("Round theme").fill("Gothic");
  await page.getByRole("button", { name: "Find looks", exact: true }).click();
  expect(requests.at(-1)).toMatchObject({
    provider: "openrouter",
    apiKey: "router-page-key",
  });
  await provider.selectOption("openai");
  await expect(page.getByLabel("OpenAI API key (optional)")).toHaveValue("");
  await page.getByLabel("OpenAI API key (optional)").fill("openai-page-key");
  await page.getByRole("button", { name: "Find looks", exact: true }).click();
  expect(requests.at(-1)).toMatchObject({
    provider: "openai",
    apiKey: "openai-page-key",
  });
  await page.getByRole("button", { name: "Clear API key" }).click();
  await page.getByRole("button", { name: "Find looks", exact: true }).click();
  expect(requests.at(-1)).toMatchObject({ provider: "openai" });
  expect(requests.at(-1)).not.toHaveProperty("apiKey");
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.reload();
  await page.getByRole("button", { name: "Setup and about" }).click();
  await expect(page.getByLabel("AI provider")).toHaveValue("openrouter");
  await expect(page.getByLabel("OpenRouter API key (optional)")).toHaveValue(
    "",
  );
});
