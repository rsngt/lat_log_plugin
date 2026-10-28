import {
  parseCoords, clipboardItems, resolveLocation, loadSettings, sleep, FORMATS, ITEM_GAP_MS,
} from './coords.js';

const $ = (id) => document.getElementById(id);
let settings = await loadSettings();
let pageCoords = null;
let lastResult = null;

function setStatus(message, kind = '') {
  $('status').textContent = message;
  $('status').className = `small ${kind}`;
}

const display = (coords) => clipboardItems(coords, settings.format, settings.decimals).join('\n');

async function copy(coords) {
  const items = clipboardItems(coords, settings.format, settings.decimals);
  for (const [i, text] of items.entries()) {
    if (i) {
      setStatus('Copying… keep this open');
      await sleep(ITEM_GAP_MS);
    }
    await navigator.clipboard.writeText(text);
  }
  setStatus(items.length > 1 ? `Copied ${items[0]}, then ${items[1]}` : `Copied: ${items[0]}`, 'ok');
}

function showResult(coords, label) {
  lastResult = coords;
  $('result').hidden = false;
  $('result-label').textContent = label || '';
  $('result-coords').textContent = display(coords);
}

function renderPage() {
  const el = $('page');
  if (!pageCoords) {
    el.textContent = 'No coordinates found in this tab’s address.';
    return;
  }
  el.classList.remove('muted');
  el.replaceChildren();
  const code = document.createElement('code');
  code.textContent = display(pageCoords);
  const btn = document.createElement('button');
  btn.textContent = 'Copy';
  btn.addEventListener('click', () => copy(pageCoords));
  el.append(code, btn);
}

// --- This page -------------------------------------------------------------
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
pageCoords = parseCoords(tab?.url);
renderPage();

// --- My location -----------------------------------------------------------
$('mine').addEventListener('click', () => {
  const btn = $('mine');
  btn.disabled = true;
  setStatus('Getting your location…');
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      btn.disabled = false;
      const c = { lat: coords.latitude, lng: coords.longitude };
      showResult(c, `Your location (±${Math.round(coords.accuracy)} m)`);
      await copy(c);
    },
    (err) => {
      btn.disabled = false;
      setStatus(`Couldn’t get location: ${err.message}`, 'err');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
});

// --- Address search --------------------------------------------------------
$('search').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = $('query').value.trim();
  if (!query) return;
  setStatus('Looking up…');
  try {
    const hit = await resolveLocation(query);
    if (!hit) {
      setStatus('No match found for that address.', 'err');
      return;
    }
    showResult(hit, hit.label);
    await copy(hit);
  } catch (err) {
    setStatus(err.message, 'err');
  }
});

$('result-copy').addEventListener('click', () => lastResult && copy(lastResult));

// --- Settings --------------------------------------------------------------
for (const [value, label] of Object.entries(FORMATS)) {
  $('format').append(new Option(label, value, false, value === settings.format));
}
$('decimals').value = settings.decimals;

async function saveSettings() {
  const decimals = Math.min(8, Math.max(0, Number($('decimals').value) || 0));
  settings = { format: $('format').value, decimals };
  await chrome.storage.sync.set(settings);
  renderPage();
  if (lastResult) $('result-coords').textContent = display(lastResult);
}
$('format').addEventListener('change', saveSettings);
$('decimals').addEventListener('change', saveSettings);
