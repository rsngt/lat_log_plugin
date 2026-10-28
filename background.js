import { parseCoords, clipboardItems, resolveLocation, loadSettings, ITEM_GAP_MS } from './coords.js';

// Map sites where the "this page" / "this link" menu items make sense.
const MAP_URLS = [
  '*://*.google.com/maps*',
  '*://*.google.co.nz/maps*',
  '*://*.google.com.au/maps*',
  '*://*.google.co.uk/maps*',
  '*://maps.google.com/*',
  '*://www.openstreetmap.org/*',
  '*://www.bing.com/maps*',
  '*://maps.apple.com/*',
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'selection',
      title: 'Copy lat/long for “%s”',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'link',
      title: 'Copy lat/long from this map link',
      contexts: ['link'],
      targetUrlPatterns: MAP_URLS,
    });
    chrome.contextMenus.create({
      id: 'page',
      title: 'Copy lat/long from this map',
      contexts: ['page', 'frame'],
      documentUrlPatterns: MAP_URLS,
    });
  });
});

// Service workers can't touch the clipboard, so hand the text to an offscreen page.
async function writeClipboard(items) {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Copy coordinates to the clipboard',
    });
  }
  const ok = await chrome.runtime.sendMessage({ target: 'offscreen', items, gap: ITEM_GAP_MS });
  await chrome.offscreen.closeDocument();
  if (!ok) throw new Error('Clipboard write failed');
}

function flashBadge(tabId, ok, title) {
  chrome.action.setBadgeBackgroundColor({ tabId, color: ok ? '#067647' : '#b42318' });
  chrome.action.setBadgeText({ tabId, text: ok ? '✓' : '!' });
  chrome.action.setTitle({ tabId, title });
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: '' });
    chrome.action.setTitle({ tabId, title: 'Copy lat/long' });
  }, 2500);
}

async function copyCoords(coords, tabId) {
  if (!coords) {
    flashBadge(tabId, false, 'No coordinates found');
    return;
  }
  const { format, decimals } = await loadSettings();
  const items = clipboardItems(coords, format, decimals);
  try {
    await writeClipboard(items);
    flashBadge(tabId, true, `Copied: ${items.join(', then ')}`);
  } catch (err) {
    flashBadge(tabId, false, err.message);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const tabId = tab?.id;
  if (info.menuItemId === 'selection') {
    try {
      await copyCoords(await resolveLocation(info.selectionText), tabId);
    } catch (err) {
      flashBadge(tabId, false, err.message);
    }
  } else if (info.menuItemId === 'link') {
    await copyCoords(parseCoords(info.linkUrl), tabId);
  } else if (info.menuItemId === 'page') {
    await copyCoords(parseCoords(info.frameUrl || info.pageUrl || tab?.url), tabId);
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'copy-from-tab') await copyCoords(parseCoords(tab?.url), tab?.id);
});
