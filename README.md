# Taplo

Taplo is a desktop recruiting assistant built with Next.js and Electron.

## Web marketing vs desktop

- **Marketing site** (`taplo.app`): static export deployed on Vercel. Build with `npm run build:web`; output is `out/`. Root `/` serves the landing page via `vercel.json`.
- **Desktop app**: Electron loads `out/index.html` (the recruiter workspace at `/` in dev). Do not point Electron at the marketing landing route.

## Production Secret Model

Do not put Recall, Google, or Microsoft secrets inside the Electron app.

Use this shape:

```text
Taplo desktop app
  -> Taplo backend
    -> Recall Calendar V2, Google OAuth, Microsoft OAuth
```

The desktop app only needs the backend URL. The backend owns the real secrets.

## Backend Environment Variables

Set these on the machine or hosting platform that runs the backend:

```powershell
$env:TAPLO_BACKEND_PORT="8787"
$env:TAPLO_BACKEND_PUBLIC_URL="http://127.0.0.1:8787"

$env:RECALL_API_KEY="your_recall_api_key"
$env:RECALL_REGION="eu-central-1"

$env:GOOGLE_CALENDAR_CLIENT_ID="your_google_client_id"
$env:GOOGLE_CALENDAR_CLIENT_SECRET="your_google_client_secret"

$env:MICROSOFT_CALENDAR_CLIENT_ID="your_microsoft_client_id"
$env:MICROSOFT_CALENDAR_CLIENT_SECRET="your_microsoft_client_secret"
```

For OAuth provider setup, use this redirect URL:

```text
http://127.0.0.1:8787/api/calendar/oauth/callback
```

In production, replace `http://127.0.0.1:8787` with your real backend URL.

## Desktop Environment Variables

The desktop app should only know where the backend is:

```powershell
$env:TAPLO_API_BASE_URL="http://127.0.0.1:8787"
```

Do not add `RECALL_API_KEY`, Google secrets, or Microsoft secrets to the desktop app in production.

## Local Run

Compile and start the backend:

```powershell
npm run backend:compile
npm run backend:start
```

In another terminal, point Electron at the backend and launch the app:

```powershell
$env:TAPLO_API_BASE_URL="http://127.0.0.1:8787"
npm run build:electron
node_modules\.bin\electron.cmd .
```

Then open Taplo Settings:

1. Click `Connect Google` or `Connect Outlook`.
2. Complete OAuth in the browser.
3. Return to Taplo.
4. Click `Sync meetings`.

## Development Fallback

If `TAPLO_API_BASE_URL` is not set, Electron falls back to the local direct/mock calendar path so UI development still works.
