"use client";

import { useState } from "react";
import { SchemaEditor } from "@/components/editor/SchemaEditor";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import type { TemplateBundle } from "@/types/template";

export function DesignWorkspace({ bundle }: { bundle: TemplateBundle }) {
  const [config, setConfig] = useState(bundle.defaults);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <SchemaEditor schema={bundle.schema} value={config} onChange={setConfig} />
      <PreviewFrame designId={bundle.meta.id} config={config} />
    </div>
  );
}
