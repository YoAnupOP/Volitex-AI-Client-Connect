import { requireSession } from "@/lib/auth";
import { getTenant, getTenantServices } from "@/lib/connection";
import { ConnectionCard } from "./connection-card";
import { logout } from "@/app/actions/auth";

const displayDate = (value?: string) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string; pendingPhone?: string }> }) {
  const session = await requireSession(); const [tenant, services] = await Promise.all([getTenant(session.tenantId), getTenantServices(session.tenantId)]); const params = await searchParams;
  const whatsapp = tenant.meta_connection_metadata?.whatsapp; const instagram = tenant.meta_connection_metadata?.instagram;
  const whatsappConnected = Boolean(tenant.waba_id && tenant.phone_number_id && whatsapp); const instagramConnected = Boolean(tenant.instagram_business_account_id && instagram);
  const live = services.length > 0 && services.every((service) => service.status === "live");
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-8 sm:px-10"><header className="flex items-center justify-between border-b border-zinc-800 pb-6"><div><p className="text-sm font-semibold tracking-wide text-zinc-100">VOLITEX AI <span className="text-zinc-500">/ CONNECT</span></p><p className="mt-1 text-sm text-zinc-500">{tenant.client_name}</p></div><form action={logout}><button className="text-sm text-zinc-400 hover:text-zinc-100">Leave for now</button></form></header>
    <div className="pt-12"><h1 className="text-3xl font-semibold tracking-tight">{live ? "Your automation is live." : `Welcome${tenant.primary_contact_name ? `, ${tenant.primary_contact_name}` : ""}. Let’s get you ready.`}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">{live ? "Volitex has completed your setup." : "Meta will open a secure window. Please sign in as a business admin; Volitex never sees your Meta password and your current chats will not be interrupted."}</p>
      {params.error && <p role="alert" className="mt-6 rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">{params.error}</p>}{params.connected && <p className="mt-6 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">{params.pendingPhone ? "WhatsApp account received — select or add your business number in Meta, then continue." : "Connection received — Volitex is preparing your automation."}</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2">{services.filter((service) => service.status !== "disabled").map((service) => service.provider === "whatsapp" ? <ConnectionCard key="whatsapp" provider="whatsapp" title="WhatsApp Business" connected={whatsappConnected} status={service.status} details={whatsapp ? [whatsapp.businessName ?? tenant.client_name, `Received ${displayDate(whatsapp.connectedAt)}`] : []} /> : <ConnectionCard key="instagram" provider="instagram" title="Instagram Professional" connected={instagramConnected} status={service.status} details={instagram ? [`@${instagram.username}`, `Received ${displayDate(instagram.connectedAt)}`] : []} />)}</div>
      <p className="mt-8 text-sm text-zinc-500">Need a change? <a className="text-zinc-200 underline" href="/support">Contact your Volitex AI specialist</a>.</p>
    </div></main>;
}
