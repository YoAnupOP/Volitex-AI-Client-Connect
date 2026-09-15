# Volitex AI Connect — UI/UX and Admin Implementation Plan (Revised)

## Product decision

Volitex AI Connect is a small, private client connection portal for a managed service. It is **not** a client dashboard, inbox, analytics tool, or self-service automation builder.

Its job is simple:

1. A Volitex operator creates a client profile after a deal closes.
2. The operator selects the automation service sold: WhatsApp, Instagram, or both.
3. The client securely connects only the Meta assets relevant to that service.
4. Volitex receives the connection, configures Chatwoot/n8n manually, tests it, and confirms go-live.

The product should feel premium, calm, guided, and friendly — not like a bank, technical console, or enterprise dashboard.

## Experience principles

- Show one clear next step at a time.
- Use plain language. Never show clients WABA IDs, OAuth codes, access tokens, Graph API terminology, or Coexistence terminology.
- Tell clients what will happen before Meta opens, and what happens after they finish.
- Use positive language: "Let's get you ready", "Connection received", "We'll take care of the technical setup."
- Let the client safely stop and return later.
- Display only the channels they purchased.
- Keep the operational/admin experience focused; no decorative KPIs or fake dashboard metrics.

## Visual direction

### Typography

Replace Arial/Helvetica with **Manrope** as the primary typeface, loaded through `next/font/google`.

Why Manrope:
- Modern, friendly, and premium without looking playful.
- Rounded humanist forms feel warmer than a generic system font.
- Stays readable on Indian and international mobile devices.
- Works well with the black/charcoal/white Volitex brand.

Weights: 400 (body/helper text), 500 (headings/labels/secondary actions), 600 (primary actions/brand wordmark).
Scale: 14px body, 16px card headings, 28–36px page headings. Avoid oversized display type and tiny grey text.

### Colour and motion

- Maintain the black/charcoal/off-white brand. No bright SaaS gradients or neon accents.
- White/off-white for the one primary action.
- Green only for confirmed success, amber only for "needs attention" — never rely on colour alone.
- 160–220ms transitions for hover/progress/card changes.
- Respect `prefers-reduced-motion`; no looping animations or distracting loaders.

## Authentication: magic-link only, no passwords

Client authorization remains required because this portal handles sensitive business-asset connections — but it should feel like a private, single-purpose link, not an account system.

### How it works

There is exactly **one** client access mechanism: a secure, single-use, short-lived **magic link**.

1. The operator creates the client profile (business name, contact, market, timezone, service scope) in the admin panel — the tenant record exists in full before the client ever visits the portal.
2. The operator clicks **"Generate Access Link"**. The system creates a cryptographically random token, stores only its hash + an expiry in the database, and shows the plain link once to the operator.
3. The operator delivers that link however is convenient that day:
   - **Copy Link** — paste into WhatsApp (expected to be the primary channel), no extra dependency required.
   - **Send via Email** — same link, sent via an email provider (e.g. Resend) when the operator prefers email that time.
4. The client clicks the link. This authenticates them directly into their existing tenant record and lands them on the Meta connect flow (or their current status screen, if they've already connected).
5. If the link expires, is already used, or the client needs to come back later (e.g. connecting Instagram after WhatsApp in a "both" deal), the operator generates a **new link against the same tenant record** from Client Detail. No new account is created; nothing about the client's identity or history is lost.

There is no password anywhere in the client-facing flow — no client-set password, no operator-set password, no forced password-change, no "forgot password," no login form at all. The client never types a credential; the link itself is the credential.

### Client access UX

- The link opens straight into the client's session — no separate login screen.
- Expired or already-used link: "This link has expired. Please contact your Volitex specialist for a new one," with a visible specialist contact method.
- Returning client who has already connected: show their current status calmly (e.g. "Connection received — Volitex is preparing your automation") rather than re-showing the connect CTA.

### Security boundaries

- Access tokens are single-use, short-lived, and stored **hashed** (never plaintext) in the database.
- Generating a new link for a tenant invalidates any previous unused link for that tenant.
- A client link may only ever access its own tenant.
- Admin access is a fully separate system from client access, with real login (credentials) and checked server-side on every admin route/action — this is the one place genuine authentication complexity belongs, since it's what protects every client's data and connection tokens.
- Meta tokens remain encrypted and are never returned to a client browser.
- Rate-limit link consumption attempts server-side.

## Private Volitex admin area

Add a private `/admin` area inside Connect, for Volitex operators only, with its own real login (`requireAdmin()` on every route/action — this is unrelated to and unaffected by the client-side magic-link simplification above).

### Required screens

#### 1. Clients

Small searchable list, not a dashboard. Each row shows:
- Business/client name
- Primary contact
- Market and time zone
- Purchased service(s)
- Access-link status (not sent / sent / used / expired)
- Current lifecycle status
- Last activity

Actions: open client, generate/regenerate access link, copy link, send via email, pause client access, update purchased service scope.

#### 2. New client

One quiet, three-step form:

1. **Client profile**
   - Business/client name
   - Contact name
   - Contact email
   - Client type: real estate, creator/influencer, other
   - Market/country
   - IANA time zone, e.g. `Asia/Kolkata` or `Asia/Dubai`
   - Preferred communication language (optional)
   - Internal note / sales owner (optional)

2. **Service purchased**
   - WhatsApp automation
   - Instagram automation
   - Both

   This setting controls both the UI and server authorization. A WhatsApp-only tenant must not be able to start an Instagram connection route even if they guess its URL.

3. **Access**
   - "Generate Access Link" (single action, no mode selection)
   - Once generated: **Copy Link** / **Send via Email** buttons appear against the same link

Show a live "Client preview" beside the form stating exactly what the client will be asked to connect.

#### 3. Client detail

Show profile, selected services, access-link status, and each channel's lifecycle. Do not show raw Meta secrets by default.

The detail page must let an operator:
- Generate a new access link at any time (including for already-`live` tenants — needed for reconnection/troubleshooting if a WABA gets revoked or disconnected on Meta's side)
- Change service scope after a sale change
- Mark internal activation stages
- Add a private internal note
- Pause/revoke client portal access

#### 4. Activation queue

The internal handoff between Connect and operations — shows clients who've submitted Meta authorization and need manual Chatwoot/n8n setup.

Lifecycle labels: `Awaiting client → Connection received → Ops setup → Testing → Live`

`Needs attention` is used only when the client or Volitex needs to take a specific action.

Raw WABA/token copying, if ever added, must be owner-only, time-limited, explicitly revealed, and audit logged. Not needed for the first admin UI release.

## Client onboarding flow

### Welcome / preflight

Example for a WhatsApp-only client:

> Welcome, Aarav. Let's connect the WhatsApp Business account for your automation.

Before the CTA, explain:
- They need to sign in to Meta as a business admin.
- Meta opens a secure authorization window.
- Volitex does not see their Facebook/Instagram password.
- Their current chats are not interrupted by this connection.

### WhatsApp-only flow

1. "Connect WhatsApp Business"
2. Meta Embedded Signup opens
3. If they already use the WhatsApp Business app, explain in simple words that they can select their existing business number (Coexistence)
4. Return state: "Connection received — Volitex is preparing your automation."
5. Final status: "We'll confirm once your automation is live."

### Instagram-only flow

1. "Connect Instagram Professional"
2. Brief preflight: account must be a professional account and the client must have access to it
3. Meta/Instagram authorization
4. Same calm received/activation status

### Both-channels flow

Show WhatsApp and Instagram as two sequential, independent steps. The client may complete one and return later for the other (using a freshly generated link if needed). Do not make a successful WhatsApp authorization look like the entire setup is live.

### Error and recovery states

Avoid raw errors such as "OAuth authorization could not be verified." Use useful copy and a next action:
- "The Meta window was closed before setup finished. You can try again when ready."
- "We need a Meta business admin to continue."
- "Your WhatsApp account was received, but a phone number still needs to be selected."
- "We could not complete this step. Contact your Volitex specialist and we'll help."
- "This link has expired. Please contact your Volitex specialist for a new one."

Add a visible specialist contact method on every connection and error screen. Keep it region-aware for support hours, but never claim urgent support availability unless it exists.

## Data model changes

Keep the existing encrypted WhatsApp/Instagram credential columns. Add product/lifecycle data separately so credential presence is not treated as "automation live."

### `tenant_profiles` or additive `tenants` fields

- `primary_contact_name`
- `market_code` (e.g. `IN`, `AE`)
- `timezone` (IANA time zone)
- `locale` (optional)
- `client_type`
- `internal_note`
- `sales_owner`

### `tenant_services`

Separate table rather than a single `both` string:
- `id`
- `tenant_id`
- `provider` (`whatsapp` or `instagram`)
- `status` (`not_started`, `invite_sent`, `connection_received`, `ops_setup`, `testing`, `live`, `action_needed`, `disabled`)
- `enabled_at`, `connected_at`, `live_at`
- `status_note` (internal only)

Unique constraint: one row per tenant/provider.

### `admin_users`

Dedicated admin allowlist/role model:
- `user_id` or admin identity
- `role` (`owner`, `operator`)
- `is_active`
- timestamps

First owner seeded manually; all admin route handlers use `requireAdmin()`.

### `client_access_tokens` (replaces `client_users`'s password-related fields entirely)

- `id`
- `tenant_id`
- `token_hash`
- `expires_at`
- `used_at` (nullable — null until consumed)
- `delivery_channel` (`whatsapp` | `email` | `manual`) — operator record-keeping only, not functional
- `created_by` (admin/operator id)

Generating a new token for a tenant should invalidate (or simply supersede — only the newest unused token is valid) any prior unused token for that tenant.

No password hashing, no `must_change_password`, no `access_mode`, no separate login table for clients at all.

## Application changes

### Client access flow (replaces "Authentication and password field")

- No `PasswordField` component, no show/hide toggle, no login/reset-password/accept-invitation pages.
- Add a single `/connect/[token]` (or similar) route: validates token hash + expiry + unused status server-side, marks it used, establishes an `httpOnly`/`Secure`/`SameSite=Lax` session scoped to that tenant, then redirects into the onboarding flow.

### Admin routes and authorization

- Add `/admin`, `/admin/clients`, `/admin/clients/new`, `/admin/clients/[id]`, `/admin/activation`.
- Add server-only admin actions for create client, update profile, update scope, generate/regenerate access link, pause access, update lifecycle status.
- Add `requireAdmin()` and never trust hidden UI controls for authorization.
- Reuse the secure token generation/hashing approach for the admin "generate link" action.

### Channel scope enforcement

- Read `tenant_services` before rendering a client onboarding page.
- Render only enabled channel cards.
- Reject disabled provider starts/callbacks in server routes with a safe message.
- Keep WhatsApp and Instagram connection states independent.

### WhatsApp pending-phone fix

The current WABA-only result can show a success banner while the connection card still says "Not connected." Replace this with an explicit state:

`WhatsApp account received — select or add your business number in Meta, then continue.`

The CTA must communicate the real next action, not restart a generic "Connect" flow without context.

### Remove unsafe client self-service disconnect

Replace the client-facing "Disconnect" action with "Request an account change." Actual credential removal belongs in the Volitex admin area and must require a deliberate confirmation.

## Delivery phases

### Phase 1 — foundation and safety
1. Add Manrope and update global typography.
2. Fix WhatsApp partial-connection copy/state.
3. Add service-scope and lifecycle migrations.
4. Add server-side scope enforcement.
5. Add `client_access_tokens` table + `/connect/[token]` validation route.
6. Ship **Copy Link only** (no email dependency yet).

### Phase 2 — client experience
1. Replace the generic two-card dashboard with channel-aware onboarding.
2. Add preflight, external-Meta progress, success, and recovery screens (incl. expired/used-link states).
3. Add region-aware support copy and a real support route.
4. Replace client disconnect with request-change UX.

### Phase 3 — private operations panel
1. Add admin authentication/authorization.
2. Build New Client, Clients, Client Detail, and Activation Queue.
3. Replace the CLI-only provisioning workflow with the admin create-client + generate-link action.
4. Add audit events for link regeneration, access changes, lifecycle edits, and any credential reveal action.

### Phase 3.5 — optional email delivery (fast follow, not blocking)
1. Add Resend (or chosen provider) integration.
2. Add "Send via Email" button alongside "Copy Link" on the same generated token.

### Phase 4 — verification
Test at minimum:
- WhatsApp-only, Instagram-only, and both-channel clients
- Magic-link flow: valid link, expired link, already-used link, regenerated link invalidating the old one
- Existing WhatsApp Business app / Coexistence path
- WABA-only pending-phone result
- Meta cancellation, popup failure, session expiry, wrong account, missing admin role
- Mobile widths from 320px upward
- Keyboard navigation and accessibility
- Admin authorization and tenant-isolation checks
- Link regeneration for an already-`live` tenant (reconnection/troubleshooting case)

## Explicit non-goals

- No self-service client inbox
- No analytics dashboard
- No client-visible tokens, WABA IDs, phone-number IDs, or Graph data
- No client ability to alter production Meta credentials casually
- No Facebook Page Messenger or Business Manager asset flows
- No client-facing passwords, login screens, or account-recovery flows
- No unnecessary "bank-level" friction for a short secure connection journey