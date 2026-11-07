# Packaging SATrainer

SATrainer is a static web app (`index.html` + `css/` + `js/` + `assets/`).

## Run it on Windows (no build)

Double-click **`SATrainer.bat`**. It serves the app on `http://127.0.0.1:8765`
(so progress saves in any browser), opens your default browser, and runs a small
minimized server window. Press a key in the launcher window to stop.
Requires Python 3 (from https://www.python.org/downloads/); if it's missing the
script opens the app directly instead.

To build a real Windows `.exe` instead: install Node.js 18+, then
`npm install && npm run dist:win` → `dist/` gets an installer and a portable exe.

---

# Packaging for macOS

There are two ways to run it as an app on a Mac.

---

## Option 1 — No build: double-click launcher (fastest)

1. Copy the whole `SATrainer/` folder to the Mac.
2. In Terminal, make the launcher executable once:
   ```bash
   chmod +x SATrainer.command
   ```
3. Double-click **`SATrainer.command`** in Finder (or run `./SATrainer.command`).
   - It serves the app at `http://127.0.0.1:8765` and opens your browser.
   - Keep the Terminal window open while using it; close it to stop.

This uses the `python3` that ships with the Xcode Command Line Tools. It works in
any browser and saves progress reliably. No install, no build.

> The first double-click may show "unidentified developer" — right-click the file
> → **Open** → **Open** to approve it once.

---

## Option 2 — A real standalone `.app` / `.dmg` (Electron)

This produces a genuine double-clickable **SATrainer.app** (and a `.dmg`), with no
Python or browser dependency. **It must be built on a Mac** — Apple's packaging
toolchain does not run on Windows/Linux.

On the Mac, inside the `SATrainer/` folder:

```bash
# 1. Install Node.js 18+ (https://nodejs.org) if you don't have it.
npm install            # downloads electron + electron-builder (dev only)

# 2. Try it live (opens the app window):
npm start

# 3. Build the distributable app:
npm run dist           # -> dist/SATrainer-1.0.0.dmg and dist/mac/SATrainer.app
# Apple Silicon + Intel in one binary (larger):
npm run dist:universal
```

Output lands in `dist/`. Open the `.dmg` and drag **SATrainer** to Applications.

### First launch (unsigned app)
The build is **not code-signed**, so Gatekeeper will warn on first open. Either:
- Right-click **SATrainer.app** → **Open** → **Open**, or
- `xattr -cr /Applications/SATrainer.app` to clear the quarantine flag.

To ship a signed/notarized app you'd add an Apple Developer ID and signing config
to the `build.mac` section of `package.json` (not required for personal use).

---

## What's in the package

- `index.html`, `css/`, `js/` — the app.
- `assets/math/` (~860 PNGs: real exam math questions + explanation images) and
  `assets/rw/` (R&W table/graph stimulus images).
  **Required**; the app references them by relative path. Keep them with the app.
- `electron-main.js`, `package.json` — Electron wrapper + build config.
- `SATrainer.command` — the no-build launcher.
- `pdfs/` and `work/` — source PDFs and the extraction scripts. **Not needed at
  runtime**; you can exclude them from a distributed copy (they are already left
  out of the Electron build via the `files` allowlist in `package.json`).
