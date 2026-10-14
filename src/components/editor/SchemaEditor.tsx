"use client";

import { Fragment, useId } from "react";
import type { DesignConfig, FieldSchema } from "@/types/template";

const MAX_PHOTO_DIMENSION = 1400;
const PHOTO_JPEG_QUALITY = 0.84;

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
}: {
  schema: FieldSchema[];
  value: DesignConfig;
  onChange: (next: DesignConfig) => void;
}) {
  const idPrefix = useId();

  function setField(key: string, fieldValue: string) {
    onChange({ ...value, [key]: fieldValue });
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
                return (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label htmlFor={id} className="text-sm text-neutral-700">
                      {field.label}
                    </label>
                    <FieldInput
                      id={id}
                      field={field}
                      value={value[field.key] ?? ""}
                      onChange={(next) => setField(field.key, next)}
                    />
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
  onChange,
}: {
  id: string;
  field: FieldSchema;
  value: string;
  onChange: (next: string) => void;
}) {
  const inputClass =
    "min-h-[44px] w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

  if (field.type === "long") {
    return (
      <textarea
        id={id}
        rows={3}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === "photo") {
    return (
      <div className="flex items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
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
              onChange(await readPhotoAsDataUrl(file));
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
    />
  );
}
