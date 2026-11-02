'use strict';



const PROTECTED_DOMAINS = [
    'aniworld.to', 's.to', 'voe.sx', 'vidoza.net',
    'streamtape.com', 'doodstream.com', 'opwiki.org'
];

function isProtectedUrl(value) {
    try {
        const host = new URL(value).hostname;
        return PROTECTED_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
    } catch {
        return false;
    }
}

// A popup can take focus before onCreated. Check its source tab instead;
// this also works immediately after a background service worker restart.
const extensionApi = globalThis.browser || globalThis.chrome;
extensionApi.tabs.onCreated.addListener(async (tab) => {
    if (tab.openerTabId === undefined || tab.id === undefined) return;
    try {
        const opener = await extensionApi.tabs.get(tab.openerTabId);
        if (opener && isProtectedUrl(opener.url)) await extensionApi.tabs.remove(tab.id);
    } catch { /* Source or popup may already have closed. */ }
});
