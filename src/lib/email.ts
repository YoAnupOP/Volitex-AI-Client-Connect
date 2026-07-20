import { env } from "@/lib/env";

export async function sendPasswordReset(email: string, url: string) {
  if (!env.resendApiKey || !env.emailFrom) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`Password reset link for ${email}: ${url}`);
      return;
    }
    throw new Error("Password reset email is not configured");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.emailFrom, to: [email], subject: "Reset your Volitex AI Connect password",
      html: `<p>Use the secure link below to reset your Volitex AI Connect password.</p><p><a href="${url}">Reset password</a></p><p>This link expires in one hour.</p>`,
    }),
  });
  if (!response.ok) throw new Error("Unable to send password reset email");
}
