import { load } from "cheerio";
import type { AnyNode } from "domhandler";
import type { Body, CatalogItem, ColorSlot, ItemToggle } from "../types";
export interface IndexItem {
  name: string;
  sourceUrl: string;
  imageUrl: string | null;
  category: string;
  showcase: boolean;
}
export const SOURCE_ORIGIN = "https://dti-dress-to-impress.fandom.com";
export const SOURCE_URL = `${SOURCE_ORIGIN}/wiki/Dressing_Room/Standard/Items`;
const clean = (text: string) => text.replace(/\s+/g, " ").trim();
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function imageUrl(src?: string): string | null {
  if (!src) return null;
  try {
    const url = new URL(src, SOURCE_ORIGIN);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function parseIndex(html: string): IndexItem[] {
  const $ = load(html);
  const items = new Map<string, IndexItem>();
  // Item cards contain an image link and a separate bold caption with the same target.
  // This deliberately ignores the page's navigation links and category icons.
  $('figure a[href^="/wiki/"]').each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href")!;
    if (/\/(?:File|Category|Template|Special):/.test(href)) return;
    const card = anchor.closest("figure").parent().parent();
    const caption = card
      .find("b a")
      .filter((_, a) => $(a).attr("href") === href)
      .first();
    if (!caption.length) return;
    const section = card.closest(".wds-tab__content");
    const category = clean(section.find("h3 .mw-headline").first().text())
      .replace(/★/g, "")
      .trim();
    if (!category) return;
    const img = anchor.find("img").first();
    const candidate: IndexItem = {
      name: clean(caption.text()),
      sourceUrl: new URL(href, SOURCE_ORIGIN).href,
      imageUrl: imageUrl(img.attr("data-src")) ?? imageUrl(img.attr("src")),
      category,
      showcase: /update showcase/i.test(category),
    };
    // A permanent category listing is stronger evidence than a duplicate showcase card.
    if (!items.has(href) || !candidate.showcase) items.set(href, candidate);
  });
  return [...items.values()];
}

export function parseItem(
  html: string,
  candidate: IndexItem,
  checkedAt: string,
): CatalogItem {
  const $ = load(html);
  const historical = new Set<AnyNode>();
  const versionPanels = new Set<AnyNode>();
  // Keep the DOM intact: removing an earlier panel would shift its index relative
  // to the source tab labels (for example Classic Heels' Old, New ordering).
  $(".wds-tabber").each((_, tabber) => {
    const tabs = $(tabber)
      .children(".wds-tabs__wrapper")
      .find(".wds-tabs__tab");
    const labels = tabs.map((_, tab) => clean($(tab).text())).get();
    let current = labels.findIndex((label) => /^current$/i.test(label));
    if (current < 0 && labels.some((label) => /^old$/i.test(label)))
      current = labels.findIndex((label) => /^new$/i.test(label));
    const years =
      labels.length > 1 && labels.every((label) => /^20\d\d$/.test(label));
    if (years)
      current = labels.indexOf(String(Math.max(...labels.map(Number))));
    $(tabber)
      .children(".wds-tab__content")
      .each((i, panel) => {
        if (current >= 0) versionPanels.add(panel);
        if (
          (current >= 0 && i !== current) ||
          /^(old|previous|legacy)(\b|$)/i.test(labels[i] ?? "")
        )
          historical.add(panel);
      });
  });
  // Historical/gallery sections sometimes use arbitrary version labels rather
  // than Current/Old tabs. Headings scope through the next peer/ancestor heading.
  $("h1,h2,h3,h4,h5,h6").each((_, heading) => {
    const title = clean(
      $(heading).find(".mw-headline").text() || $(heading).text(),
    );
    if (!/^(history|gallery|old versions?|previous versions?)$/i.test(title))
      return;
    const rank = Number((heading as { tagName: string }).tagName.slice(1));
    for (const sibling of $(heading).nextAll().toArray()) {
      const tag = (sibling as { tagName?: string }).tagName ?? "";
      if (/^h[1-6]$/.test(tag) && Number(tag.slice(1)) <= rank) break;
      historical.add(sibling);
    }
  });
  const isHistorical = (node: AnyNode) =>
    [node, ...$(node).parents().toArray()].some((ancestor) =>
      historical.has(ancestor),
    );
  function tabPath(node: AnyNode) {
    return $(node)
      .parents(".wds-tab__content")
      .toArray()
      .reverse()
      .filter((panel) => !versionPanels.has(panel))
      .map((panel) => {
        const parent = $(panel).parent();
        const i = parent.children(".wds-tab__content").index(panel);
        const tab = parent
          .children(".wds-tabs__wrapper")
          .find(".wds-tabs__tab")
          .eq(i);
        return {
          id: clean(tab.attr("data-hash") ?? tab.text()),
          label: clean(tab.text()),
          count: parent.children(".wds-tab__content").length,
        };
      })
      .filter((part) => part.label);
  }
  const fields = new Map<string, string>();
  $(".portable-infobox .pi-horizontal-group").each((_, table) => {
    const headers = $(table).find("thead th");
    $(table)
      .find("tbody tr")
      .first()
      .children("td")
      .each((i, cell) => {
        const key = clean(headers.eq(i).text()).toLowerCase();
        if (key) fields.set(key, clean($(cell).text()));
      });
  });
  $(".portable-infobox .pi-data").each((_, field) => {
    fields.set(
      clean($(field).find(".pi-data-label").text()).toLowerCase(),
      clean($(field).find(".pi-data-value").text()),
    );
  });
  const bodyTypes: Body[] = [];
  for (const body of ["female", "male"] as const) {
    const documented = $(".portable-infobox .pi-data-value")
      .toArray()
      .some((cell) => {
        const text = clean($(cell).text());
        return new RegExp(`^${body}\\s*[✔✓✅]$`, "i").test(text);
      });
    if (documented) bodyTypes.push(body);
  }
  const colorSlots: ColorSlot[] = [];
  $("table")
    .filter((_, table) => {
      if (isHistorical(table)) return false;
      const headings = $(table)
        .find("th")
        .map((_, th) => clean($(th).text()))
        .get();
      return headings.includes("Part") && headings.includes("Default Color");
    })
    .each((_, table) => {
      const context = tabPath(table);
      $(table)
        .find("tr")
        .each((_, row) => {
          const cells = $(row).children("td");
          const id = clean(cells.eq(0).text());
          if (cells.length < 3 || !/^\d+$/.test(id)) return;
          const hex =
            clean(cells.eq(2).text())
              .match(/#[a-f0-9]{6}\b/i)?.[0]
              .toUpperCase() ?? null;
          const patternText = clean(cells.eq(3).text());
          colorSlots.push({
            id: [...context.map((part) => part.id), id].join(":"),
            label: [
              ...context.map((part) => part.label),
              clean(cells.eq(1).text()),
            ].join(" / "),
            defaultHex: hex,
            patterns: /^[✔✓✅]$/.test(patternText)
              ? true
              : /^[✖✕×❌]$/.test(patternText)
                ? false
                : null,
          });
        });
    });
  const toggles: ItemToggle[] = [];
  const fullLabels = new Map<string, string>();
  $(".toggle-tabber .toggle-tabber-frame").each((_, frame) => {
    if (isHistorical(frame)) return;
    const path = tabPath(frame);
    const idPath =
      path.length > 1 && path[path.length - 1].count === 1
        ? path.slice(0, -1)
        : path;
    const id = idPath.map((part) => part.id).join(":");
    const label =
      path
        .filter((part) => !/^\d+$/.test(part.label))
        .map((part) => part.label)
        .join(" / ") || path.map((part) => part.label).join(" / ");
    const img = $(frame).find("img").first();
    if (id && label) {
      toggles.push({
        id,
        label,
        imageUrl: imageUrl(img.attr("data-src")) ?? imageUrl(img.attr("src")),
      });
      fullLabels.set(id, path.map((part) => part.label).join(" / "));
    }
  });
  const labelCounts = new Map<string, number>();
  for (const toggle of toggles)
    labelCounts.set(toggle.label, (labelCounts.get(toggle.label) ?? 0) + 1);
  for (const toggle of toggles)
    if ((labelCounts.get(toggle.label) ?? 0) > 1)
      toggle.label = fullLabels.get(toggle.id)!;
  const status = fields.get("item status") ?? "";
  const location = fields.get("location") || null;
  const core = /\bcore item\b/i.test(status);
  const restricted =
    /vip|robux|currency|limited|unavailable|removed|code item|quest|gamepass/i.test(
      `${status} ${location ?? ""}`,
    );
  const img = $(".portable-infobox .pi-image img").first();
  return {
    id: slug(
      decodeURIComponent(new URL(candidate.sourceUrl).pathname.slice(6)),
    ),
    name: candidate.name,
    category: fields.get("item category") || candidate.category,
    sourceUrl: candidate.sourceUrl,
    imageUrl:
      imageUrl(img.attr("data-src")) ??
      imageUrl(img.attr("src")) ??
      candidate.imageUrl,
    bodyTypes,
    description: $(".mw-parser-output > p")
      .map((_, p) => clean($(p).text()))
      .get()
      .filter(Boolean)
      .join(" "),
    colorSlots,
    toggles,
    location,
    sourceCheckedAt: checkedAt,
    eligibility: core && !restricted ? "standard-free" : "needs-review",
  };
}
