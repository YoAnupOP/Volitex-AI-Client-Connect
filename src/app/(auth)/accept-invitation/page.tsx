import { acceptInvitation } from "@/app/actions/auth";
import { AuthShell, Message } from "../auth-shell";

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="Set your password">
    <p className="mt-2 text-sm leading-6 text-zinc-400">Create a password to activate your secure client access.</p><Message error>{params.error}</Message>
    {!params.token ? <Message error>Invitation token missing.</Message> : <form action={acceptInvitation} className="mt-6 space-y-4"><input type="hidden" name="token" value={params.token} />
      <label className="block text-sm text-zinc-300">New password<input name="password" type="password" autoComplete="new-password" minLength={12} required className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 outline-none focus:border-zinc-400" /></label>
      <label className="block text-sm text-zinc-300">Confirm password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 outline-none focus:border-zinc-400" /></label>
      <button className="w-full rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white">Activate account</button>
    </form>}
  </AuthShell>;
}
