"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    FB?: { init: (config: Record<string, unknown>) => void; login: (callback: (response: { authResponse?: { code?: string; userID?: string } }) => void, options: Record<string, unknown>) => void };
    fbAsyncInit?: () => void;
  }
}

type Provider = "whatsapp" | "instagram";
type CardProps = { provider: Provider; connected: boolean; title: string; details?: string[] };

function loadFacebookSdk(appId: string, version: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.FB) return resolve();
    let initialized = false;
    const initialize = () => {
      if (initialized || !window.FB) return;
      initialized = true;
      window.FB.init({ appId, cookie: true, xfbml: false, version });
      resolve();
    };
    window.fbAsyncInit = initialize;
    const script = document.createElement("script"); script.async = true; script.defer = true; script.crossOrigin = "anonymous"; script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onload = initialize;
    script.onerror = () => reject(new Error("Unable to load Meta")); document.head.appendChild(script);
  });
}

export function ConnectionCard({ provider, connected, title, details = [] }: CardProps) {
  const [working, setWorking] = useState(false); const [error, setError] = useState<string | null>(null);
  const code = useRef<string | undefined>(undefined); const asset = useRef<{ wabaId?: string; phoneNumberId?: string; facebookUserId?: string }>({}); const state = useRef<string | undefined>(undefined); const submitted = useRef(false);

  const finish = useCallback(async () => {
    if (submitted.current || !code.current || !state.current || !asset.current.wabaId || !asset.current.phoneNumberId) return;
    submitted.current = true;
    const response = await fetch("/api/connect/whatsapp/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.current, state: state.current, ...asset.current }) });
    if (!response.ok) { submitted.current = false; setWorking(false); setError((await response.json()).error ?? "Unable to connect WhatsApp"); return; }
    window.location.assign("/dashboard?connected=whatsapp");
  }, []);

  useEffect(() => {
    if (provider !== "whatsapp") return;
    const listener = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com") return;
      let payload: { type?: string; event?: string; data?: { waba_id?: string; phone_number_id?: string } };
      try { payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      if (payload.type !== "WA_EMBEDDED_SIGNUP") return;
      if (payload.event === "FINISH") { asset.current = { wabaId: payload.data?.waba_id, phoneNumberId: payload.data?.phone_number_id }; finish(); }
      if (payload.event === "ERROR" || payload.event === "CANCEL") { setWorking(false); setError("WhatsApp signup was not completed."); }
    };
    window.addEventListener("message", listener); return () => window.removeEventListener("message", listener);
  }, [provider, finish]);

  async function connectWhatsapp() {
    setWorking(true); setError(null); submitted.current = false; code.current = undefined; asset.current = {};
    try {
      const start = await fetch("/api/connect/whatsapp/start", { method: "POST" });
      if (!start.ok) throw new Error("Please sign in again");
      const config = await start.json() as { configurationId: string; graphVersion: string };
      state.current = start.headers.get("X-Volitex-OAuth-State") ?? undefined;
      if (!state.current) throw new Error("Unable to secure WhatsApp authorization");
      const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (!facebookAppId) throw new Error("WhatsApp connection is not configured");
      await loadFacebookSdk(facebookAppId, config.graphVersion);
      if (!window.FB) throw new Error("Unable to initialize the Facebook SDK");
      window.FB.login((response) => { code.current = response.authResponse?.code; asset.current.facebookUserId = response.authResponse?.userID; if (!code.current) { setWorking(false); setError("WhatsApp signup was cancelled or could not be authorized."); return; } finish(); }, {
        config_id: config.configurationId,
        response_type: "code",
        override_default_response_type: true,
        state: state.current,
        extras: { version: "v4" },
      });
    } catch (cause) { setWorking(false); setError(cause instanceof Error ? cause.message : "Unable to start WhatsApp signup"); }
  }

  async function disconnectAccount() {
    if (!window.confirm(`Disconnect ${title}?`)) return;
    setWorking(true); setError(null);
    const response = await fetch(`/api/connect/${provider}`, { method: "DELETE" });
    if (response.ok) window.location.assign("/dashboard"); else { setWorking(false); setError("Unable to disconnect account."); }
  }

  const action = provider === "instagram" ? () => { window.location.assign("/api/connect/instagram/start"); } : connectWhatsapp;
  return <section className="flex min-h-72 flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold">{title}</h2><p className={`mt-3 inline-flex items-center gap-2 text-sm ${connected ? "text-emerald-300" : "text-zinc-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-zinc-600"}`} />{connected ? "Connected" : "Not connected"}</p></div></div>
    <div className="mt-7 flex-1 space-y-2 text-sm text-zinc-400">{connected ? details.map((detail) => <p key={detail}>{detail}</p>) : <p>Connect your business account securely through Meta.</p>}</div>
    {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
    <div className="flex gap-3"><button disabled={working} onClick={action} className="rounded-md bg-zinc-100 px-3.5 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">{working ? "Connecting…" : connected ? "Reconnect" : "Connect"}</button>{connected && <button disabled={working} onClick={disconnectAccount} className="rounded-md border border-zinc-700 px-3.5 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-60">Disconnect</button>}</div>
  </section>;
}
