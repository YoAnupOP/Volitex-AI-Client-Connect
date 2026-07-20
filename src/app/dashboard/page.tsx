import { requireSession } from "@/lib/auth";
import { getTenant } from "@/lib/connection";
import { ConnectionCard } from "./connection-card";
import { logout } from "@/app/actions/auth";

const displayDate = (value?: string) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const session = await requireSession(); const tenant = await getTenant(session.tenantId); const params = await searchParams;
  const whatsapp = tenant.meta_connection_metadata?.whatsapp; const instagram = tenant.meta_connection_metadata?.instagram;
  const whatsappConnected = Boolean(tenant.waba_id && tenant.phone_number_id && whatsapp); const instagramConnected = Boolean(tenant.instagram_business_account_id && instagram);
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-8 sm:px-10"><header className="flex items-center justify-between border-b border-zinc-800 pb-6"><div><p className="text-sm font-semibold tracking-wide text-zinc-100">VOLITEX AI <span className="text-zinc-500">/ CONNECT</span></p><p className="mt-1 text-sm text-zinc-500">{tenant.client_name}</p></div><form action={logout}><button className="text-sm text-zinc-400 hover:text-zinc-100">Log out</button></form></header>
    <div className="pt-12"><h1 className="text-2xl font-semibold tracking-tight">Your connections</h1><p className="mt-2 text-sm text-zinc-400">Connect the Meta assets Volitex AI uses for your automation.</p>
      {params.error && <p role="alert" className="mt-6 rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">{params.error}</p>}{params.connected && <p className="mt-6 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{params.connected === "whatsapp" ? "WhatsApp Business" : "Instagram Business"} connected.</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2"><ConnectionCard provider="whatsapp" title="WhatsApp Business" connected={whatsappConnected} details={whatsapp ? [whatsapp.businessName, `Connected ${displayDate(whatsapp.connectedAt)}`] : []} /><ConnectionCard provider="instagram" title="Instagram Business" connected={instagramConnected} details={instagram ? [`@${instagram.username}`, `Connected ${displayDate(instagram.connectedAt)}`] : []} /></div>
    </div></main>;
}
