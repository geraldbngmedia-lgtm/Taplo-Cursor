# Desktop installers and download URLs

## Build locally

```bash
npm run package:win   # Windows NSIS (.exe) on Windows
npm run package:mac   # macOS DMG on macOS
npm run package:publish   # Copy release/* → public/downloads/Taplo-mac.dmg, Taplo-win.exe
```

Artifacts land in `release-build/`; stable copies for the marketing site are in `public/downloads/`.

**Note:** Installers are ~190 MB. Vercel’s static file limit is 100 MB, so production downloads should use **GitHub Releases** (set `NEXT_PUBLIC_GITHUB_RELEASES_BASE` or per-platform URL env vars). Hosting on `taplo.app/downloads/` only works if you use a smaller artifact or Vercel Pro/Blob.

## GitHub Releases (recommended for large installers)

1. Push this repo to GitHub and create a tag, e.g. `v0.1.0`.
2. The [Release desktop](../.github/workflows/release-desktop.yml) workflow builds Mac + Windows and uploads:
   - `Taplo-mac.dmg`
   - `Taplo-win.exe`
3. Set Vercel production env vars (replace `ORG/REPO`):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_DOWNLOAD_URL_MAC` | `https://github.com/ORG/REPO/releases/latest/download/Taplo-mac.dmg` |
| `NEXT_PUBLIC_DOWNLOAD_URL_WIN` | `https://github.com/ORG/REPO/releases/latest/download/Taplo-win.exe` |

Redeploy after changing env vars.

## Host on taplo.app

If installers are under ~100 MB each, `npm run package:publish` and deploy so `https://taplo.app/downloads/Taplo-win.exe` is served from `public/downloads/` (Next static export). Larger builds should use GitHub Releases URLs above.

Default landing URLs (when env vars are unset) point at `https://taplo.app/downloads/...`.
