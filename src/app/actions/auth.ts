"use server";

import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth";

// Legacy client auth pages are retained as safe redirects during the magic-link migration.
export async function login() { redirect("/access-link?state=required"); }
export async function acceptInvitation() { redirect("/access-link?state=required"); }
export async function forgotPassword() { redirect("/access-link?state=required"); }
export async function resetPassword() { redirect("/access-link?state=required"); }
export async function logout() { await clearSession(); redirect("/access-link?state=required"); }
