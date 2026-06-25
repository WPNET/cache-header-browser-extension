const headerGroup     = document.getElementById("header-group");
const customInput     = document.getElementById("custom-input");
const invertCheckbox  = document.getElementById("invert-badge");
const clearOptions    = document.getElementById("clear-options");
const clearDataOpts   = document.getElementById("clear-data-options");
const notifyRow       = document.getElementById("notify-row");
const statusEl        = document.getElementById("status");

const DEFAULT = "fastcgi-cache";

let saveTimer;
function updateClearVisibility(action) {
  clearOptions.hidden  = action === "off";
  clearDataOpts.hidden = action === "reload-only";
  notifyRow.hidden     = action === "reload-only";
}
function showSaved() {
  statusEl.textContent = "Saved.";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { statusEl.textContent = ""; }, 1500);
}
function save(data) { chrome.storage.sync.set(data).then(showSaved); }
function el(id)     { return document.getElementById(id); }

// ── Load all settings on open ──────────────────────────────────────────────
chrome.storage.sync.get({
  headerName:        DEFAULT,
  invertBadge:       false,
  clearAction:       "reload-only",
  clearCache:           true,
  clearCookies:         false,
  clearLocalStorage:    false,
  clearIndexedDB:       false,
  clearServiceWorkers:  false,
  clearCacheStorage:    false,
  clearTimeRange:    "all",
  clearScope:        "all",
  bypassCache:       false,
  notifyOnClear:     false,
}).then((data) => {
  const saved = (data.headerName || DEFAULT).trim().toLowerCase();
  const presetRadio = headerGroup.querySelector(`input[value="${CSS.escape(saved)}"]`);
  if (presetRadio) {
    presetRadio.checked = true;
  } else {
    headerGroup.querySelector('input[value="custom"]').checked = true;
    customInput.value = saved;
  }

  invertCheckbox.checked           = !!data.invertBadge;
  el("clear-cache").checked          = !!data.clearCache;
  el("clear-cookies").checked        = !!data.clearCookies;
  el("clear-localstorage").checked   = !!data.clearLocalStorage;
  el("clear-indexeddb").checked      = !!data.clearIndexedDB;
  el("clear-serviceworkers").checked = !!data.clearServiceWorkers;
  el("clear-cachestorage").checked   = !!data.clearCacheStorage;

  const action = data.clearAction || "off";
  document.querySelector(`input[name="clear-action"][value="${action}"]`).checked = true;
  document.querySelector(`input[name="time-range"][value="${data.clearTimeRange || "all"}"]`).checked = true;
  document.querySelector(`input[name="scope"][value="${data.clearScope || "all"}"]`).checked = true;
  el("notify-on-clear").checked = !!data.notifyOnClear;
  el("bypass-cache").checked    = !!data.bypassCache;

  updateClearVisibility(action);
});

// ── Header picker ──────────────────────────────────────────────────────────
headerGroup.addEventListener("change", (e) => {
  if (e.target.name !== "header") return;
  if (e.target.value === "custom") { customInput.focus(); return; }
  save({ headerName: e.target.value });
});

customInput.addEventListener("change", () => {
  const val = customInput.value.trim().toLowerCase();
  if (!val) return;
  headerGroup.querySelector('input[value="custom"]').checked = true;
  save({ headerName: val });
});

// ── Badge ──────────────────────────────────────────────────────────────────
invertCheckbox.addEventListener("change", () => save({ invertBadge: invertCheckbox.checked }));

// ── Click action ───────────────────────────────────────────────────────────
document.querySelectorAll('input[name="clear-action"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    updateClearVisibility(radio.value);
    save({ clearAction: radio.value });
  });
});

// ── Clear sub-options ──────────────────────────────────────────────────────
el("clear-cache").addEventListener("change",
  () => save({ clearCache: el("clear-cache").checked }));
el("clear-cookies").addEventListener("change",
  () => save({ clearCookies: el("clear-cookies").checked }));
el("clear-localstorage").addEventListener("change",
  () => save({ clearLocalStorage: el("clear-localstorage").checked }));
el("clear-indexeddb").addEventListener("change",
  () => save({ clearIndexedDB: el("clear-indexeddb").checked }));
el("clear-serviceworkers").addEventListener("change",
  () => save({ clearServiceWorkers: el("clear-serviceworkers").checked }));
el("clear-cachestorage").addEventListener("change",
  () => save({ clearCacheStorage: el("clear-cachestorage").checked }));
el("notify-on-clear").addEventListener("change",
  () => save({ notifyOnClear: el("notify-on-clear").checked }));
el("bypass-cache").addEventListener("change",
  () => save({ bypassCache: el("bypass-cache").checked }));

clearOptions.addEventListener("change", (e) => {
  if (e.target.name === "time-range") save({ clearTimeRange: e.target.value });
  if (e.target.name === "scope")      save({ clearScope:     e.target.value });
});
