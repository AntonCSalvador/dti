export type Body = "female" | "male";
export type Style = "feminine" | "masculine" | "either";
export type AIProvider = "openrouter" | "openai";

export interface ColorSlot {
  id: string;
  label: string;
  defaultHex: string | null;
  patterns: boolean | null;
}

export interface ItemToggle {
  id: string;
  label: string;
  imageUrl: string | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sourceUrl: string;
  imageUrl: string | null;
  bodyTypes: Body[];
  description: string;
  colorSlots: ColorSlot[];
  toggles: ItemToggle[];
  location: string | null;
  sourceCheckedAt: string;
  eligibility: "standard-free" | "needs-review";
}

export interface Catalog {
  sourceUrl: string;
  importedAt: string;
  items: CatalogItem[];
  warnings: string[];
}

export interface ReferenceImage {
  id: string;
  title: string;
  sourceUrl: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  creator?: string;
  creatorUrl?: string;
  license?: string;
  licenseUrl?: string;
}

export interface ReferenceSearchResult {
  references: ReferenceImage[];
  notice?: string;
}

export interface RecipePiece {
  itemId: string;
  toggleId: string | null;
  colors: { slotId: string; hex: string }[];
  note: string;
  essential: boolean;
}

export interface Recipe {
  title: string;
  referenceId: string;
  body: Body;
  why: string;
  compromises: string[];
  pieces: RecipePiece[];
}

export interface RecommendationInput {
  theme: string;
  style: Style;
  body: Body;
  provider?: AIProvider;
  apiKey?: string;
  imageDataUrl?: string;
}

export interface RecommendationResult {
  looks: Recipe[];
  references: ReferenceImage[];
  warnings: string[];
  searchNotice?: string;
}

export interface ProviderStatus {
  openrouter: boolean;
  openai: boolean;
  search: boolean;
}
