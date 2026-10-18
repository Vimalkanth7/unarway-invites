"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SchemaEditor } from "@/components/editor/SchemaEditor";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import { PayButton } from "@/components/design/PayButton";
import { PublishedShare } from "@/components/design/PublishedShare";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { COUPLE_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { siteConfig } from "@/lib/config";
import type { DesignConfig, TemplateBundle } from "@/types/template";
import type { InvitationStatus } from "@/types/invitation";

const AUTOSAVE_DELAY_MS = 1200;

type SaveState = "idle" | "saving" | "saved" | "error";
type SaveError = { code: string; message: string };
type DownloadState = "idle" | "preparing" | "error";

function toSaveError(err: unknown): SaveError {
  if (err && typeof err === "object") {
    const record = err as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : "unknown";
    const message = typeof record.message === "string" ? record.message : "Something went wrong.";
    return { code, message };
  }
  return { code: "unknown", message: "Something went wrong." };
}

export function DesignWorkspace({
  bundle,
  price,
  userId,
  initialInvitationId,
  initialStatus,
  initialShortId,
  initialPaidAt,
  initialConfig,
  initialPhotoPaths,
  loadFailed,
}: {
  bundle: TemplateBundle;
  price: number;
  userId: string | null;
  initialInvitationId: string | null;
  initialStatus: InvitationStatus;
  initialShortId: string | null;
  initialPaidAt: string | null;
  initialConfig: DesignConfig;
  initialPhotoPaths: Record<string, string>;
  /** True when a ?invitation= was requested but the server couldn't load it -- see page.tsx. */
  loadFailed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [config, setConfig] = useState(initialConfig);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [invitationId, setInvitationId] = useState(initialInvitationId);
  const [status, setStatus] = useState<InvitationStatus>(initialStatus);
  const [shortId, setShortId] = useState(initialShortId);
  const [paidAt, setPaidAt] = useState(initialPaidAt);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");

  const invitationIdRef = useRef(initialInvitationId);
  const photoPathsRef = useRef(initialPhotoPaths);
  const dirtyRef = useRef(false);
  const creatingRef = useRef<Promise<string> | null>(null);

  function updateConfig(next: DesignConfig) {
    dirtyRef.current = true;
    setConfig(next);
  }

  // Shared by autosave (below) and the Pay button: both need a real
  // invitation row to exist, created lazily on whichever happens first.
  const ensureInvitation = useCallback(async (): Promise<string> => {
    if (invitationIdRef.current) return invitationIdRef.current;
    if (!creatingRef.current) {
      const supabase = createSupabaseBrowserClient();
      creatingRef.current = (async () => {
        const { data, error } = await supabase
          .from("invitations")
          .insert({ design_id: bundle.meta.id, title: bundle.meta.title, user_id: userId })
          .select("id, short_id")
          .single();
        if (error || !data) throw error ?? new Error("Insert returned no row");
        invitationIdRef.current = data.id as string;
        setInvitationId(data.id as string);
        setShortId(data.short_id as string);
        router.replace(`${pathname}?invitation=${data.id}`, { scroll: false });
        return data.id as string;
      })().catch((err) => {
        // Let the next attempt retry instead of replaying this same rejection forever.
        creatingRef.current = null;
        throw err;
      });
    }
    return creatingRef.current;
  }, [bundle.meta.id, bundle.meta.title, pathname, router, userId]);

  useEffect(() => {
    // loadFailed means a specific draft was requested by id but the server
    // couldn't load it -- autosaving now would silently create a brand-new
    // row instead of resuming the one the user actually meant to edit.
    if (!userId || !dirtyRef.current || loadFailed) return;

    const timer = setTimeout(() => {
      void persist();
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);

    async function persist() {
      setSaveState("saving");
      setSaveError(null);
      try {
        const supabase = createSupabaseBrowserClient();

        // The anon-key browser client only gets RLS-scoped access when its
        // session cookie actually matches the user the server rendered this
        // page for. If it doesn't, every write below would hit RLS -- surface
        // that explicitly instead of letting a mismatched/absent session
        // produce a confusing partial failure.
        const {
          data: { user: sessionUser },
        } = await supabase.auth.getUser();
        if (!sessionUser || sessionUser.id !== userId) {
          throw {
            code: "session_mismatch",
            message: "Your session isn't active in this tab. Sign in again and retry.",
          };
        }

        const id = await ensureInvitation();
        const configToPersist: DesignConfig = { ...config };

        for (const field of bundle.schema) {
          if (field.type !== "photo") continue;
          const value = config[field.key];
          if (!value) continue;

          if (value.startsWith("data:")) {
            const path = `${userId}/${id}/${field.key}.jpg`;
            const blob = await (await fetch(value)).blob();
            const { error } = await supabase.storage
              .from(COUPLE_PHOTOS_BUCKET)
              .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
            if (error) throw error;
            photoPathsRef.current[field.key] = path;
            configToPersist[field.key] = path;
          } else if (value.startsWith("http") && photoPathsRef.current[field.key]) {
            configToPersist[field.key] = photoPathsRef.current[field.key];
          }
        }

        const { data: updated, error } = await supabase
          .from("invitations")
          .update({ config: configToPersist })
          .eq("id", id)
          .select("id")
          .single();
        // Supabase/PostgREST does not error when an update's WHERE clause
        // (here, narrowed further by the RLS policy) matches zero rows --
        // without re-selecting the row, a save that silently touched
        // nothing looks identical to a real success.
        if (error || !updated) throw error ?? new Error("Update matched no row");

        dirtyRef.current = false;
        setSaveState("saved");
      } catch (err) {
        console.error("Autosave failed:", err);
        setSaveState("error");
        setSaveError(toSaveError(err));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, userId, ensureInvitation, loadFailed]);

  async function handleDownload() {
    if (!invitationId) return;
    setDownloadState("preparing");
    try {
      const res = await fetch(`/api/invitations/${invitationId}/download`, { method: "POST" });
      const result = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !result.url) throw new Error(result.error ?? "Could not prepare download");
      window.location.href = result.url;
      setDownloadState("idle");
    } catch (err) {
      console.error("Download failed:", err);
      setDownloadState("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {loadFailed && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Couldn&apos;t load your saved draft.</p>
          <p className="mt-1">
            Editing here would start a brand-new draft instead of resuming the one you meant to
            open.{" "}
            <button type="button" onClick={() => window.location.reload()} className="underline">
              Reload
            </button>{" "}
            to try again.
          </p>
        </div>
      )}
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
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => updateConfig(bundle.defaults)}
              className="text-xs text-neutral-600 underline"
            >
              Reset to defaults
            </button>
            <SaveIndicator userId={userId} state={saveState} error={saveError} />
          </div>
          <SchemaEditor schema={bundle.schema} value={config} onChange={updateConfig} designId={bundle.meta.id} />
        </div>
        <div className={activeTab === "preview" ? "block" : "hidden md:block"}>
          <PreviewFrame designId={bundle.meta.id} config={config} />
        </div>
      </div>

      {status === "paid" && shortId ? (
        <div className="flex flex-col gap-3">
          <PublishedShare
            shortId={shortId}
            paidAt={paidAt}
            expiryMonths={siteConfig.hostedLinkExpiryMonths}
          />
          {siteConfig.enableZipDownload && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-4">
              <p className="text-sm text-neutral-700">Prefer a file? You can still download the ZIP.</p>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloadState === "preparing"}
                  className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {downloadState === "preparing" ? "Preparing…" : "Download ZIP"}
                </button>
                {downloadState === "error" && (
                  <p className="text-xs text-red-600">Couldn&apos;t prepare the download. Try again.</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm text-neutral-700">Publish to get a shareable link.</p>
          {loadFailed ? (
            <span className="text-xs text-amber-700">Reload before publishing.</span>
          ) : userId ? (
            <PayButton
              price={price}
              getInvitationId={ensureInvitation}
              onPaid={() => {
                setStatus("paid");
                setPaidAt(new Date().toISOString());
              }}
            />
          ) : (
            <a
              href="/login"
              className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-900 hover:border-neutral-500"
            >
              Sign in to buy
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function SaveIndicator({
  userId,
  state,
  error,
}: {
  userId: string | null;
  state: SaveState;
  error: SaveError | null;
}) {
  if (!userId) {
    return (
      <a href="/login" className="text-xs text-neutral-500 underline">
        Sign in to save your progress
      </a>
    );
  }
  if (state === "saving") return <span className="text-xs text-neutral-500">Saving&hellip;</span>;
  if (state === "saved") return <span className="text-xs text-emerald-600">Saved</span>;
  if (state === "error") {
    return (
      <span className="text-right text-xs text-red-600">
        Couldn&apos;t save
        {error && (
          <>
            <br />
            <span className="text-neutral-400">
              {error.code}: {error.message}
            </span>
          </>
        )}
      </span>
    );
  }
  return null;
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
