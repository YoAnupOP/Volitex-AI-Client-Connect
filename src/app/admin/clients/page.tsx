import Link from "next/link";
import { ClientRows, type ClientRow } from "./client-rows";
import { requireAdmin } from "@/lib/auth";
import { database } from "@/lib/supabase";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin(); const { q = "" } = await searchParams;
  let query = database().from("tenants").select("id, client_name, primary_contact_name, primary_contact_email, market_code, timezone, portal_access_paused, created_at, tenant_services(provider,status), client_access_tokens(created_at,expires_at,revoked_at)").order("created_at", { ascending: false });
  if (q) query = query.ilike("client_name", `%${q}%`);
  const { data: tenants } = await query;
  const rows: ClientRow[] = (tenants ?? []).map((tenant) => {
    const links = tenant.client_access_tokens ?? []; const latest = links.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return { id: tenant.id, name: tenant.client_name, contact: tenant.primary_contact_name || tenant.primary_contact_email || "—", market: [tenant.market_code, tenant.timezone].filter(Boolean).join(" · ") || "—", services: (tenant.tenant_services ?? []).map((item) => item.provider === "whatsapp" ? "WhatsApp" : "Instagram").join(", ") || "—", access: tenant.portal_access_paused ? "Paused" : !latest ? "Not sent" : latest.revoked_at || new Date(latest.expires_at) < new Date() ? "Expired" : "Active — reusable", lifecycle: (tenant.tenant_services ?? []).map((item) => item.status.replaceAll("_", " ")).join(", ") || "—", lastActivity: latest ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(latest.created_at)) : "—", paused: tenant.portal_access_paused };
  });
  return <section className="py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">CLIENTS</p><h1 className="mt-2 text-3xl font-semibold">Connection clients</h1><p className="mt-2 text-zinc-400">A focused list of people waiting to connect or activate.</p></div><Link className="rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950" href="/admin/clients/new">New client</Link></div><form className="mt-7"><label className="sr-only" htmlFor="q">Search clients</label><input id="q" name="q" defaultValue={q} placeholder="Search business name" className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5" /></form><div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-zinc-900 text-zinc-400"><tr><th className="p-4">Client</th><th>Market</th><th>Services</th><th>Access</th><th>Lifecycle</th><th>Last activity</th><th aria-label="Quick actions" /></tr></thead><ClientRows rows={rows} /></table></div></section>;
}
