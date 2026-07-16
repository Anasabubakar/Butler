# Butler connectors — setup guide

## Why Integrations showed 404

The Render backend was **crash-looping** on deploy:

```text
failed to run migrations … relation "idx_chat_threads_user" already exists
```

When the API is down or stuck on an old binary, `GET /api/integrations` fails and the UI surfaces an error (often as 404/failed load).

**Fix (shipped):** migrations are idempotent + tracked in `schema_migrations`. Redeploy backend after this commit.

---

## Env vars (Render backend)

```bash
PUBLIC_API_BASE=https://butler-p395.onrender.com
APP_BASE_URL=https://butler.pxxl.run
TOKEN_ENCRYPTION_KEY=<long-random-secret>
CORS_ORIGINS=https://butler.pxxl.run

# Add only for providers you create OAuth apps for:
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
LINEAR_CLIENT_ID=
LINEAR_CLIENT_SECRET=
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
DROPBOX_CLIENT_ID=
DROPBOX_CLIENT_SECRET=
ASANA_CLIENT_ID=
ASANA_CLIENT_SECRET=
```

**Callback URL pattern** (paste into each OAuth app):

```text
https://butler-p395.onrender.com/api/integrations/callback/{provider}
```

Examples:

- GitHub → `…/callback/github`
- Slack → `…/callback/slack`
- Notion → `…/callback/notion`

---

## Baby steps: GitHub

1. Open https://github.com/settings/developers  
2. **OAuth Apps** → **New OAuth App**  
3. Application name: `Butler`  
4. Homepage URL: `https://butler.pxxl.run`  
5. Authorization callback URL:  
   `https://butler-p395.onrender.com/api/integrations/callback/github`  
6. Register → copy **Client ID**  
7. Generate a new **Client secret**  
8. On Render → Environment:  
   - `GITHUB_CLIENT_ID`  
   - `GITHUB_CLIENT_SECRET`  
9. Redeploy backend  
10. Butler → Integrations → GitHub → **Connect**

---

## Baby steps: Slack

1. https://api.slack.com/apps → **Create New App** → From scratch  
2. **OAuth & Permissions** → Redirect URL:  
   `https://butler-p395.onrender.com/api/integrations/callback/slack`  
3. Scopes (Bot): `channels:read`, `chat:write`, `users:read`, `search:read`  
4. **Basic Information** → Client ID + Client Secret  
5. Render env: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`  
6. Redeploy → Integrations → Slack → Connect

---

## Baby steps: Notion

1. https://www.notion.so/my-integrations  
2. **New integration** → type **Public** (OAuth)  
3. Redirect URI:  
   `https://butler-p395.onrender.com/api/integrations/callback/notion`  
4. Copy OAuth client id + secret  
5. Render: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`  
6. Redeploy → Connect

---

## Baby steps: Linear

1. Linear → Settings → API → OAuth applications  
2. Callback: `https://butler-p395.onrender.com/api/integrations/callback/linear`  
3. Scopes: enable **all** (`read`, `write`, `issues:create`, `comments:create`, `timeSchedule:write`, `admin`)  
4. Webhook URL (important — use **backend**, not frontend):  
   `https://butler-p395.onrender.com/api/webhooks/linear`  
5. Render env:  
   - `LINEAR_CLIENT_ID`  
   - `LINEAR_CLIENT_SECRET`  
   - `LINEAR_WEBHOOK_SECRET`

---

## Baby steps: Discord

1. https://discord.com/developers/applications → New Application  
2. **OAuth2 → Redirects**:  
   `https://butler-p395.onrender.com/api/integrations/callback/discord`  
3. Copy **Client ID**, **Client Secret**, **Public Key**  
4. Render env:  
   - `DISCORD_CLIENT_ID`  
   - `DISCORD_CLIENT_SECRET`  
   - `DISCORD_PUBLIC_KEY`  
   - `DISCORD_APPLICATION_ID` (same as Client ID usually)  
5. **Interactions Endpoint URL** (optional but needed if Discord tries to verify it):  
   `https://butler-p395.onrender.com/api/webhooks/discord`  
   Butler answers Discord’s PING with signature verification.  
6. **Linked Roles / ToS / Privacy** — optional for OAuth Connect (fill later for public listing).  
7. Redeploy backend → save Interactions URL in Discord → should show verified.  
8. Butler → Integrations → Discord → Connect  

## Baby steps: Asana / Trello

Same pattern:

1. Create OAuth app in that product’s developer console  
2. Set redirect = `PUBLIC_API_BASE/api/integrations/callback/{id}`  
3. Put client id/secret in Render  
4. Redeploy  
5. Click **Connect** in Butler  

Console links appear on each card when status is **not configured**.

Microsoft 365 and Dropbox were removed from the product catalog.

---

## Google (already different)

Google uses **Firebase Google Sign-In** (not these env vars).  
Connect from Integrations or Command Center → “Connect Google Workspace”.

---

## After setup

| Status | Meaning |
|--------|---------|
| **connected** | Token vaulted for this user |
| **available** | OAuth env is set; click Connect |
| **not configured** | Missing env secrets on server |
| **coming soon** | Zapier / n8n webhooks not built yet |
