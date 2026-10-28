# Lat/Long Copier

A Chrome / Brave extension (Manifest V3) that puts a location's latitude and longitude on the clipboard.

## Ways to copy

| Where | How |
|---|---|
| A map page (Google Maps, OpenStreetMap, Bing, Apple Maps) | Click the toolbar icon → **Copy** under "This page", press **Alt+Shift+L**, or right-click the map → *Copy lat/long from this map* |
| A link to a map | Right-click the link → *Copy lat/long from this map link* |
| Any address or place name on a web page | Select the text, right-click → *Copy lat/long for "…"* |
| Your current position | Toolbar icon → **Copy my current location** |
| An address you type | Toolbar icon → type it → **Find** |

On Google Maps the extension uses the selected place or dropped pin when there is one, and the map centre otherwise.
After a right-click or shortcut copy, the toolbar icon shows ✓ (or ! if nothing was found); hover it to see what was copied.

By default latitude and longitude are copied as **two separate clipboard items** — latitude first, then longitude about a second later — so a clipboard manager such as Paste keeps both in its history. Plain ⌘V pastes the longitude (the most recent item); pick the latitude from Paste's history. When copying from the popup, leave it open until it says "Copied".

The bottom of the popup switches between two items (lat then lng, or lng then lat) and a single combined item (lat, lng / lng, lat / DMS / Google Maps link), and sets the decimal places.

## Install (unpacked)

1. Open `chrome://extensions` (Brave: `brave://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.
4. Optional: pin the extension; change the shortcut at `chrome://extensions/shortcuts`.

## Notes

- Address lookups go to OpenStreetMap's free Nominatim service, which allows light personal use (about one request per second).
- "My location" uses the browser's location service. On macOS, the browser itself needs Location Services turned on in System Settings → Privacy & Security.
