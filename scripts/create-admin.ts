import bcrypt from "bcryptjs";
import { loadEnvConfig } from "@next/env";
import { database } from "../src/lib/supabase";
loadEnvConfig(process.cwd());
const argument = (name: string) => {
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  const inline = process.argv.find((value) => value.startsWith(`${name}=`));
  return inline?.slice(name.length + 1);
};
async function main() {
  const email = argument("--email")?.trim().toLowerCase(); const password = argument("--password"); const role = argument("--role") ?? "owner";
  if (!email || !password || password.length < 12 || !["owner", "operator"].includes(role)) throw new Error("Usage: npm run create-admin -- --email <address> --password <12+ chars> [--role owner|operator]");
  const { error } = await database().from("admin_users").upsert({ email, password_hash: await bcrypt.hash(password, 12), role, is_active: true }, { onConflict: "email" });
  if (error) throw error; console.log(`Admin ${email} is ready to sign in at /admin/login.`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
