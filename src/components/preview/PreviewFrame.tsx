"use client";

import { useEffect, useRef, useState } from "react";
import type { DesignConfig } from "@/types/template";
import { PREVIEW_CONFIG_MESSAGE, PREVIEW_READY_MESSAGE } from "@/lib/templates/preview-protocol";

const READY_TIMEOUT_MS = 8000;

type Status = "loading" | "ready" | "error";

export function PreviewFrame({
  designId,
  config,
  watermark = true,
}: {
  designId: string;
  config: DesignConfig;
  watermark?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === PREVIEW_READY_MESSAGE) setStatus("ready");
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [reloadKey]);

  // Backup for the "ready" postMessage: the iframe is a separate document
  // load that can finish and post unarway:ready before this component has
  // even mounted/hydrated and attached the listener above, in which case
  // that message is lost forever and config never gets sent. The native
  // iframe load event can't have that problem -- it can't fire before React
  // has committed the <iframe> (and this handler) to the DOM.
  function handleIframeLoad() {
    setStatus((current) => (current === "loading" ? "ready" : current));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus((current) => (current === "loading" ? "error" : current));
    }, READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [reloadKey]);

  useEffect(() => {
    if (status !== "ready") return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_CONFIG_MESSAGE, payload: config },
      "*"
    );
  }, [status, config, designId]);

  function retry() {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="relative h-[calc(100dvh-220px)] min-h-[480px] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 md:h-[70vh]">
      <iframe
        key={reloadKey}
        ref={iframeRef}
        src={`/api/templates/${designId}/view`}
        sandbox="allow-scripts"
        title="Invitation preview"
        className="h-full w-full"
        onLoad={handleIframeLoad}
        onError={() => setStatus("error")}
      />

      {status === "ready" && watermark && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <span className="-rotate-[20deg] whitespace-nowrap text-3xl font-semibold uppercase tracking-widest text-black/15">
            Unarway Invites &middot; Preview
          </span>
        </div>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
          <div
            aria-label="Loading preview"
            className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"
          />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-100 px-6 text-center">
          <p className="text-sm text-neutral-700">
            This preview couldn&apos;t load. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:border-neutral-500"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
