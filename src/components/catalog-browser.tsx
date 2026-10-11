"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import type { Body, CatalogItem } from "@/lib/types";
import { ItemImage } from "./item-image";

export function CatalogBrowser({
  items,
  body,
  compact = false,
}: {
  items: CatalogItem[];
  body: Body;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All items");
  const [limit, setLimit] = useState(36);
  const compatible = useMemo(
    () =>
      items.filter(
        (item) =>
          item.eligibility === "standard-free" && item.bodyTypes.includes(body),
      ),
    [items, body],
  );
  const categories = useMemo(
    () => [...new Set(compatible.map((item) => item.category))].sort(),
    [compatible],
  );
  const matches = compatible.filter(
    (item) =>
      (category === "All items" || item.category === category) &&
      `${item.name} ${item.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const shown = compact
    ? compatible.filter((item) => item.imageUrl).slice(0, 8)
    : matches.slice(0, limit);
  return (
    <section aria-label="Free item catalog">
      {!compact && (
        <>
          <div className="section-heading">
            <div>
              <h2>Your free wardrobe</h2>
              <p>
                Documented for the {body} avatar. Open an item to check its wiki
                details.
              </p>
            </div>
            <span className="count">{matches.length} items</span>
          </div>
          <div className="catalog-filters">
            <label className="search-field">
              <Search size={18} />
              <span className="sr-only">Search wardrobe</span>
              <input
                value={query}
                placeholder="Search items…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(36);
                }}
              />
            </label>
            <label>
              <span className="sr-only">Item category</span>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setLimit(36);
                }}
              >
                <option>All items</option>
                {categories.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
      {shown.length === 0 ? (
        <p className="empty-note">
          No items match. Try a different search or category.
        </p>
      ) : (
        <div className={`catalog-grid ${compact ? "compact-grid" : ""}`}>
          {shown.map((item) => (
            <a
              className="catalog-item"
              key={item.id}
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <div className="catalog-image">
                <ItemImage src={item.imageUrl} alt={item.name} />
                <ExternalLink size={15} className="external-mark" />
              </div>
              <h3>{item.name}</h3>
              <p>{item.category}</p>
              {!compact && (
                <span className="item-meta">
                  {item.colorSlots.length
                    ? `${item.colorSlots.length} color regions`
                    : "Colors undocumented"}
                  {item.toggles.length
                    ? ` · ${item.toggles.length} toggles`
                    : ""}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
      {!compact && matches.length > limit && (
        <button
          className="secondary load-more"
          onClick={() => setLimit((value) => value + 36)}
        >
          Show more items
        </button>
      )}
    </section>
  );
}
