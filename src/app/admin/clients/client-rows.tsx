"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type KeyboardEvent, type MouseEvent } from "react";
import { deleteClient, toggleClientAccess } from "@/app/admin/actions";

export type ClientRow = { id: string; name: string; contact: string; market: string; services: string; access: string; lifecycle: string; lastActivity: string; paused: boolean };

export function ClientRows({ rows }: { rows: ClientRow[] }) { return <tbody>{rows.map((row) => <ClientRowItem key={row.id} row={row} />)}</tbody>; }
function ClientRowItem({ row }: { row: ClientRow }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [message, setMessage] = useState<string | null>(null);
  const open = () => router.push(`/admin/clients/${row.id}`);
  const keyDown = (event: KeyboardEvent<HTMLTableRowElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } };
  const toggle = (event: MouseEvent) => { event.stopPropagation(); setMessage(null); startTransition(async () => { const result = await toggleClientAccess(row.id); if ("error" in result) setMessage(result.error ?? "Unable to update access"); else router.refresh(); }); };
  const remove = (event: MouseEvent) => { event.stopPropagation(); if (!window.confirm(`Are you sure you want to delete ${row.name}? This action cannot be undone.`)) return; setMessage(null); startTransition(async () => { const result = await deleteClient(row.id); if ("error" in result) setMessage(result.error ?? "Unable to delete client"); else router.refresh(); }); };
  return <tr role="link" tabIndex={0} onClick={open} onKeyDown={keyDown} className="cursor-pointer border-t border-zinc-800 transition-colors hover:bg-zinc-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-200"><td className="p-4"><p className="font-medium">{row.name}</p><p className="mt-1 text-zinc-500">{row.contact}</p>{message && <p role="alert" className="mt-1 text-xs text-amber-200">{message}</p>}</td><td>{row.market}</td><td>{row.services}</td><td>{row.access}</td><td>{row.lifecycle}</td><td>{row.lastActivity}</td><td className="p-3"><div className="flex justify-end gap-1"><button type="button" onClick={toggle} disabled={pending} aria-label={row.paused ? `Resume ${row.name} portal access` : `Pause ${row.name} portal access`} title={row.paused ? "Resume portal access" : "Pause portal access"} className="rounded p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50">{row.paused ? "▶" : "Ⅱ"}</button><button type="button" onClick={remove} disabled={pending} aria-label={`Delete ${row.name}`} title="Delete client" className="rounded p-2 text-zinc-300 hover:bg-red-950 hover:text-red-200 disabled:opacity-50">⌫</button></div></td></tr>;
}
