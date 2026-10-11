"use client";

import { useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, RotateCcw } from "lucide-react";
import type { CatalogItem, Recipe, ReferenceImage } from "@/lib/types";
import { ItemImage } from "./item-image";

export function ReferenceCredit({ reference }: { reference: ReferenceImage }) {
  if (!reference.license) return null;
  return (
    <p className="reference-credit">
      Image by{" "}
      {reference.creatorUrl ? (
        <a href={reference.creatorUrl} target="_blank" rel="noreferrer">
          {reference.creator ?? "the creator"}
        </a>
      ) : (
        (reference.creator ?? "an unknown creator")
      )}
      {" · "}
      {reference.licenseUrl ? (
        <a href={reference.licenseUrl} target="_blank" rel="noreferrer">
          {reference.license}
        </a>
      ) : (
        reference.license
      )}
      {" · "}
      <a href={reference.sourceUrl!} target="_blank" rel="noreferrer">
        Image source
      </a>
    </p>
  );
}

export function OutfitDetail({
  look,
  reference,
  searchNotice,
  items,
  onBack,
}: {
  look: Recipe;
  reference: ReferenceImage;
  searchNotice?: string;
  items: CatalogItem[];
  onBack: () => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [copyMessage, setCopyMessage] = useState("");
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const pieces = [...look.pieces].sort(
    (a, b) => Number(b.essential) - Number(a.essential),
  );
  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(message);
    } catch {
      setCopyMessage(
        "Couldn't access the clipboard. Select and copy the text instead.",
      );
    }
  }
  function recipeText() {
    return [
      look.title,
      look.why,
      ...pieces.map((piece, i) => {
        const item = itemMap.get(piece.itemId)!;
        return `${i + 1}. ${item.name}${piece.toggleId ? ` — ${item.toggles.find((t) => t.id === piece.toggleId)?.label}` : ""}\n${piece.colors.map((color) => `${item.colorSlots.find((s) => s.id === color.slotId)?.label}: ${color.hex}`).join(", ")}\n${piece.note}\n${item.sourceUrl}`;
      }),
      "Compromises:",
      ...look.compromises,
      ...(reference.sourceUrl ? [reference.sourceUrl] : []),
      ...(reference.license
        ? [
            `Image credit: ${reference.creator ?? "Unknown creator"} · ${reference.license}${reference.creatorUrl ? ` · ${reference.creatorUrl}` : ""}${reference.licenseUrl ? ` · ${reference.licenseUrl}` : ""}`,
          ]
        : []),
    ].join("\n\n");
  }
  return (
    <section>
      <button className="text-button back-button" onClick={onBack}>
        <ArrowLeft size={17} />
        All looks
      </button>
      {searchNotice && (
        <p className="search-notice" role="status">
          {searchNotice}
        </p>
      )}
      <div className="detail-heading">
        <div>
          <h2>{look.title}</h2>
          <p>{look.why}</p>
        </div>
        <button
          className="secondary"
          onClick={() => copy(recipeText(), "Recipe copied.")}
        >
          <Copy size={16} />
          Copy recipe
        </button>
      </div>
      <div className="outfit-layout">
        <aside className="reference-panel">
          <ItemImage
            src={reference.imageUrl}
            alt={reference.title}
            className="reference-image"
            priority
          />
          {reference.sourceUrl ? (
            <a
              href={reference.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="source-link"
            >
              View reference source <ExternalLink size={14} />
            </a>
          ) : (
            <p className="source-link">Your uploaded reference</p>
          )}
          <ReferenceCredit reference={reference} />
          <div className="compromises">
            <h3>What to keep in mind</h3>
            {look.compromises.length ? (
              <ul>
                {look.compromises.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            ) : (
              <p>Check the silhouette and layering in-game as you dress.</p>
            )}
          </div>
        </aside>
        <div className="checklist">
          <div className="checklist-heading">
            <h3>Your dressing checklist</h3>
            <span>
              {checked.length}/{pieces.length} on
            </span>
            <button
              className="icon-button"
              title="Reset checklist"
              aria-label="Reset checklist"
              onClick={() => setChecked([])}
            >
              <RotateCcw size={16} />
            </button>
          </div>
          {pieces.map((piece, index) => {
            const item = itemMap.get(piece.itemId);
            if (!item) return null;
            const toggle = item.toggles.find(
              (value) => value.id === piece.toggleId,
            );
            const done = checked.includes(item.id);
            return (
              <article
                className={`piece ${done ? "piece-done" : ""}`}
                key={item.id}
              >
                <label className="piece-check">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() =>
                      setChecked((values) =>
                        done
                          ? values.filter((id) => id !== item.id)
                          : [...values, item.id],
                      )
                    }
                  />
                  <span className="sr-only">Mark {item.name} as equipped</span>
                  <span className="check-visual" aria-hidden="true">
                    {done ? <Check size={14} /> : index + 1}
                  </span>
                </label>
                <ItemImage
                  src={toggle?.imageUrl ?? item.imageUrl}
                  alt={item.name}
                  className="piece-image"
                />
                <div className="piece-info">
                  <div className="piece-title">
                    <h4>{item.name}</h4>
                    {piece.essential && (
                      <span className="essential">Essential</span>
                    )}
                  </div>
                  <p>
                    {toggle ? `Toggle: ${toggle.label}` : "Default appearance"}
                  </p>
                  {piece.colors.length > 0 && (
                    <div className="color-list">
                      {piece.colors.map((color) => (
                        <button
                          key={color.slotId}
                          className="color-chip"
                          title={`Copy ${color.hex}`}
                          onClick={() =>
                            copy(color.hex, `${color.hex} copied.`)
                          }
                        >
                          <span
                            className="swatch"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>
                            {
                              item.colorSlots.find(
                                (slot) => slot.id === color.slotId,
                              )?.label
                            }
                            <strong>{color.hex.toUpperCase()}</strong>
                          </span>
                          <Copy size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                  {piece.note && <p className="piece-note">{piece.note}</p>}
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="item-source"
                  >
                    {item.location || "Check item location on wiki"}
                    <ExternalLink size={12} />
                  </a>
                </div>
              </article>
            );
          })}
          {checked.length === pieces.length && (
            <p className="complete-note">
              <Check size={18} />
              Everything is on. Check your silhouette before the runway.
            </p>
          )}
          <p className="copy-status" role="status">
            {copyMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
