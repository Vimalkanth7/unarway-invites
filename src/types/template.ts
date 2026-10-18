import type { CategorySlug } from "@/lib/categories";

export type FieldType = "text" | "long" | "date" | "url" | "tel" | "photo" | "list";

/**
 * Shape of one item inside a "list" field (e.g. one event in a schedule).
 * Deliberately a small subset of FieldType -- no nested lists or photos,
 * so the editor never has to render a list inside a list.
 */
export interface ListItemFieldSchema {
  key: string;
  label: string;
  type: "text" | "date" | "tel" | "url";
  required?: boolean;
  hint?: string;
  /** Only meaningful for type "text". */
  maxLength?: number;
}

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  section: string;
  hint?: string;
  clearLabel?: string;
  clearTo?: string;
  required?: boolean;
  /** Only meaningful when type === "list": shape of each item. */
  itemFields?: ListItemFieldSchema[];
  /** Only meaningful when type === "list". Defaults to 5. */
  maxItems?: number;
}

/**
 * Declares which config keys to pull share copy from, so /i/<short-id>'s
 * Open Graph metadata is generic across templates instead of the metadata
 * generator hardcoding field names like "groomName".
 */
export interface ShareMeta {
  /** Config keys joined (with titleJoiner) to build the share title. */
  titleFields: string[];
  /** Defaults to " & ". */
  titleJoiner?: string;
  /** Config key holding a date/datetime string for the share description. */
  dateField?: string;
  /** Config key holding a short place name for the share description. */
  locationField?: string;
  /** Config key (type "photo") to use as the share image when set by the user. */
  imageField?: string;
}

export interface TemplateMeta {
  id: string;
  title: string;
  category: CategorySlug;
  /** Overrides siteConfig.defaultPriceInInr when set. */
  priceInInr?: number;
  /** Asset-relative path (e.g. "assets/foo.jpg") used as the share image when imageField isn't set by the user. */
  previewImage?: string;
  share?: ShareMeta;
  /** Dev fixture, not a sellable design -- hidden from browsing and blocked outright when NODE_ENV === "production". */
  devOnly?: boolean;
  /**
   * True only once every asset this design ships is confirmed licensed or
   * original (no row left "UNLICENSED" in ASSETS.md). Missing/false hides
   * the design everywhere (listings, /design, /api/templates/*, /i) unless
   * ALLOW_UNLICENSED_TEMPLATES=1 is set -- see isTemplateVisible() in
   * src/lib/templates/loader.ts. Defaults to false (fail closed) when absent.
   */
  licensed?: boolean;
}

export type DesignConfig = Record<string, string>;

export interface TemplateBundle {
  meta: TemplateMeta;
  schema: FieldSchema[];
  defaults: DesignConfig;
}
