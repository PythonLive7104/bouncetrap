# BounceTrap Desktop

A cross-platform desktop app (Windows / macOS / Linux) that verifies emails using a
BounceTrap **API key**. Built with Electron.

## Features
- Connect with your API key (generate one in Dashboard → API Keys; paid plans)
- **Single verify** — instant result with status, score and flags
- **Bulk jobs** — upload a CSV/TXT, watch progress, download the cleaned CSV
- **Live credit balance** shown in the header

All API requests run in Electron's main process, so there are **no CORS issues** — the
app talks straight to `https://bouncetrap.net/api/v1` using the `X-API-Key` header.

## Run in development
```bash
cd desktop
npm install
npm start
```

## Build installers
```bash
npm run dist          # current OS
npm run dist:win      # Windows  → release/BounceTrap Setup x.y.z.exe
npm run dist:mac      # macOS    → release/BounceTrap-x.y.z.dmg
npm run dist:linux    # Linux    → release/BounceTrap-x.y.z.AppImage
```
Output lands in `desktop/release/`.

> **Note:** cross-OS builds generally need to run on (or emulate) the target OS.
> Build Windows installers on Windows, macOS on a Mac, etc. CI (e.g. GitHub Actions
> with a matrix) is the easiest way to produce all three from one push.

## Branded icons (recommended before release)
electron-builder currently uses the default Electron icon. For a branded build, add:
- `renderer/assets/icon.png` — 512×512 (Linux + base)
- `renderer/assets/icon.ico` — Windows
- `renderer/assets/icon.icns` — macOS

Then re-add the `"icon"` fields under `win` / `mac` / `linux` in `package.json` → `build`.

## Distribution
The website's API page links to **GitHub Releases**. Recommended flow:
1. Tag a release: `git tag desktop-v1.0.0 && git push --tags`
2. A GitHub Actions workflow builds the three installers and attaches them to the Release.
3. The API-page download buttons point to `…/releases/latest`, so they always serve the newest build.

Update the download URLs in `frontend/src/components/landing/LandingPage.jsx`
(`DESKTOP_RELEASES_URL`) to your actual GitHub repo.
