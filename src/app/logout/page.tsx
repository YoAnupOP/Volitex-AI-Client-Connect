import { logout } from "@/app/actions/auth";
import { ActionButton } from "@/app/components/action-button";

export default function LogoutPage() {
  return <main className="flex min-h-screen items-center justify-center p-6"><form action={logout}><ActionButton label="Log out" loadingLabel="Logging out…" successLabel="Logged out" className="rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950" /></form></main>;
}
