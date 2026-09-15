import { requireAdmin } from "@/lib/auth";
import { NewClientForm } from "./new-client-form";

export default async function NewClient({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin(); const { error } = await searchParams;
  return <section className="py-10"><p className="eyebrow">NEW CLIENT</p><h1 className="mt-2 text-3xl font-semibold">Set up a connection</h1><p className="mt-2 text-zinc-400">Create the client record first, then share one secure link.</p><NewClientForm serverError={error} /></section>;
}
