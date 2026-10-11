"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CircleHelp,
  ImagePlus,
  LoaderCircle,
  Shirt,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type {
  Body,
  Catalog,
  ProviderStatus,
  RecommendationResult,
  Style,
} from "@/lib/types";
import { MAX_IMAGE_BYTES } from "@/lib/schemas";
import { CatalogBrowser } from "./catalog-browser";
import { OutfitDetail, ReferenceCredit } from "./outfit-detail";
import { ItemImage } from "./item-image";

const THEMES = ["Old Hollywood", "Gothic", "Y2K", "Enchanted forest"];

export function Stylist({
  catalog,
  providers,
}: {
  catalog: Catalog;
  providers: ProviderStatus;
}) {
  const [theme, setTheme] = useState("");
  const [style, setStyle] = useState<Style>("either");
  const [body, setBody] = useState<Body>("female");
  const [tab, setTab] = useState<"looks" | "wardrobe">("looks");
  const [image, setImage] = useState<string>();
  const [imageName, setImageName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RecommendationResult>();
  const [selected, setSelected] = useState<number>();
  const [setup, setSetup] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const uploadVersion = useRef(0);
  const uploadInput = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const ready = providers.openai && (providers.search || Boolean(image));
  const eligible = catalog.items.filter(
    (item) => item.eligibility === "standard-free",
  );
  useEffect(
    () => () => {
      controller.current?.abort();
      uploadVersion.current++;
    },
    [],
  );

  async function upload(file?: File) {
    const version = ++uploadVersion.current;
    setError("");
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > MAX_IMAGE_BYTES
    ) {
      setError("Choose a JPEG, PNG, or WebP image under 4 MB.");
      if (uploadInput.current) uploadInput.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (uploadVersion.current === version) {
        setImage(reader.result as string);
        setImageName(file.name);
      }
    };
    reader.onerror = () => {
      if (uploadVersion.current === version)
        setError("That image couldn't be read. Try another file.");
    };
    reader.readAsDataURL(file);
  }

  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setError("Search canceled. Your theme is still here.");
  }

  async function findLooks(event: React.FormEvent) {
    event.preventDefault();
    if (!theme.trim()) {
      setError("Enter the round's theme first.");
      return;
    }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setSelected(undefined);
    setResult(undefined);
    setTab("looks");
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: theme.trim(),
          style,
          body,
          ...(image ? { imageDataUrl: image } : {}),
        }),
        signal: request.signal,
      });
      const data = await response.json();
      if (controller.current !== request) return;
      if (!response.ok)
        throw new Error(
          data.error?.message ?? "Couldn't find looks. Try again.",
        );
      if (!Array.isArray(data.looks) || !data.looks.length)
        throw new Error(
          "No achievable looks were found. Try another reference or theme.",
        );
      setResult(data);
      setTimeout(() => resultHeading.current?.focus(), 0);
    } catch (err) {
      if (controller.current === request && !request.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't reach the outfit service. Try again.",
        );
    } finally {
      if (controller.current === request) {
        setBusy(false);
        controller.current = null;
      }
    }
  }

  const look = selected !== undefined ? result?.looks[selected] : undefined;
  const reference = result?.references.find(
    (ref) => ref.id === look?.referenceId,
  );
  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="brand" aria-label="DTI wardrobe studio home">
          <span className="brand-symbol">
            <Shirt size={21} />
          </span>
          <span>
            dti<span className="brand-divider">/</span>
            <span className="brand-subtitle">wardrobe studio</span>
          </span>
        </a>
        <div className="header-actions">
          <span className="free-label">
            <Check size={14} />
            Standard & free
          </span>
          <button
            className="icon-button"
            aria-label="Setup and about"
            aria-expanded={setup}
            onClick={() => setSetup(!setup)}
          >
            <CircleHelp size={21} />
          </button>
        </div>
      </header>
      {setup && (
        <section className="setup-panel" aria-label="Setup and about">
          <div>
            <h2>Connect your stylist</h2>
            <p>
              Add keys to <code>.env.local</code> and restart the app. Keys stay
              on the server.
            </p>
            <ul>
              <li>
                OpenAI:{" "}
                {providers.openai ? "Configured" : "OPENAI_API_KEY needed"}
              </li>
              <li>
                Google Images via SerpApi:{" "}
                {providers.search
                  ? "Configured"
                  : "SERPAPI_API_KEY needed (or upload a reference)"}
              </li>
            </ul>
            <p>
              Reference images and catalog details are sent to OpenAI for
              matching. Provider usage may incur charges. This is an unofficial
              local companion; you put the outfit on in Roblox.
            </p>
            <a
              href="https://github.com/AntonCSalvador/dti"
              target="_blank"
              rel="noreferrer"
            >
              Setup instructions <ArrowUpRight size={14} />
            </a>
          </div>
          <button
            className="icon-button"
            aria-label="Close setup"
            onClick={() => setSetup(false)}
          >
            <X size={18} />
          </button>
        </section>
      )}
      <div className="workspace">
        <aside className="brief-panel">
          <div className="brief-heading">
            <h1>What’s the theme?</h1>
            <p>
              Find the reference.
              <br /> Make it your own.
            </p>
          </div>
          <form onSubmit={findLooks}>
            <label className="field-label" htmlFor="theme">
              Round theme
            </label>
            <textarea
              id="theme"
              value={theme}
              onChange={(event) => {
                setTheme(event.target.value);
                setError("");
              }}
              placeholder="e.g. Old Hollywood"
              maxLength={160}
              rows={2}
              disabled={busy}
            />
            <div className="theme-suggestions">
              {THEMES.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setTheme(value);
                    setError("");
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            <fieldset disabled={busy}>
              <legend>Outfit style</legend>
              <div className="segmented">
                {(["feminine", "masculine", "either"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={style === value}
                    className={style === value ? "active" : ""}
                    onClick={() => setStyle(value)}
                  >
                    {value[0].toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field-label" htmlFor="body">
              Avatar body
            </label>
            <select
              id="body"
              value={body}
              disabled={busy}
              onChange={(event) => setBody(event.target.value as Body)}
            >
              <option value="female">Female avatar</option>
              <option value="male">Male avatar</option>
            </select>
            <p className="field-help">We’ll match items that fit this body.</p>
            <div className="upload-area">
              <input
                ref={uploadInput}
                id="reference-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => upload(event.target.files?.[0])}
                disabled={busy}
                className="sr-only"
              />
              {image ? (
                <div className="upload-preview">
                  <ItemImage src={image} alt="Your selected reference" />
                  <span>{imageName}</span>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={busy}
                    aria-label="Remove reference"
                    onClick={() => {
                      uploadVersion.current++;
                      setImage(undefined);
                      setImageName("");
                      if (uploadInput.current) uploadInput.current.value = "";
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="reference-upload"
                  className={`upload-label ${busy ? "is-disabled" : ""}`}
                >
                  <ImagePlus size={19} />
                  <span>
                    Have a reference?
                    <small>Upload an image instead of searching</small>
                  </span>
                </label>
              )}
              <p className="field-help">JPEG, PNG or WebP · up to 4 MB</p>
            </div>
            <button
              type="submit"
              className="primary find-button"
              disabled={busy}
            >
              {busy ? (
                <>
                  <LoaderCircle size={18} className="spin" />
                  Finding your looks…
                </>
              ) : (
                <>
                  Find looks
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            {busy && (
              <button
                type="button"
                className="text-button cancel-button"
                onClick={cancel}
              >
                Cancel search
              </button>
            )}
            {!ready && (
              <p className="setup-hint">
                <button type="button" onClick={() => setSetup(true)}>
                  Connect API keys
                </button>{" "}
                to find looks. The wardrobe is ready to browse.
              </p>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </form>
          <div className="brief-footer">
            <BookOpen size={17} />
            <div>
              <strong>{eligible.length} free items documented</strong>
              <p>
                Catalog checked{" "}
                {new Date(catalog.importedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </p>
            </div>
          </div>
        </aside>
        <main className="main-panel" id="main-content">
          <nav className="workspace-tabs" aria-label="Workspace">
            <button
              className={tab === "looks" ? "active" : ""}
              aria-pressed={tab === "looks"}
              onClick={() => setTab("looks")}
            >
              Your looks{result && <span>{result.looks.length}</span>}
            </button>
            <button
              className={tab === "wardrobe" ? "active" : ""}
              aria-pressed={tab === "wardrobe"}
              onClick={() => setTab("wardrobe")}
            >
              Free wardrobe
            </button>
            <span className="manual-mode">
              <SlidersHorizontal size={14} />
              Manual dressing
            </span>
          </nav>
          <div className="main-content">
            {tab === "wardrobe" ? (
              <CatalogBrowser items={catalog.items} body={body} />
            ) : busy ? (
              <div className="loading-state" role="status">
                <LoaderCircle size={34} className="spin" />
                <h2>Putting the pieces together.</h2>
                <p>
                  {image ? "Comparing your reference" : "Searching references"}{" "}
                  and matching free items, shapes, and colors.
                </p>
                <p className="muted">
                  This can take a minute. You can cancel at any time.
                </p>
              </div>
            ) : look && reference ? (
              <OutfitDetail
                key={`${selected}-${look.title}`}
                look={look}
                reference={reference}
                searchNotice={result?.searchNotice}
                items={catalog.items}
                onBack={() => setSelected(undefined)}
              />
            ) : result ? (
              <>
                {result.searchNotice && (
                  <p className="search-notice" role="status">
                    {result.searchNotice}
                  </p>
                )}
                <div className="section-heading">
                  <div>
                    <h2 ref={resultHeading} tabIndex={-1}>
                      Find your interpretation.
                    </h2>
                    <p>Choose a look to get its dressing checklist.</p>
                  </div>
                </div>
                <div className="look-grid">
                  {result.looks.map((entry, index) => {
                    const ref = result.references.find(
                      (r) => r.id === entry.referenceId,
                    );
                    return (
                      <article
                        className="look-card"
                        key={`${entry.referenceId}-${index}`}
                      >
                        <button
                          className="look-image-button"
                          onClick={() => setSelected(index)}
                          aria-label={`Open ${entry.title}`}
                        >
                          <ItemImage
                            src={ref?.imageUrl ?? null}
                            alt={ref?.title ?? entry.title}
                            className="look-image"
                            priority
                          />
                        </button>
                        {ref && <ReferenceCredit reference={ref} />}
                        <div className="look-copy">
                          <span className="look-meta">
                            {entry.pieces.length} pieces · {entry.body} avatar
                          </span>
                          <h3>{entry.title}</h3>
                          <p>{entry.why}</p>
                          <button
                            className="text-button"
                            onClick={() => setSelected(index)}
                          >
                            Build this look
                            <ArrowRight size={17} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {result.warnings.length > 0 && (
                  <div className="result-notes">
                    <h3>A note on the fit</h3>
                    {result.warnings.map((note, i) => (
                      <p key={i}>{note}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="welcome">
                  <div className="welcome-copy">
                    <h2>
                      A little inspiration.
                      <br />
                      <span>A look you can make.</span>
                    </h2>
                    <p>
                      Turn the round’s theme into a real reference and a recipe
                      from the free wardrobe. Shapes first, colors next,
                      finishing touches last.
                    </p>
                    <div className="welcome-steps">
                      <span>Find a reference</span>
                      <ArrowRight size={14} />
                      <span>Match the pieces</span>
                      <ArrowRight size={14} />
                      <span>Get dressed</span>
                    </div>
                  </div>
                  <div className="welcome-note">
                    <span className="note-pin" />
                    <p>
                      Pink in the catalog.
                      <br />
                      <strong>Anything on the runway.</strong>
                    </p>
                    <small>
                      We account for recoloring
                      <br />
                      and documented toggles.
                    </small>
                  </div>
                </div>
                <div className="section-heading catalog-preview-heading">
                  <div>
                    <h2>Already in your wardrobe</h2>
                    <p>A few free pieces to work with.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setTab("wardrobe")}
                  >
                    Explore all
                    <ArrowUpRight size={16} />
                  </button>
                </div>
                <CatalogBrowser items={catalog.items} body={body} compact />
              </>
            )}
          </div>
          <footer className="app-footer">
            <span>Unofficial companion · no VIP or paid items</span>
            <a href={catalog.sourceUrl} target="_blank" rel="noreferrer">
              Catalog: Dress To Impress Wiki
              <ArrowUpRight size={12} />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
