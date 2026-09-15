"use client";

import { useEffect, useState, useTransition } from "react";
import { adminLogin } from "@/app/admin/actions";

export function AdminLoginForm() {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null); const [signedIn, setSignedIn] = useState(false);
  useEffect(() => { if (signedIn) { const timer = window.setTimeout(() => window.location.assign("/admin/clients"), 650); return () => window.clearTimeout(timer); } }, [signedIn]);
  function submit(formData: FormData) { setError(null); startTransition(async () => { const result = await adminLogin(formData); if ("error" in result) setError(result.error); else setSignedIn(true); }); }
  return <form action={submit} className="panel narrow space-y-5"><p className="eyebrow">VOLITEX AI / OPERATIONS</p><h1>Operator sign in</h1>{error && <p role="alert" className="text-amber-200">{error}</p>}<label className="block text-sm">Email<input required name="email" type="email" disabled={pending || signedIn} className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 p-3 disabled:opacity-65" /></label><label className="block text-sm">Password<input required name="password" type="password" disabled={pending || signedIn} className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 p-3 disabled:opacity-65" /></label><button disabled={pending || signedIn} className="rounded-md bg-zinc-100 px-4 py-2.5 font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-65">{pending && <span aria-hidden="true" className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]" />}{pending ? "Signing in…" : signedIn ? "Signed in" : "Sign in"}</button></form>;
}
