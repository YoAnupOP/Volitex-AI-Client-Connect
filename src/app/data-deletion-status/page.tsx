export default async function DataDeletionStatusPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
    <section className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-7">
      <p className="text-sm font-semibold tracking-wide text-zinc-100">VOLITEX AI <span className="text-zinc-500">/ CONNECT</span></p>
      <h1 className="mt-8 text-xl font-semibold tracking-tight">Data deletion request received</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">Your Instagram connection data has been removed from Volitex AI Connect.</p>
      {id && <p className="mt-6 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">Reference: <span className="font-mono text-zinc-100">{id}</span></p>}
    </section>
  </main>;
}
