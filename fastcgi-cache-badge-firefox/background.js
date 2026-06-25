/**
 * FastCGI Cache Badge — Firefox Extension
 *
 * Intercepts top-level navigation responses, reads a configurable response
 * header (default: "fastcgi-cache"), and displays the value as a colour-coded
 * badge. Configure the monitored header via the extension Options page.
 *
 * The badge is applied only when navigation COMPLETES to avoid flicker
 * from redirect chains (HTTP→HTTPS etc.) with no cache header.
 *
 *   HIT     → green  #27ae60  →  HIT
 *   MISS    → red    #e74c3c  →  MIS
 *   BYPASS  → orange #e67e22  →  BYP
 *   EXPIRED → orange #e67e22  →  EXP
 *   STALE   → purple #8e44ad  →  STL
 *   (none)  → grey   #7f8c8d  →  —
 */

const STATUS_COLORS = {
  HIT:     "#27ae60",
  MISS:    "#e74c3c",
  BYPASS:  "#e67e22",
  EXPIRED: "#e67e22",
  STALE:   "#8e44ad",
};

const STATUS_LABELS = {
  HIT:     "HIT",
  MISS:    "MIS",
  BYPASS:  "BYP",
  EXPIRED: "EXP",
  STALE:   "STL",
};

const GREY = "#7f8c8d";
const DEFAULT_HEADER = "fastcgi-cache";

// Pre-lowercased for zero-cost comparison in the hot path (onHeadersReceived).
let monitoredHeader = DEFAULT_HEADER;
let clearOnClick    = false;
let invertBadge     = false;

// Single storage read; stored as a promise so the click listener can await it
// and avoid acting on stale defaults after a background-script restart.
const settingsReady = browser.storage.sync
  .get({ headerName: DEFAULT_HEADER, clearOnClick: false, invertBadge: false })
  .then((data) => {
    monitoredHeader = (data.headerName || DEFAULT_HEADER).trim().toLowerCase();
    clearOnClick    = !!data.clearOnClick;
    invertBadge     = !!data.invertBadge;
  });

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.headerName)   monitoredHeader = (changes.headerName.newValue   || DEFAULT_HEADER).trim().toLowerCase();
  if (changes.clearOnClick) clearOnClick    = !!changes.clearOnClick.newValue;
  if (changes.invertBadge)  invertBadge     = !!changes.invertBadge.newValue;
});

// Buffer: stores the last seen header value per tab during a navigation.
const tabCache = new Map();

// Step 1: New navigation starting — clear badge while page loads.
browser.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  tabCache.set(details.tabId, null);
  browser.browserAction.setBadgeText({ text: "", tabId: details.tabId });
  browser.browserAction.setTitle({ title: `${monitoredHeader}: loading…`, tabId: details.tabId });
});

// Step 2: Headers received — store cache value, don't touch badge yet
// (more redirects may follow with no header, which would clear it).
browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type !== "main_frame") return;
    const tabId = details.tabId;
    if (tabId < 0) return;
    const header = details.responseHeaders.find(
      (h) => h.name.toLowerCase() === monitoredHeader
    );
    if (header) {
      const value = header.value.trim().toUpperCase();
      const color = STATUS_COLORS[value] || GREY;
      const label = STATUS_LABELS[value]  || value.slice(0, 3);
      // Snapshot the header name so the tooltip is consistent even if the
      // user changes the setting before onCompleted fires.
      tabCache.set(tabId, { value, color, label, header: monitoredHeader });
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Step 3: Navigation fully complete — apply badge.
browser.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  const tabId = details.tabId;
  const entry = tabCache.get(tabId);
  const color = entry ? entry.color : GREY;
  const label = entry ? entry.label : "—";
  const title = entry
    ? `${entry.header}: ${entry.value}`
    : `${monitoredHeader}: no header`;

  browser.browserAction.setBadgeText({ text: label, tabId });
  browser.browserAction.setBadgeBackgroundColor({ color: invertBadge ? color : [0, 0, 0, 0], tabId });
  browser.browserAction.setBadgeTextColor({ color: invertBadge ? "#ffffff" : color, tabId });
  browser.browserAction.setTitle({ title, tabId });
});

// Clean up when tab closes
browser.tabs.onRemoved.addListener((tabId) => {
  tabCache.delete(tabId);
});

// Clear all browser cache and hard-reload the tab when the icon is clicked
// (only active when enabled in Options).
browser.browserAction.onClicked.addListener(async (tab) => {
  await settingsReady;
  if (!clearOnClick || tab.id == null) return;
  if (!tab.url?.startsWith("http")) return;
  await browser.browsingData.removeCache({});
  browser.tabs.reload(tab.id, { bypassCache: true });
});

