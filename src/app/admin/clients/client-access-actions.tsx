"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type KeyboardEvent, type MouseEvent } from "react";
import { deleteClient, toggleClientAccess } from "@/app/admin/actions";

export function ClientAccessActions({ tenantId, clientName, paused, compact = false, onAction }: { tenantId: string; clientName: string; paused: boolean; compact?: boolean; onAction?: () => void }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  const stop = (event: MouseEvent) => event.stopPropagation();
  const toggle = (event: MouseEvent) => { stop(event); setError(null); startTransition(async () => { const result = await toggleClientAccess(tenantId); if ("error" in result) setError(result.error ?? "Unable to update client access"); else { onAction?.(); router.refresh(); } }); };
  const remove = (event: MouseEvent) => { stop(event); if (!window.confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) return; setError(null); startTransition(async () => { const result = await deleteClient(tenantId); if ("error" in result) setError(result.error ?? "Unable to delete client"); else router.push("/admin/clients"); }); };
  const pauseLabel = paused ? "Resume client access" : "Pause client access";
  return <div className={compact ? "flex justify-end gap-1" : "flex flex-wrap items-center gap-2"} onClick={stop} onKeyDown={(event: KeyboardEvent) => event.stopPropagation()}>{error && <p role="alert" className="w-full text-xs text-amber-200">{error}</p>}<button type="button" onClick={toggle} disabled={pending} aria-label={pauseLabel} title={pauseLabel} className={compact ? "rounded-md p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50" : "inline-flex items-center gap-2 rounded-md border border-zinc-600 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-400 disabled:opacity-50"}><PauseIcon paused={paused} />{!compact && pauseLabel}</button><button type="button" onClick={remove} disabled={pending} aria-label="Delete client" title="Delete client" className={compact ? "rounded-md p-2 text-zinc-300 hover:bg-red-950 hover:text-red-200 disabled:opacity-50" : "inline-flex items-center gap-2 rounded-md border border-red-900/70 px-3 py-2 text-sm text-red-200 hover:bg-red-950/40 disabled:opacity-50"}><TrashIcon />{!compact && "Delete client"}</button></div>;
}
function PauseIcon({ paused }: { paused: boolean }) { return paused ? <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M8 5v14l11-7z" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>; }
function TrashIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 7h16M10 11v6m4-6v6M9 7l1-3h4l1 3m-9 0 1 13h10l1-13" /></svg>; }
