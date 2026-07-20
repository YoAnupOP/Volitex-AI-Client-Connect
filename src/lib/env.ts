function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  get appUrl() { return required("APP_URL").replace(/\/$/, ""); },
  get supabaseUrl() { return required("NEXT_PUBLIC_SUPABASE_URL"); },
  get supabaseServiceRoleKey() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
  get sessionSecret() { return required("SESSION_SECRET"); },
  get tokenEncryptionKey() { return required("TOKEN_ENCRYPTION_KEY"); },
  get metaAppId() { return required("META_APP_ID"); },
  get metaAppSecret() { return required("META_APP_SECRET"); },
  // Intentionally configured rather than pinned: Meta retires Graph versions on its own schedule.
  get metaGraphVersion() { return required("META_GRAPH_API_VERSION"); },
  get metaWhatsappConfigId() { return required("META_WHATSAPP_CONFIG_ID"); },
  get resendApiKey() { return process.env.RESEND_API_KEY; },
  get emailFrom() { return process.env.EMAIL_FROM; },
};
