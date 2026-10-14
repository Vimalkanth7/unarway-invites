"use client";

import { useState } from "react";
import { SchemaEditor } from "@/components/editor/SchemaEditor";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import type { TemplateBundle } from "@/types/template";

export function DesignWorkspace({
  bundle,
  price,
}: {
  bundle: TemplateBundle;
  price: number;
}) {
  const [config, setConfig] = useState(bundle.defaults);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 md:hidden">
        <TabButton active={activeTab === "edit"} onClick={() => setActiveTab("edit")}>
          Edit
        </TabButton>
        <TabButton active={activeTab === "preview"} onClick={() => setActiveTab("preview")}>
          Preview
        </TabButton>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className={activeTab === "edit" ? "flex flex-col gap-4" : "hidden flex-col gap-4 md:flex"}>
          <button
            type="button"
            onClick={() => setConfig(bundle.defaults)}
            className="self-start text-xs text-neutral-600 underline"
          >
            Reset to defaults
          </button>
          <SchemaEditor schema={bundle.schema} value={config} onChange={setConfig} />
        </div>
        <div className={activeTab === "preview" ? "block" : "hidden md:block"}>
          <PreviewFrame designId={bundle.meta.id} config={config} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-700">
          Download for &#8377;{price}
        </p>
        <button
          type="button"
          disabled
          title="Checkout lands in Phase 6"
          className="rounded-full bg-neutral-300 px-5 py-2 text-sm font-medium text-neutral-600"
        >
          Pay to download &mdash; Coming soon
        </button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
        active ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}
