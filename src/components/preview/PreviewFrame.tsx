"use client";

import { useEffect, useRef, useState } from "react";
import type { DesignConfig } from "@/types/template";
import { PREVIEW_CONFIG_MESSAGE, PREVIEW_READY_MESSAGE } from "@/lib/templates/preview-protocol";

export function PreviewFrame({
  designId,
  config,
}: {
  designId: string;
  config: DesignConfig;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === PREVIEW_READY_MESSAGE) setReady(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_CONFIG_MESSAGE, payload: config },
      "*"
    );
  }, [ready, config]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
      <iframe
        ref={iframeRef}
        src={`/api/templates/${designId}/view`}
        sandbox="allow-scripts"
        title="Invitation preview"
        className="h-[70vh] w-full"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span className="-rotate-[20deg] whitespace-nowrap text-3xl font-semibold uppercase tracking-widest text-black/15">
          Unarway Invites &middot; Preview
        </span>
      </div>
    </div>
  );
}
