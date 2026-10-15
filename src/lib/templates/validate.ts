import type { DesignConfig, FieldSchema } from "@/types/template";
import { DEFAULT_MAX_LIST_ITEMS, parseListValue } from "@/lib/templates/list-field";

/** Keyed by field key so both the editor and the pay-button gate can look up a single field's error. */
export type FieldErrors = Record<string, string>;

export function validateConfig(schema: FieldSchema[], config: DesignConfig): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of schema) {
    if (field.type === "list") {
      const items = parseListValue(config[field.key] ?? "");
      const maxItems = field.maxItems ?? DEFAULT_MAX_LIST_ITEMS;
      if (field.required && items.length === 0) {
        errors[field.key] = "Add at least one item.";
      } else if (items.length > maxItems) {
        errors[field.key] = `Only up to ${maxItems} items are allowed.`;
      }
      continue;
    }

    const value = (config[field.key] ?? "").trim();
    if (field.required && !value) {
      errors[field.key] = "This field is required.";
      continue;
    }
    if (field.type === "url" && value) {
      try {
        new URL(value);
      } catch {
        errors[field.key] = "Enter a valid URL.";
      }
    }
  }
  return errors;
}
