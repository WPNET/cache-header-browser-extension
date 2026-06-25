# Chrome Web Store — Listing Copy

Reference copy for the Cache Captain listing in the Chrome Web Store Developer Dashboard.

## Summary (short description)

Max 132 characters. Auto-filled from `manifest.json` `description`, but editable in the dashboard.

```
Monitor HTTP cache headers (fastcgi-cache, x-cache, cf-cache-status) as a colour-coded badge; clear browser cache in one click.
```

## Detailed description

Paste into the dashboard's **Description** field.

```
Cache Captain is a developer and QA tool that shows the cache status of every page you visit and lets you clear browser data in a single click — all from your toolbar.

WHAT IT DOES
• Reads a configurable HTTP response header on each page load and displays the result as a colour-coded toolbar badge:
   HIT (green) · MISS (red) · BYPASS (orange) · EXPIRED (orange) · STALE (purple)
• One click on the icon can Reload the page, Clear selected browsing data, or do both.

MONITORED HEADERS
Pick a preset or enter your own:
• fastcgi-cache  • x-fastcgi-cache  • x-cache  • x-cache-status
• cf-cache-status (Cloudflare)  • or any custom header (e.g. x-varnish-cache)

ONE-CLICK CLEARING
Choose exactly what to clear — Cache, Cookies, Local storage, IndexedDB, Service workers, Cache storage — over a time range (last hour / 24 hours / 7 days / all time) and scope (all domains or current site only). Optionally show a confirmation notification, and optionally force a hard reload that bypasses the server cache.

WHY IT'S ACCURATE
Redirect chains (HTTP→HTTPS, www→apex) often return intermediate responses with no cache header. Cache Captain waits until navigation completes before painting the badge, so you always see the final response's cache status — never a transient redirect hop.

PRIVACY
Cache Captain runs entirely locally. It makes no network requests, includes no analytics or telemetry, and collects no personal data. Your settings are stored only in your own browser profile.

Ideal for WordPress, Nginx FastCGI cache, Varnish, and Cloudflare workflows where you need to verify cache hits and bust the cache while testing.
```

## Category

Developer Tools

## Single purpose (dashboard field)

```
Monitor a website's HTTP cache response header and display its status as a toolbar badge, with a one-click action to clear browser cache/data and reload.
```

## Permission justifications (Privacy practices tab)

| Permission | Justification |
|------------|---------------|
| `webRequest` | Read the configured cache response header (e.g. fastcgi-cache, cf-cache-status) from navigation responses to determine cache status. |
| Host permissions (`http://*/*`, `https://*/*`) | The cache header can appear on any HTTP/HTTPS site the user visits, so the header must be readable across all such hosts. Scoped to http/https only; no page content is read. |
| `webNavigation` | Detect navigation start and completion in order to show the correct cache-status badge per tab. |
| `tabs` | Apply the badge/title to the correct tab and reload it on the click action. |
| `browsingData` | Clear the specific browsing-data types the user selects (cache, cookies, storage, etc.). |
| `storage` | Persist the user's settings. |
| `notifications` | Show an optional confirmation notification after data is cleared. |

## Data usage disclosure

- Does **not** collect or transmit any user data.
- No remote code; runs entirely locally.
- Settings stored only in the user's browser profile via `storage.sync`.
