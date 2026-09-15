# Volitex AI Client Connect

Invite-only portal for clients to connect WhatsApp Business and Instagram Business assets after onboarding with Volitex AI.

## Deploy

1. Apply [`supabase/migrations/20260719_connect_portal.sql`](./supabase/migrations/20260719_connect_portal.sql), [`supabase/migrations/20260914_whatsapp_embedded_signup_v4.sql`](./supabase/migrations/20260914_whatsapp_embedded_signup_v4.sql), [`supabase/migrations/20260915_client_magic_links_and_admin.sql`](./supabase/migrations/20260915_client_magic_links_and_admin.sql), and [`supabase/migrations/20260916_reusable_client_access_links.sql`](./supabase/migrations/20260916_reusable_client_access_links.sql), in that order.
2. Copy `.env.example` to `.env.local` and set every required value.
3. In Meta, configure these exact redirect and allowed domains:
   - Instagram OAuth redirect: `https://connect.volitexai.tech/api/connect/instagram/callback`
   - JavaScript SDK domain and a Facebook Login for Business allowed domain/valid OAuth redirect entry: `connect.volitexai.tech`
   - Add every HTTPS staging or development host used to test Embedded Signup to both Facebook Login for Business lists.
   - WhatsApp Embedded Signup configuration ID: `META_WHATSAPP_CONFIG_ID`
4. Set `META_GRAPH_API_VERSION` to Meta’s currently supported Graph API version when deploying; this is intentionally an environment setting, not application code.
   Set `META_WHATSAPP_REGISTRATION_PIN` to the six-digit two-step verification PIN used to register fresh Cloud API phone numbers. It is not used for WhatsApp Business app Coexistence numbers.
5. Deploy to Vercel. The Supabase service-role key and token-encryption key must remain server-only environment variables.

The app stores encrypted access-token envelopes directly in the existing `tenants.meta_access_token` and `tenants.instagram_access_token` fields. `meta_connection_metadata` carries display/audit metadata; the v4 migration adds explicit WhatsApp onboarding and synchronization columns.

For WhatsApp Embedded Signup v4, the additive tenant columns record the customer business ID, onboarding type, Coexistence deadline, and one-time contacts/history sync request state. The portal subscribes each customer WABA and begins Coexistence syncs in the finish endpoint; webhook digestion remains owned by the configured inbox callback service.

## Create an operator and client

After applying the migrations, create the first owner once:

```sh
npm run create-admin -- --email owner@volitex.example --password "a-long-unique-password"
```

Sign in at `/admin/login`, then use **New client** to create the tenant, choose the purchased service scope, and generate its secure access link. It remains reusable from any device for 24 hours; regenerating it revokes the previous link.

## Security model

- Client links are random reusable 24-hour credentials stored only as SHA-256 hashes; the client has no password or login screen. Admin passwords use bcrypt (cost 12).
- Client and admin sessions are separate signed, `httpOnly`, `Secure` (production), `SameSite=Lax` cookies.
- OAuth state is signed, short lived, tied to the current session, and also matched against a short-lived `httpOnly` cookie.
- Meta tokens use AES-256-GCM encryption at rest; no route or browser payload returns them.
- Supabase is accessed only with a server-side service-role client. Client-access and admin tables have RLS enabled with no browser policy.

## Meta readiness

Before using real clients, complete Meta App Review / Advanced Access for the exact permissions and WhatsApp Embedded Signup configuration needed by the agency’s Meta app. Test each flow against a Meta test business before switching the app live.
