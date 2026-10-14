"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { InvitationRow } from "@/types/invitation";

type Row = Pick<InvitationRow, "id" | "design_id" | "title" | "status" | "updated_at">;

export function InvitationsList({
  invitations,
  designTitles,
}: {
  invitations: Row[];
  designTitles: Record<string, string>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(invitations);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function saveRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("invitations").update({ title }).eq("id", id);
    if (!error) {
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, title } : row)));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this invitation? This can't be undone.")) return;

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (!error) {
      setRows((prev) => prev.filter((row) => row.id !== id));
      router.refresh();
    }
  }

  return (
    <ul className="mt-6 flex flex-col gap-3">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            {renamingId === row.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => saveRename(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename(row.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="min-h-[36px] w-full max-w-xs rounded-lg border border-neutral-300 px-2 py-1 text-sm"
              />
            ) : (
              <p className="truncate text-sm font-medium text-neutral-900">{row.title}</p>
            )}
            <p className="mt-0.5 text-xs text-neutral-500">
              {designTitles[row.design_id] ?? row.design_id} &middot;{" "}
              {row.status === "paid" ? "Paid" : "Draft"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/design/${row.design_id}?invitation=${row.id}`} className="underline">
              Open
            </Link>
            <button
              type="button"
              onClick={() => {
                setRenamingId(row.id);
                setRenameValue(row.title);
              }}
              className="text-neutral-600 underline"
            >
              Rename
            </button>
            <button type="button" onClick={() => handleDelete(row.id)} className="text-red-600 underline">
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
