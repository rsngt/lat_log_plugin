// Shared helpers: find coordinates in map URLs or text, format them, geocode addresses.

const NUM = '([-+]?\\d{1,3}(?:\\.\\d+)?)';

// Ordered most-specific first: a Google Maps place/pin (!3d…!4d…) is more exact
// than the viewport centre (@lat,lng) that appears in the same URL.
const URL_PATTERNS = [
  new RegExp(`!3d${NUM}!4d${NUM}`),                                   // Google Maps place / dropped pin
  new RegExp(`[?&](?:q|query|ll|sll|daddr|destination|center|coordinate)=${NUM}\\s*,\\s*${NUM}`),
  new RegExp(`[?&]mlat=${NUM}&mlon=${NUM}`),                          // OpenStreetMap marker
  new RegExp(`#map=\\d+(?:\\.\\d+)?/${NUM}/${NUM}`),                  // OpenStreetMap viewport
  new RegExp(`[?&]cp=${NUM}~${NUM}`),                                 // Bing Maps
  new RegExp(`@${NUM},${NUM}`),                                       // Google Maps viewport centre
];

// Plain "lat, lng" anywhere in text, e.g. "-36.8485, 174.7633" or "/search/-36.8,174.7".
// Decimals required so street addresses like "Unit 3, 45 Queen St" aren't mistaken for coordinates.
const DEC = '([-+]?\\d{1,3}\\.\\d+)';
const DECIMAL_PAIR = new RegExp(`${DEC}\\s*[,;\\s]\\s*${DEC}`);

// Degrees/minutes/seconds, e.g. 36°50'54.6"S 174°45'47.9"E
const DMS_PART = /(\d{1,3})\s*°\s*(?:(\d{1,2}(?:\.\d+)?)\s*['′]\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*["″]\s*)?([NSEW])/gi;

function valid(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function parseDms(text) {
  const parts = [...text.matchAll(DMS_PART)];
  if (parts.length < 2) return null;
  let lat = null;
  let lng = null;
  for (const [, d, m, s, hemi] of parts.slice(0, 2)) {
    let value = Number(d) + Number(m || 0) / 60 + Number(s || 0) / 3600;
    const h = hemi.toUpperCase();
    if (h === 'S' || h === 'W') value = -value;
    if (h === 'N' || h === 'S') lat = value;
    else lng = value;
  }
  return lat !== null && lng !== null && valid(lat, lng) ? { lat, lng } : null;
}

export function parseCoords(input) {
  if (!input) return null;
  let text = String(input).replace(/\+/g, ' ');
  try { text = decodeURIComponent(text); } catch { /* leave as-is */ }

  for (const pattern of [...URL_PATTERNS, DECIMAL_PAIR]) {
    const m = text.match(pattern);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  }
  return parseDms(text);
}

function toDms(value, pos, neg) {
  const hemi = value < 0 ? neg : pos;
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = ((mFloat - m) * 60).toFixed(1);
  return `${d}°${m}'${s}"${hemi}`;
}

export const FORMATS = {
  separate: 'Two items: latitude, then longitude',
  separateLngLat: 'Two items: longitude, then latitude',
  latlng: 'lat, lng',
  latlngTight: 'lat,lng',
  lnglat: 'lng, lat (GeoJSON order)',
  dms: 'Degrees, minutes, seconds',
  gmaps: 'Google Maps link',
};

export function formatCoords({ lat, lng }, format = 'latlng', decimals = 6) {
  const la = lat.toFixed(decimals);
  const ln = lng.toFixed(decimals);
  switch (format) {
    case 'latlngTight': return `${la},${ln}`;
    case 'lnglat': return `${ln}, ${la}`;
    case 'dms': return `${toDms(lat, 'N', 'S')} ${toDms(lng, 'E', 'W')}`;
    case 'gmaps': return `https://www.google.com/maps?q=${la},${ln}`;
    default: return `${la}, ${ln}`;
  }
}

// The texts to put on the clipboard, in order. "Two items" formats copy latitude and
// longitude as separate clipboard entries so a clipboard manager (e.g. Paste) keeps both.
export function clipboardItems({ lat, lng }, format = 'separate', decimals = 6) {
  const la = lat.toFixed(decimals);
  const ln = lng.toFixed(decimals);
  if (format === 'separate') return [la, ln];
  if (format === 'separateLngLat') return [ln, la];
  return [formatCoords({ lat, lng }, format, decimals)];
}

// Gap between separate clipboard writes, long enough for a clipboard manager to record
// the first one before the second replaces it.
export const ITEM_GAP_MS = 800;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Look up an address or place name with OpenStreetMap's Nominatim service.
export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': navigator.language || 'en' } });
  if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
  const [hit] = await res.json();
  if (!hit) return null;
  return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name };
}

// Accepts coordinates typed directly, otherwise geocodes the text.
export async function resolveLocation(text) {
  const direct = parseCoords(text);
  if (direct) return { ...direct, label: 'Coordinates from text' };
  return geocode(text.trim());
}

export const DEFAULT_SETTINGS = { format: 'separate', decimals: 6 };

export async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}
