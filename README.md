# Cache Captain

A developer and testing tool for **monitoring HTTP cache response headers** and **managing browser cache** — straight from your browser toolbar.

Cache Captain watches a configurable response header on every top-level navigation (default: `fastcgi-cache`) and shows the cache status as a colour-coded toolbar badge — **HIT**, **MISS**, **BYPASS**, **EXPIRED**, or **STALE**. One click on the icon can reload the page, clear selected browsing data, or both.

It runs **entirely locally**: no network requests, no analytics, no telemetry. Nothing ever leaves your browser.

---

## Features

- **Live cache-status badge** on every page load, colour-coded by status:

  | Status  | Badge | Colour  |
  |---------|-------|---------|
  | HIT     | `HIT` | green   |
  | MISS    | `MIS` | red     |
  | BYPASS  | `BYP` | orange  |
  | EXPIRED | `EXP` | orange  |
  | STALE   | `STL` | purple  |
  | (none)  | `—`   | grey    |

- **Configurable monitored header** — choose from common presets or enter a custom one:
  - `fastcgi-cache`, `x-fastcgi-cache`, `x-cache`, `x-cache-status`, `cf-cache-status` (Cloudflare), or any custom header (e.g. `x-varnish-cache`).
- **One-click click action** — pick what happens when you click the toolbar icon:
  - **Reload** — simple reload (optionally bypassing the server cache for a hard reload).
  - **Clear data** — clear selected browsing data only.
  - **Clear + Reload** — clear, then reload.
- **Granular "what to clear" control** — Cache, Cookies, Local storage, IndexedDB, Service workers, Cache storage.
- **Time range** — last hour, last 24 hours, last 7 days, or all time.
- **Scope** — all domains or the current site only.
- **Optional desktop notification** confirming what was cleared.
- **Invert badge colours** option (coloured background, white text).
- **Theme-aware toolbar icon** rendered on-canvas so it stays legible on both light and dark toolbars.

---

## Why the badge only appears when navigation completes

Redirect chains (e.g. `HTTP → HTTPS`, `www → apex`) often return intermediate responses with **no** cache header. To avoid flicker, Cache Captain buffers the header value seen in `onHeadersReceived` and only paints the badge once `webNavigation.onCompleted` fires — so you always see the final response's cache status, not a transient redirect hop.

---

## Installation

### Chrome / Edge (Manifest V3)

**From source (unpacked):**

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the [`cache-captain/`](cache-captain/) folder.

**Packaged:** a store-ready ZIP can be produced from the `cache-captain/` folder containing only the runtime files (`manifest.json`, `background.js`, `options.html`, `options.js`, and `icons/`).

### Firefox (Manifest V2)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select [`cache-captain-firefox/manifest.json`](cache-captain-firefox/manifest.json).

A pre-built `cache-captain-firefox.xpi` is also included in the repository root.

---

## Usage

1. Click the **Cache Captain** toolbar icon, then open **Options** (or right-click → Options) to configure.
2. Choose the **Monitored Header** to match your stack (e.g. `cf-cache-status` behind Cloudflare, `fastcgi-cache` behind Nginx + PHP-FPM).
3. Pick a **Click Action** and, if clearing, select what to clear, the time range, and the scope.
4. Browse — the badge shows the cache status of each page. Click the icon to run your configured action.

Settings are saved automatically and synced via the browser's `storage.sync`.

---

## Permissions

Cache Captain requests only what it needs to function:

| Permission       | Why it's needed                                                        |
|------------------|------------------------------------------------------------------------|
| `webRequest`     | Read the configured cache response header on navigation responses.     |
| `<all_urls>` / host permissions | Inspect headers on whichever site you're visiting.      |
| `webNavigation`  | Detect navigation start/complete to paint the badge per-tab.           |
| `tabs`           | Apply the badge and reload the correct tab.                            |
| `browsingData`   | Clear the data types you select.                                      |
| `storage`        | Persist your settings.                                                |
| `notifications`  | Optional confirmation toast when data is cleared.                     |

**Privacy:** Cache Captain makes **no network requests** and collects **no data**. All processing happens locally in your browser; settings are stored only in your own browser profile.

---

## Project structure

```
.
├── cache-captain/                 # Chrome / Edge extension (Manifest V3) — primary
│   ├── manifest.json
│   ├── background.js              # Service worker: badge logic + click actions
│   ├── options.html / options.js  # Settings UI
│   ├── gen-icons.js               # Dev-only: regenerate PNG icons from an SVG (uses sharp)
│   └── icons/
├── cache-captain-firefox/         # Firefox port (Manifest V2)
├── cache-captain-firefox.xpi      # Pre-built Firefox package
└── fastcgi-cache-badge-firefox/   # Earlier Firefox prototype
```

### Regenerating icons (development)

The toolbar icon is drawn at runtime on a canvas, but the static PNG icons can be regenerated from an SVG source:

```bash
cd cache-captain
npm install        # installs sharp (dev dependency)
node gen-icons.js  # writes icons/icon-{16,32,48,96,128}.png
```

> `node_modules/` and build artifacts (`*.xpi`, `*.zip`) are git-ignored and are **not** part of the published extension package.

---

## License

Icons use [Font Awesome 6 Free](https://fontawesome.com/license/free) solid paths (CC BY 4.0).
