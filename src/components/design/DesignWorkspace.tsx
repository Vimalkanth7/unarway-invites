"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SchemaEditor } from "@/components/editor/SchemaEditor";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { COUPLE_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import type { DesignConfig, TemplateBundle } from "@/types/template";

const AUTOSAVE_DELAY_MS = 1200;

type SaveState = "idle" | "saving" | "saved" | "error";
type SaveError = { code: string; message: string };

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
  initialConfig,
  initialPhotoPaths,
}: {
  bundle: TemplateBundle;
  price: number;
  userId: string | null;
  initialInvitationId: string | null;
  initialConfig: DesignConfig;
  initialPhotoPaths: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [config, setConfig] = useState(initialConfig);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<SaveError | null>(null);

  const invitationIdRef = useRef(initialInvitationId);
  const photoPathsRef = useRef(initialPhotoPaths);
  const dirtyRef = useRef(false);
  const creatingRef = useRef<Promise<string> | null>(null);

  function updateConfig(next: DesignConfig) {
    dirtyRef.current = true;
    setConfig(next);
  }

  useEffect(() => {
    if (!userId || !dirtyRef.current) return;

    const timer = setTimeout(() => {
      void persist();
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);

    async function ensureInvitation(
      supabase: ReturnType<typeof createSupabaseBrowserClient>
    ): Promise<string> {
      if (invitationIdRef.current) return invitationIdRef.current;
      if (!creatingRef.current) {
        creatingRef.current = (async () => {
          const { data, error } = await supabase
            .from("invitations")
            .insert({ design_id: bundle.meta.id, title: bundle.meta.title, user_id: userId })
            .select("id")
            .single();
          if (error || !data) throw error ?? new Error("Insert returned no row");
          invitationIdRef.current = data.id as string;
          router.replace(`${pathname}?invitation=${data.id}`, { scroll: false });
          return data.id as string;
        })().catch((err) => {
          // Let the next autosave attempt retry instead of replaying this
          // same rejection forever.
          creatingRef.current = null;
          throw err;
        });
      }
      return creatingRef.current;
    }

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

        const id = await ensureInvitation(supabase);
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
  }, [config, userId]);

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
          <SchemaEditor schema={bundle.schema} value={config} onChange={updateConfig} />
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
