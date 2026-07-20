import Link from "next/link";

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
    <Link href="/login" className="mb-12 text-sm font-semibold tracking-wide text-zinc-100">VOLITEX AI <span className="text-zinc-500">/ CONNECT</span></Link>
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-7 shadow-2xl shadow-black/20">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {children}
    </section>
  </main>;
}

export function Message({ children, error = false }: { children?: React.ReactNode; error?: boolean }) {
  if (!children) return null;
  return <p className={`mt-5 rounded-md border px-3 py-2 text-sm ${error ? "border-red-900/60 bg-red-950/30 text-red-200" : "border-emerald-900/60 bg-emerald-950/30 text-emerald-200"}`}>{children}</p>;
}
