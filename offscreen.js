// Offscreen documents never have focus, so navigator.clipboard is unavailable here;
// execCommand('copy') on a selected textarea still works.
const buffer = document.getElementById('buffer');

function copyText(text) {
  buffer.value = text;
  buffer.select();
  return document.execCommand('copy');
}

// Writes each item in turn, pausing so a clipboard manager records them as separate entries.
async function copyAll(items, gap) {
  for (const [i, text] of items.entries()) {
    if (i) await new Promise((resolve) => setTimeout(resolve, gap));
    if (!copyText(text)) return false;
  }
  return true;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen') return;
  copyAll(msg.items, msg.gap).then(sendResponse);
  return true; // keep the channel open for the async response
});
