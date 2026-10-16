import type { DesignConfig, FieldSchema } from "@/types/template";
import { DEFAULT_MAX_LIST_ITEMS, parseListValue } from "@/lib/templates/list-field";

/**
 * Keyed by field key so both the editor and the pay-button gate can look up
 * a single field's error. List item errors use the compound key
 * "<field.key>.<item index>.<item field key>" (e.g. "events.0.title") so
 * they fit the same flat map without a nested shape.
 */
export type FieldErrors = Record<string, string>;

function isValidDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function validateListField(field: FieldSchema, config: DesignConfig, errors: FieldErrors): void {
  const items = parseListValue(config[field.key] ?? "");
  const maxItems = field.maxItems ?? DEFAULT_MAX_LIST_ITEMS;
  const itemFields = field.itemFields ?? [];
  let hasItemError = false;

  items.forEach((item, index) => {
    for (const itemField of itemFields) {
      const itemValue = (item[itemField.key] ?? "").trim();
      const key = `${field.key}.${index}.${itemField.key}`;

      if (itemField.required && !itemValue) {
        errors[key] = "This field is required.";
        hasItemError = true;
        continue;
      }
      if (!itemValue) continue;

      if (itemField.type === "date" && !isValidDate(itemValue)) {
        errors[key] = "Enter a valid date.";
        hasItemError = true;
      } else if (itemField.maxLength && itemValue.length > itemField.maxLength) {
        errors[key] = `Keep it under ${itemField.maxLength} characters.`;
        hasItemError = true;
      }
    }
  });

  if (field.required && items.length === 0) {
    errors[field.key] = "Add at least one item.";
  } else if (items.length > maxItems) {
    errors[field.key] = `Only up to ${maxItems} items are allowed.`;
  } else if (hasItemError) {
    errors[field.key] = "Fix the errors in the items above.";
  }
}

export function validateConfig(schema: FieldSchema[], config: DesignConfig): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of schema) {
    if (field.type === "list") {
      validateListField(field, config, errors);
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
