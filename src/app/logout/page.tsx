import { logout } from "@/app/actions/auth";

export default function LogoutPage() {
  return <main className="flex min-h-screen items-center justify-center p-6"><form action={logout}><button className="rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950">Log out</button></form></main>;
}
