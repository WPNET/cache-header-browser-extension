const PRESETS = ["fastcgi-cache", "x-fastcgi-cache", "x-cache", "x-cache-status", "cf-cache-status"];
const DEFAULT = "fastcgi-cache";

const form           = document.getElementById("options-form");
const customInput    = document.getElementById("custom-input");
const clearCheckbox  = document.getElementById("clear-on-click");
const invertCheckbox = document.getElementById("invert-badge");
const statusEl       = document.getElementById("status");

let saveTimer;

function showSaved() {
  statusEl.textContent = "Saved.";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { statusEl.textContent = ""; }, 1500);
}

function save(data) {
  browser.storage.sync.set(data).then(showSaved);
}

// Populate UI from storage on open.
browser.storage.sync.get({ headerName: DEFAULT, clearOnClick: false, invertBadge: false }).then((data) => {
  const saved = (data.headerName || DEFAULT).trim().toLowerCase();
  if (PRESETS.includes(saved)) {
    form.querySelector(`input[value="${saved}"]`).checked = true;
  } else {
    form.querySelector('input[value="custom"]').checked = true;
    customInput.value = saved;
  }
  clearCheckbox.checked  = !!data.clearOnClick;
  invertCheckbox.checked = !!data.invertBadge;
});

form.addEventListener("change", (e) => {
  if (e.target.name !== "header") return;
  if (e.target.value === "custom") {
    customInput.focus();
    return; // save deferred until text input commits
  }
  save({ headerName: e.target.value });
});

customInput.addEventListener("change", () => {
  const val = customInput.value.trim().toLowerCase();
  if (!val) return;
  form.querySelector('input[value="custom"]').checked = true;
  save({ headerName: val });
});

clearCheckbox.addEventListener("change", () => {
  save({ clearOnClick: clearCheckbox.checked });
});

invertCheckbox.addEventListener("change", () => {
  save({ invertBadge: invertCheckbox.checked });
});
