import type { DesignConfig, FieldSchema } from "@/types/template";

/** Keyed by field key so both the editor and the pay-button gate can look up a single field's error. */
export type FieldErrors = Record<string, string>;

export function validateConfig(schema: FieldSchema[], config: DesignConfig): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of schema) {
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
