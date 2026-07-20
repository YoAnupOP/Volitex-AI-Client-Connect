import Link from "next/link";
import { forgotPassword } from "@/app/actions/auth";
import { AuthShell, Message } from "../auth-shell";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="Reset password"><p className="mt-2 text-sm leading-6 text-zinc-400">Enter your invited email address. If it is registered, we’ll send a reset link.</p><Message error>{params.error}</Message><Message>{params.sent ? "If an account exists, a reset link has been sent." : undefined}</Message>
    <form action={forgotPassword} className="mt-6 space-y-4"><label className="block text-sm text-zinc-300">Email<input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 outline-none focus:border-zinc-400" /></label><button className="w-full rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white">Send reset link</button></form>
    <Link href="/login" className="mt-5 block text-sm text-zinc-400 hover:text-zinc-100">Back to sign in</Link></AuthShell>;
}
