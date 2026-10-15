import type { ListItemFieldSchema } from "@/types/template";

/**
 * A "list" field's config value is a JSON-encoded array of these, stored as
 * an ordinary string -- DesignConfig stays Record<string, string> and the
 * postMessage contract to templates doesn't change at all; only the editor
 * (and whatever template reads the field) know to parse it.
 */
export type ListItemValue = Record<string, string>;

export const DEFAULT_MAX_LIST_ITEMS = 5;

export function parseListValue(value: string): ListItemValue[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeListValue(items: ListItemValue[]): string {
  return JSON.stringify(items);
}

export function emptyListItem(itemFields: ListItemFieldSchema[]): ListItemValue {
  return Object.fromEntries(itemFields.map((field) => [field.key, ""]));
}
