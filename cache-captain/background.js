/**
 * Cache Header Badge — Chrome / Edge Extension (Manifest V3)
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
// Loaded async at service worker startup; worst-case first navigation after a
// service worker restart uses the default until storage resolves — acceptable
// given that the alternative (async storage read inside the listener) would
// add latency to every page load.
let monitoredHeader   = DEFAULT_HEADER;
let clearAction       = "off";   // "off" | "clear" | "reload"
let invertBadge       = false;
let clearCache          = true;
let clearCookies        = false;
let clearLocalStorage   = false;
let clearIndexedDB      = false;
let clearServiceWorkers = false;
let clearCacheStorage   = false;
let clearTimeRange    = "all";
let clearScope        = "all";
let bypassCache       = false;
let notifyOnClear     = false;

// ── Icon drawing ──────────────────────────────────────────────────────────
// Font Awesome 6 Free solid paths — fontawesome.com/license/free (CC BY 4.0)
// Rendered via Path2D + OffscreenCanvas; drawn twice (blurred white → sharp
// dark) so the icon is legible on both light and dark toolbars.


const FA_TRASH   = "M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z";
const FA_REFRESH = "M463.5 224H472c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5z";
const NOTIFICATION_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAABaUlEQVR42u3cQQ2AUBBDwe8GWyjEIpjg1DdNamA7CRfgHBEREREREREREZH5XM/9usLosH/XVWODA2F0GIwOg+FBMDwIhgfB8CAYHwLDg2B8CIwPgeFBMD4ExofA+BAYHwLjQ2B8CAAAwPh1BMYKIzBSHIGBwgCME0ZglDgCg4QBGCOOwBBhAEaIIzBAGIDjxxE4fBiAo8cRODgAjl4F4NhxBA4NgGNXAThyHIEDA+DIAGgSgOPGETgsAI4LgAKgACgACoACoABoAICjQgCBR4DDAqAAKAAKgAKgACgACoB6MVS9Fq4AKADqA1H1ebgCoH4To34SpQDoIAAI4uMDAAAE9fEBAACC+vgAAABBfXwAAICgPj4ExgcAAAjy40NgfAiMDwAAEBgfAuNDYHwIjA+B8SEwPgiGh8D4EBgfBMOnEVg5CsGqUQhWjEKwWhSClYIYrBHE4OoxEK46CsUVRERERERERERkPh+tl7gnOo3QxwAAAABJRU5ErkJggg==";

function drawIcon() {
  const size   = 32;
  const canvas = new OffscreenCanvas(size, size);
  const ctx    = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  const isActive = clearAction !== "off";

  const fillIcon = (svgPath, vbW, scale, offX, offY, fillStyle, outline = true) => {
    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    const path = new Path2D(svgPath);
    if (outline) {
      // Dark stroke first — creates a crisp outline visible on light toolbars
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth   = 30;   // SVG units → ~1.5px after scale
      ctx.lineJoin    = "round";
      ctx.stroke(path);
    }
    ctx.fillStyle = fillStyle;
    ctx.fill(path);
    ctx.restore();
  };

  const colour = isActive ? "#ffffff" : "rgba(255,255,255,0.5)";

  if (clearAction === "reload-only") {
    // Full-size refresh icon (bold when active, faded when off)
    const scale = 28 / 512;
    const offX  = (size - 512 * scale) / 2;
    const offY  = (size - 512 * scale) / 2;
    fillIcon(FA_REFRESH, 512, scale, offX, offY, colour);

  } else {
    // Trash icon — same size for both "clear" and "reload"
    const trashScale = 28 / 512;
    const trashVbW   = 448;
    const offX = (size - trashVbW * trashScale) / 2;
    const offY = (size - 512  * trashScale) / 2;
    fillIcon(FA_TRASH, trashVbW, trashScale, offX, offY, colour);

    if (clearAction === "reload") {
      // Cut the refresh shape out of the trash using destination-out —
      // leaves transparent pixels that show the toolbar bg, works on any theme
      const bSize  = 16;
      const bScale = bSize / 512;
      const bodyCY = offY + 320 * trashScale;
      const bX     = size / 2 - bSize / 2;
      const bY     = bodyCY   - bSize / 2;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.translate(bX, bY);
      ctx.scale(bScale, bScale);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fill(new Path2D(FA_REFRESH));
      ctx.restore();
      // Dark stroke around the cutout — ensures visibility on light toolbars
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.translate(bX, bY);
      ctx.scale(bScale, bScale);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth   = 40;
      ctx.lineJoin    = "round";
      ctx.stroke(new Path2D(FA_REFRESH));
      ctx.restore();
      // Subtle dark fill — makes the arrowhead readable on light toolbars,
      // near-invisible on dark (dark tint over dark toolbar background)
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.translate(bX, bY);
      ctx.scale(bScale, bScale);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fill(new Path2D(FA_REFRESH));
      ctx.restore();
    }
  }

  chrome.action.setIcon({ imageData: ctx.getImageData(0, 0, size, size) }).catch(() => {});
}

const settingsReady = chrome.storage.sync
  .get({
    headerName:       DEFAULT_HEADER,
    invertBadge:      false,
    clearAction:      "reload-only",
    clearCache:           true,
    clearCookies:         false,
    clearLocalStorage:    false,
    clearIndexedDB:       false,
    clearServiceWorkers:  false,
    clearCacheStorage:    false,
    clearTimeRange:   "all",
    clearScope:       "all",
    bypassCache:      false,
    notifyOnClear:    false,
  })
  .then((data) => {
    monitoredHeader   = (data.headerName || DEFAULT_HEADER).trim().toLowerCase();
    invertBadge       = !!data.invertBadge;
    clearAction       = data.clearAction || "off";
    clearCache          = !!data.clearCache;
    clearCookies        = !!data.clearCookies;
    clearLocalStorage   = !!data.clearLocalStorage;
    clearIndexedDB      = !!data.clearIndexedDB;
    clearServiceWorkers = !!data.clearServiceWorkers;
    clearCacheStorage   = !!data.clearCacheStorage;
    clearTimeRange    = data.clearTimeRange || "all";
    clearScope        = data.clearScope     || "all";
    bypassCache       = !!data.bypassCache;
    notifyOnClear     = !!data.notifyOnClear;
    try { drawIcon(); } catch (e) { console.error("[CacheBadge] drawIcon failed:", e); }
  });

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.headerName)      monitoredHeader   = (changes.headerName.newValue      || DEFAULT_HEADER).trim().toLowerCase();
  if (changes.invertBadge)  invertBadge = !!changes.invertBadge.newValue;
  if (changes.clearAction) { clearAction = changes.clearAction.newValue || "off"; drawIcon(); }
  if (changes.clearCache)          clearCache          = !!changes.clearCache.newValue;
  if (changes.clearCookies)        clearCookies        = !!changes.clearCookies.newValue;
  if (changes.clearLocalStorage)   clearLocalStorage   = !!changes.clearLocalStorage.newValue;
  if (changes.clearIndexedDB)      clearIndexedDB      = !!changes.clearIndexedDB.newValue;
  if (changes.clearServiceWorkers) clearServiceWorkers = !!changes.clearServiceWorkers.newValue;
  if (changes.clearCacheStorage)   clearCacheStorage   = !!changes.clearCacheStorage.newValue;
  if (changes.clearTimeRange)  clearTimeRange    = changes.clearTimeRange.newValue  || "all";
  if (changes.clearScope)      clearScope        = changes.clearScope.newValue      || "all";
  if (changes.bypassCache)     bypassCache       = !!changes.bypassCache.newValue;
  if (changes.notifyOnClear)   notifyOnClear     = !!changes.notifyOnClear.newValue;
});

// Buffer: stores the last seen header value per tab during a navigation.
const tabCache = new Map();

// Step 1: New navigation starting — clear badge while page loads.
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  tabCache.set(details.tabId, null);
  chrome.action.setBadgeText({ text: "", tabId: details.tabId });
  chrome.action.setTitle({ title: `${monitoredHeader}: loading…`, tabId: details.tabId });
});

// Step 2: Headers received — store cache value, don't touch badge yet
// (more redirects may follow with no header, which would clear it).
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type !== "main_frame") return;
    const tabId = details.tabId;
    if (tabId < 0) return;
    const header = details.responseHeaders?.find(
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
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  const tabId = details.tabId;
  const entry = tabCache.get(tabId);
  const color = entry ? entry.color : GREY;
  const label = entry ? entry.label : "";
  const status = entry
    ? `${entry.header}: ${entry.value}`
    : `${monitoredHeader}: not found`;
  const title = clearAction === "reload"      ? `Click to clear data & Reload\n${status}`
              : clearAction === "reload-only" ? `Click to Reload\n${status}`
              : clearAction === "clear"       ? `Click to clear data\n${status}`
              : status;

  chrome.action.setBadgeText({ text: label, tabId });
  chrome.action.setBadgeBackgroundColor({ color: invertBadge ? color : [0, 0, 0, 0], tabId });
  chrome.action.setBadgeTextColor({ color: invertBadge ? "#ffffff" : color, tabId });
  chrome.action.setTitle({ title, tabId });
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  tabCache.delete(tabId);
});

// Clear selected browser data and hard-reload the tab when the icon is clicked.
// Only active when enabled in Options. Nothing runs if no data types are selected.
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await settingsReady;
    if (clearAction === "off" || tab.id == null) return;
    if (!tab.url?.startsWith("http")) return;

    // Reload-only: skip all data clearing
    if (clearAction === "reload-only") {
      chrome.tabs.reload(tab.id, { bypassCache });
      return;
    }

    const dataTypes = {};
    if (clearCache)          dataTypes.cache = true;
    if (clearCookies)        dataTypes.cookies = true;
    if (clearLocalStorage)   dataTypes.localStorage = true;
    if (clearIndexedDB)      dataTypes.indexedDB = true;
    if (clearServiceWorkers) dataTypes.serviceWorkers = true;
    if (clearCacheStorage)   dataTypes.cacheStorage = true;
    if (Object.keys(dataTypes).length === 0) return;

    const SINCE_MS = { hour: 3_600_000, day: 86_400_000, week: 604_800_000 };
    const since = clearTimeRange === "all" ? 0 : Date.now() - SINCE_MS[clearTimeRange];

    const removalOptions = { since };
    if (clearScope === "site") removalOptions.origins = [new URL(tab.url).origin];

    try {
      await chrome.browsingData.remove(removalOptions, dataTypes);
    } catch (e) {
      console.error("[CacheBadge] browsingData.remove failed:", e);
    }

    // Reload or flash a confirmation badge
    if (clearAction === "reload") {
      // Show ✓ briefly, then reload — 300ms is barely perceptible but enough to register
      chrome.action.setBadgeText({ text: "✓", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#27ae60", tabId: tab.id });
      chrome.action.setBadgeTextColor({ color: "#ffffff", tabId: tab.id });
      setTimeout(() => chrome.tabs.reload(tab.id, { bypassCache }), 300);
    } else {
      // Brief ✓ badge to confirm clear-only action
      chrome.action.setBadgeText({ text: "✓", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#27ae60", tabId: tab.id });
      chrome.action.setBadgeTextColor({ color: "#ffffff", tabId: tab.id });
      setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 1500);
    }

    if (notifyOnClear && chrome.notifications) {
      const scope   = clearScope === "site" ? new URL(tab.url).hostname : "all domains";
      const cleared = Object.keys(dataTypes).join(", ");
      chrome.notifications.create("cache-badge-cleared", {
        type:    "basic",
        iconUrl: NOTIFICATION_ICON,
        title:   "Cache cleared",
        message: `Cleared ${cleared} for ${scope}.`,
      }).catch((e) => console.error("[CacheBadge] notification failed:", e));
    }
  } catch (e) {
    console.error("[CacheBadge] click handler error:", e);
  }
});

