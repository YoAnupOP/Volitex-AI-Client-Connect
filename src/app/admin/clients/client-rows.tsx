"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { ClientAccessActions } from "./client-access-actions";

export type ClientRow = { id: string; name: string; contact: string; market: string; services: string; access: string; lifecycle: string; lastActivity: string; paused: boolean };
export function ClientRows({ rows }: { rows: ClientRow[] }) { return <tbody>{rows.map((row) => <ClientRowItem key={row.id} row={row} />)}</tbody>; }
function ClientRowItem({ row }: { row: ClientRow }) {
  const router = useRouter(); const open = () => router.push(`/admin/clients/${row.id}`);
  const keyDown = (event: KeyboardEvent<HTMLTableRowElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } };
  return <tr role="link" tabIndex={0} onClick={open} onKeyDown={keyDown} className="cursor-pointer border-t border-zinc-800 transition-colors hover:bg-zinc-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-200"><td className="p-4"><p className="font-medium">{row.name}</p><p className="mt-1 text-zinc-500">{row.contact}</p></td><td>{row.market}</td><td>{row.services}</td><td>{row.access}</td><td>{row.lifecycle}</td><td>{row.lastActivity}</td><td className="p-3"><ClientAccessActions tenantId={row.id} clientName={row.name} paused={row.paused} compact /></td></tr>;
}
