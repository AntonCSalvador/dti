import { describe, expect, it } from "vitest";
import { parseIndex, parseItem } from "../src/lib/catalog/parse";
import { eligibleItems } from "../src/lib/catalog/load";
import { buildCatalog } from "../scripts/import-catalog";

// Reduced markup from the live MediaWiki parse response (Visor, 2026-10-10).
const image =
  "https://static.wikia.nocookie.net/dti-dress-to-impress/images/d/df/Visor.png/revision/latest/scale-to-width-down/268";
const card = (name: string) =>
  `<div style="vertical-align:top;text-align:center;width:170px"><div><figure><a href="/wiki/${name}" title="${name}"><img src="data:image/gif;base64,placeholder" data-src="${image}"></a></figure></div><div><b><a href="/wiki/${name}">${name}</a></b></div></div>`;
const index = `<div class="mw-parser-output"><a href="/wiki/Updates">Updates</a><img src="/icon.png"><div class="wds-tab__content"><h3><span class="mw-headline">★ Update Showcase ★</span></h3>${card("New_Item")}</div><div class="wds-tab__content"><h3><span class="mw-headline">Headwear</span></h3>${card("Visor")}${card("Visor")}<figure><a href="/wiki/File:Icon.png"><img src="/icon.png"></a></figure></div></div>`;
const detail = `<div class="mw-parser-output"><aside class="portable-infobox"><figure class="pi-image"><img src="${image}"></figure><table class="pi-horizontal-group"><thead><tr><th>Item Status</th><th>Location</th></tr></thead><tbody><tr><td class="pi-data-value">🟢Core Item</td><td class="pi-data-value">Dressing Room</td></tr></tbody></table><table><tr><td class="pi-data-value"><b>Female</b><span>✔</span></td><td class="pi-data-value"><b>Male</b><span>✔</span></td></tr></table><div class="wds-tabber"><li class="wds-tabs__tab">2025</li></div></aside><p>The <b>Visor</b> is an Accessory Item in Dress to Impress.</p><table class="fandom-table"><tr><th colspan="4"><span id="Colors">Colors</span>2 color options.</th></tr><tr><th>No.</th><th>Part</th><th>Default Color</th><th>Patterns &amp; Materials</th></tr><tr><td>1</td><td>Visor</td><td>#c1c1c1</td><td>✔</td></tr><tr><td>2</td><td>Clear Section</td><td>#72c1a7</td><td>✖</td></tr></table><div class="toggle-tabber"><div class="tabber wds-tabber"><div class="wds-tabs__wrapper"><ul><li class="wds-tabs__tab" data-hash="1">1</li></ul></div><div class="wds-tab__content"><div class="tabber wds-tabber"><div class="wds-tabs__wrapper"><ul><li class="wds-tabs__tab" data-hash="Clear">Clear</li></ul></div><div class="wds-tab__content"><div class="toggle-tabber-frame"><img data-src="${image}"></div></div></div></div></div></div></div>`;
const tabs = (labels: string[], panels: string[]) =>
  `<div class="wds-tabber"><div class="wds-tabs__wrapper"><ul>${labels.map((label) => `<li class="wds-tabs__tab" data-hash="${label}">${label}</li>`).join("")}</ul></div>${panels.map((panel) => `<div class="wds-tab__content">${panel}</div>`).join("")}</div>`;

describe("source catalog parsing", () => {
  it("keeps numeric tab labels when omitting them would make distinct toggles ambiguous", () => {
    const frame = `<div class="toggle-tabber-frame"><img src="${image}"></div>`;
    const html = `<div class="toggle-tabber">${tabs(["1", "2"], [tabs(["Default"], [frame]), tabs(["Default"], [frame])])}</div>`;
    const item = parseItem(html, parseIndex(index)[1], "today");
    expect(item.toggles.map((toggle) => toggle.label)).toEqual([
      "1 / Default",
      "2 / Default",
    ]);
  });
  it("preserves the label of a new panel when Old is the first tab (Classic Heels)", () => {
    const colors = (label: string) =>
      `<table><tr><th>No.</th><th>Part</th><th>Default Color</th></tr><tr><td>1</td><td>${label}</td><td>#123456</td></tr></table>`;
    const frame = `<div class="toggle-tabber-frame"><img src="${image}"></div>`;
    const html = tabs(
      ["Old", "New"],
      [
        colors("Obsolete"),
        colors("Shoe") +
          `<div class="toggle-tabber">${tabs(["Default"], [tabs(["Default", "Pointy"], [frame, frame])])}</div>`,
      ],
    );
    const item = parseItem(html, parseIndex(index)[1], "today");
    expect(item.colorSlots.map((slot) => [slot.id, slot.label])).toEqual([
      ["1", "Shoe"],
    ]);
    expect(item.toggles.map((toggle) => toggle.label)).toEqual([
      "Default / Default",
      "Default / Pointy",
    ]);
    expect(item.toggles.some((toggle) => /Old|New/.test(toggle.id))).toBe(
      false,
    );
  });
  it.each(["Summer 2026 Version", "Version 1", "Version 2", "#1", "#2"])(
    "excludes %s when the source explicitly provides a Current tab",
    (label) => {
      const colors = (part: string) =>
        `<table><tr><th>No.</th><th>Part</th><th>Default Color</th></tr><tr><td>1</td><td>${part}</td><td>#123456</td></tr></table>`;
      const item = parseItem(
        tabs(
          ["Current", label],
          [colors("Current part"), colors("Historical part")],
        ),
        parseIndex(index)[1],
        "today",
      );
      expect(item.colorSlots.map((slot) => slot.label)).toEqual([
        "Current part",
      ]);
    },
  );
  it.each(["History", "Gallery", "Old Versions"])(
    "excludes customization under a %s heading without discarding a later current section",
    (heading) => {
      const colors = (part: string) =>
        `<table><tr><th>No.</th><th>Part</th><th>Default Color</th></tr><tr><td>1</td><td>${part}</td><td>#123456</td></tr></table>`;
      const html = `<div class="mw-parser-output"><h2>${heading}</h2><div>${tabs(["Version 1"], [colors("Obsolete")])}</div><h2>Customization</h2>${colors("Current")}</div>`;
      expect(
        parseItem(html, parseIndex(index)[1], "today").colorSlots.map(
          (slot) => slot.label,
        ),
      ).toEqual(["Current"]);
    },
  );
  it("ignores old customization versions and distinguishes variant-specific color slots", () => {
    const colors = (label: string) =>
      `<table><tr><th>No.</th><th>Part</th><th>Default Color</th></tr><tr><td>1</td><td>${label}</td><td>#123456</td></tr></table>`;
    const html = tabs(
      ["Current", "Old"],
      [
        tabs(["Roses", "Flowers"], [colors("Paper"), colors("Leaves")]),
        colors("Obsolete"),
      ],
    );
    expect(parseItem(html, parseIndex(index)[1], "today").colorSlots).toEqual([
      {
        id: "Roses:1",
        label: "Roses / Paper",
        defaultHex: "#123456",
        patterns: null,
      },
      {
        id: "Flowers:1",
        label: "Flowers / Leaves",
        defaultHex: "#123456",
        patterns: null,
      },
    ]);
  });
  it("retains every nested toggle option, with meaningful parent labels", () => {
    const frame = `<div class="toggle-tabber-frame"><img src="${image}"></div>`;
    const html = `<div class="toggle-tabber">${tabs(["Top"], [tabs(["Long-Sleeve", "T-Shirt", "Only Sleeves"], [frame, frame, frame])])}</div>`;
    const item = parseItem(html, parseIndex(index)[1], "today");
    expect(item.toggles.map((t) => t.label)).toEqual([
      "Top / Long-Sleeve",
      "Top / T-Shirt",
      "Top / Only Sleeves",
    ]);
    expect(new Set(item.toggles.map((t) => t.id)).size).toBe(3);
  });
  it("refuses an empty index or empty usable import instead of replacing a good snapshot", async () => {
    await expect(buildCatalog(async () => "", "today")).rejects.toThrow(
      /index/i,
    );
    await expect(
      buildCatalog(
        async (page) =>
          page.includes("Standard/Items") ? index : "<p>Unknown</p>",
        "today",
      ),
    ).rejects.toThrow(/usable/i);
  });
  it("imports all item details, preserving warnings for failed source pages", async () => {
    const catalog = await buildCatalog(async (page) => {
      if (page.includes("Standard/Items")) return index;
      if (page === "New_Item") throw new Error("unavailable");
      return detail;
    }, "today");
    expect(catalog.items).toHaveLength(1);
    expect(catalog.items[0].name).toBe("Visor");
    expect(catalog.warnings.join(" ")).toContain("New_Item");
    expect(catalog.warnings.join(" ")).toContain("not verified in-game");
  });
  it("extracts item cards, real lazy image URLs, categories, and showcase provenance without navigation/icons or duplicates", () => {
    const items = parseIndex(index);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: "New_Item", showcase: true });
    expect(items[1]).toMatchObject({
      name: "Visor",
      imageUrl: image,
      category: "Headwear",
      showcase: false,
    });
  });
  it("extracts documented bodies, exact color regions, nested toggle labels, and location", () => {
    const item = parseItem(
      detail,
      parseIndex(index)[1],
      "2026-10-10T00:00:00Z",
    );
    expect(item).toMatchObject({
      bodyTypes: ["female", "male"],
      eligibility: "standard-free",
      location: "Dressing Room",
      imageUrl: image,
    });
    expect(item.colorSlots).toEqual([
      { id: "1", label: "Visor", defaultHex: "#C1C1C1", patterns: true },
      {
        id: "2",
        label: "Clear Section",
        defaultHex: "#72C1A7",
        patterns: false,
      },
    ]);
    expect(item.toggles).toEqual([
      { id: "1", label: "Clear", imageUrl: image },
    ]);
  });
  it("does not assume unknown bodies, colors, toggles or location", () => {
    const item = parseItem("<p>An item.</p>", parseIndex(index)[1], "today");
    expect(item.bodyTypes).toEqual([]);
    expect(item.colorSlots).toEqual([]);
    expect(item.toggles).toEqual([]);
    expect(item.location).toBeNull();
    expect(item.eligibility).toBe("needs-review");
  });
  it("requires explicit core status for showcase items and excludes restricted statuses", () => {
    const candidate = parseIndex(index)[0];
    expect(parseItem(detail, candidate, "today").eligibility).toBe(
      "standard-free",
    );
    expect(
      parseItem(
        detail.replace("🟢Core Item", "Limited Item"),
        candidate,
        "today",
      ).eligibility,
    ).toBe("needs-review");
    expect(
      parseItem(
        detail.replace("🟢Core Item", "VIP Item"),
        parseIndex(index)[1],
        "today",
      ).eligibility,
    ).toBe("needs-review");
  });
  it("does not confuse female with male or crosses with compatible bodies", () => {
    const item = parseItem(
      detail.replace("<b>Male</b><span>✔", "<b>Male</b><span>✖"),
      parseIndex(index)[1],
      "today",
    );
    expect(item.bodyTypes).toEqual(["female"]);
    const catalog = {
      items: [item],
      sourceUrl: "test",
      importedAt: "today",
      warnings: [],
    };
    expect(eligibleItems(catalog, "male")).toEqual([]);
    expect(eligibleItems(catalog, "female")).toEqual([item]);
  });
});
