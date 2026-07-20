import Link from "next/link";
import { login } from "@/app/actions/auth";
import { AuthShell, Message } from "../auth-shell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="Sign in to Connect">
    <p className="mt-2 text-sm leading-6 text-zinc-400">Use the email address invited by Volitex AI.</p>
    <Message error>{params.error}</Message><Message>{params.message}</Message>
    <form action={login} className="mt-6 space-y-4">
      <label className="block text-sm text-zinc-300">Email<input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 outline-none focus:border-zinc-400" /></label>
      <label className="block text-sm text-zinc-300">Password<input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 outline-none focus:border-zinc-400" /></label>
      <button className="w-full rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white">Sign in</button>
    </form>
    <Link href="/forgot-password" className="mt-5 block text-sm text-zinc-400 hover:text-zinc-100">Forgot password?</Link>
  </AuthShell>;
}
