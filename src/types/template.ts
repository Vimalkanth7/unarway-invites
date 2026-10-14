import type { CategorySlug } from "@/lib/categories";

export type FieldType = "text" | "long" | "date" | "url" | "tel" | "photo";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  section: string;
  hint?: string;
  clearLabel?: string;
  clearTo?: string;
  required?: boolean;
}

export interface TemplateMeta {
  id: string;
  title: string;
  category: CategorySlug;
  /** Overrides siteConfig.defaultPriceInInr when set. */
  priceInInr?: number;
}

export type DesignConfig = Record<string, string>;

export interface TemplateBundle {
  meta: TemplateMeta;
  schema: FieldSchema[];
  defaults: DesignConfig;
}
