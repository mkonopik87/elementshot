chrome.action.onClicked.addListener(async tab => {
  try {
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content.js']});
    await chrome.action.setBadgeText({tabId: tab.id, text: ''});
  } catch {
    await chrome.action.setBadgeText({tabId: tab.id, text: '!'});
    await chrome.action.setTitle({tabId: tab.id, title: 'Chrome does not allow screenshots on this page. Open a regular website.'});
  }
});
let lastCapture = 0;
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== 'zen-capture' || !sender.tab) return;
  queue = queue.catch(() => {}).then(async () => {
    const active = await chrome.tabs.query({active: true, windowId: sender.tab.windowId});
    if (active[0]?.id !== sender.tab.id) throw new Error('Keep this tab active while capturing.');
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 550 - (Date.now() - lastCapture))));
    lastCapture = Date.now();
    return chrome.tabs.captureVisibleTab(sender.tab.windowId, {format: 'png'});
  });
  queue.then(data => respond({data}), error => respond({error: error.message}));
  return true;
});
