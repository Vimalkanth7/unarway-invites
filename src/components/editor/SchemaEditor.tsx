"use client";

import { Fragment, useId, useMemo, useState } from "react";
import type { DesignConfig, FieldSchema } from "@/types/template";
import { validateConfig, type FieldErrors } from "@/lib/templates/validate";
import {
  DEFAULT_MAX_LIST_ITEMS,
  emptyListItem,
  parseListValue,
  serializeListValue,
  type ListItemValue,
} from "@/lib/templates/list-field";

const MAX_PHOTO_DIMENSION = 1400;
const PHOTO_JPEG_QUALITY = 0.84;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function readPhotoAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Photo field values are either a data: URL, a signed Storage https:// URL,
 * or a template-relative sample path like "assets/couple.jpg". That last
 * form is meant to be resolved against the template's own asset route, not
 * against whatever page happens to be rendering this editor -- used bare as
 * an <img src>, the browser resolves it against /design/<id> instead and 404s.
 */
function resolvePhotoSrc(designId: string, value: string): string {
  if (value.startsWith("assets/")) {
    return `/api/templates/${designId}/assets/${value.slice("assets/".length)}`;
  }
  return value;
}

function groupBySection(schema: FieldSchema[]): { section: string; fields: FieldSchema[] }[] {
  const groups: { section: string; fields: FieldSchema[] }[] = [];
  for (const field of schema) {
    const current = groups.at(-1);
    if (current && current.section === field.section) current.fields.push(field);
    else groups.push({ section: field.section, fields: [field] });
  }
  return groups;
}

export function SchemaEditor({
  schema,
  value,
  onChange,
  designId,
}: {
  schema: FieldSchema[];
  value: DesignConfig;
  onChange: (next: DesignConfig) => void;
  designId: string;
}) {
  const idPrefix = useId();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = useMemo(() => validateConfig(schema, value), [schema, value]);

  function setField(key: string, fieldValue: string) {
    onChange({ ...value, [key]: fieldValue });
  }

  function markTouched(key: string) {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }

  return (
    <div className="flex flex-col gap-6">
      {groupBySection(schema).map((group) => (
        <Fragment key={group.section}>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              {group.section}
            </h3>
            <div className="mt-3 flex flex-col gap-4">
              {group.fields.map((field) => {
                const id = `${idPrefix}-${field.key}`;
                const error = touched[field.key] ? errors[field.key] : undefined;
                return (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label htmlFor={id} className="text-sm text-neutral-700">
                      {field.label}
                      {field.required && <span className="text-red-600"> *</span>}
                    </label>
                    <FieldInput
                      id={id}
                      field={field}
                      value={value[field.key] ?? ""}
                      hasError={Boolean(error)}
                      onChange={(next) => setField(field.key, next)}
                      onBlur={() => markTouched(field.key)}
                      errors={errors}
                      touched={touched}
                      markTouched={markTouched}
                      designId={designId}
                    />
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    {field.hint && <p className="text-xs text-neutral-500">{field.hint}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function FieldInput({
  id,
  field,
  value,
  hasError,
  onChange,
  onBlur,
  errors,
  touched,
  markTouched,
  designId,
}: {
  id: string;
  field: FieldSchema;
  value: string;
  hasError: boolean;
  onChange: (next: string) => void;
  onBlur: () => void;
  errors: FieldErrors;
  touched: Record<string, boolean>;
  markTouched: (key: string) => void;
  designId: string;
}) {
  const [photoError, setPhotoError] = useState<string | null>(null);
  const inputClass = `min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
    hasError ? "border-red-400 focus:border-red-500" : "border-neutral-300 focus:border-neutral-500"
  }`;

  if (field.type === "long") {
    return (
      <textarea
        id={id}
        rows={3}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    );
  }

  if (field.type === "list") {
    return (
      <ListFieldInput
        field={field}
        value={value}
        onChange={onChange}
        errors={errors}
        touched={touched}
        markTouched={markTouched}
      />
    );
  }

  if (field.type === "photo") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvePhotoSrc(designId, value)}
              alt=""
              className="h-20 w-16 rounded-lg border border-neutral-300 object-cover"
            />
          )}
          <div className="flex flex-col gap-2">
            <input
              id={id}
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) {
                  setPhotoError("Please choose an image file.");
                  e.target.value = "";
                  return;
                }
                if (file.size > MAX_PHOTO_BYTES) {
                  setPhotoError("That photo is over 8 MB. Choose a smaller file.");
                  e.target.value = "";
                  return;
                }
                setPhotoError(null);
                try {
                  onChange(await readPhotoAsDataUrl(file));
                } catch {
                  setPhotoError("Could not read that photo. Try a different file.");
                }
                onBlur();
              }}
            />
            {value && (
              <button
                type="button"
                className="self-start text-xs text-neutral-600 underline"
                onClick={() => onChange(field.clearTo ?? "")}
              >
                {field.clearLabel ?? "Remove photo"}
              </button>
            )}
          </div>
        </div>
        {photoError && <p className="text-xs text-red-600">{photoError}</p>}
      </div>
    );
  }

  const htmlType =
    field.type === "date" ? "datetime-local" : field.type === "url" ? "url" : field.type === "tel" ? "tel" : "text";

  return (
    <input
      id={id}
      type={htmlType}
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}

/**
 * Items are stored as a JSON string in the same string-valued DesignConfig
 * slot every other field uses -- onChange still just takes a string, so the
 * rest of the editor (and the postMessage contract to templates) needs no
 * changes to support this field type.
 */
function ListFieldInput({
  field,
  value,
  onChange,
  errors,
  touched,
  markTouched,
}: {
  field: FieldSchema;
  value: string;
  onChange: (next: string) => void;
  errors: FieldErrors;
  touched: Record<string, boolean>;
  markTouched: (key: string) => void;
}) {
  const itemFields = field.itemFields ?? [];
  const maxItems = field.maxItems ?? DEFAULT_MAX_LIST_ITEMS;
  const items = parseListValue(value);

  function commit(next: ListItemValue[]) {
    onChange(serializeListValue(next));
  }

  function updateItem(index: number, key: string, itemValue: string) {
    commit(items.map((item, i) => (i === index ? { ...item, [key]: itemValue } : item)));
  }

  function addItem() {
    if (items.length >= maxItems) return;
    commit([...items, emptyListItem(itemFields)]);
  }

  function removeItem(index: number) {
    commit(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-lg border border-neutral-300 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Item {index + 1}</span>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                className="text-neutral-600 underline disabled:pointer-events-none disabled:opacity-40"
              >
                Move up
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                className="text-neutral-600 underline disabled:pointer-events-none disabled:opacity-40"
              >
                Move down
              </button>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-600 underline"
              >
                Remove
              </button>
            </div>
          </div>
          {itemFields.map((itemField) => {
            const itemHtmlType = itemField.type === "date" ? "datetime-local" : "text";
            const itemKey = `${field.key}.${index}.${itemField.key}`;
            const itemError = touched[itemKey] ? errors[itemKey] : undefined;
            const itemInputClass = `min-h-[40px] w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
              itemError ? "border-red-400 focus:border-red-500" : "border-neutral-300 focus:border-neutral-500"
            }`;
            return (
              <label key={itemField.key} className="flex flex-col gap-1">
                <span className="text-xs text-neutral-600">
                  {itemField.label}
                  {itemField.required && <span className="text-red-600"> *</span>}
                </span>
                <input
                  type={itemHtmlType}
                  value={item[itemField.key] ?? ""}
                  maxLength={itemField.maxLength}
                  onChange={(e) => updateItem(index, itemField.key, e.target.value)}
                  onBlur={() => markTouched(itemKey)}
                  className={itemInputClass}
                />
                {itemError && <p className="text-xs text-red-600">{itemError}</p>}
                {itemField.hint && <span className="text-xs text-neutral-500">{itemField.hint}</span>}
              </label>
            );
          })}
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= maxItems}
        className="self-start rounded-full border border-neutral-300 px-4 py-1.5 text-xs text-neutral-700 disabled:pointer-events-none disabled:opacity-40"
      >
        Add item ({items.length}/{maxItems})
      </button>
    </div>
  );
}
