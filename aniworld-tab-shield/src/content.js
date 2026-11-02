(() => {
    'use strict';

    const protectedDomains = [
        'aniworld.to', 's.to', 'voe.sx', 'vidoza.net',
        'streamtape.com', 'doodstream.com', 'opwiki.org'
    ];
    const isProtectedUrl = (value) => {
        try {
            const host = new URL(value).hostname;
            return protectedDomains.some(domain => host === domain || host.endsWith('.' + domain));
        } catch {
            return false;
        }
    };

    // Chromium exposes every ancestor, including cross-origin/nested players.
    const embedded = window !== window.top;
    const protectedAncestor = [document.referrer, ...Array.from(window.location.ancestorOrigins || [])].some(isProtectedUrl);
    if (!isProtectedUrl(window.location.href) && !protectedAncestor) return;

    // Install before player scripts save a reference to window.open.
    const blockedOpen = () => null;
    try {
        Object.defineProperty(window, 'open', {
            value: blockedOpen, writable: false, configurable: false
        });
    } catch {
        window.open = blockedOpen;
    }

    // Also intercept native popup links, including inherited base targets.
    const blockPopupLink = (event) => {
        const link = event.composedPath().find(node =>
            node && (node.tagName === 'A' || node.tagName === 'AREA') && node.href);
        if (!link) return;
        const target = (link.getAttribute('target') ||
            document.querySelector('base[target]')?.getAttribute('target') || '').toLowerCase();
        const newContext = target && !['_self', '_parent', '_top'].includes(target);
        const modifiedClick = event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1;
        const leavesPlayer = embedded && ['_parent', '_top'].includes(target);
        if (newContext || modifiedClick || leavesPlayer) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    };
    window.addEventListener('click', blockPopupLink, true);
    window.addEventListener('auxclick', blockPopupLink, true);

    // Do not remove player overlays/fullscreen controls or block CDN scripts.
    const selectors = ['#qr-host', 'ins.adsbygoogle', 'iframe[id*="google_ads"]'];
    if (/(^|\.)opwiki\.org$/.test(window.location.hostname)) {
        selectors.push('img[src*="computer-base.jpg"]', 'img[alt="Computer-Base"]',
            '#top-ad', '.top-ad', '#header-ad', 'div[class*="ad-top"]', 'div[id*="ad-top"]',
            '#sidebar-ad', '.sidebar-ad', '#right-ad', '.ad-right',
            'div[class*="ad-side"]', 'div[id*="ad-side"]', 'div[class*="werbung"]');
    }
    const selector = selectors.join(',');
    const cleanNode = (node) => {
        if (node.nodeType !== 1) return;
        if (node.matches(selector)) {
            node.remove();
            return;
        }
        node.querySelectorAll(selector).forEach(ad => ad.remove());
    };
    new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'attributes') cleanNode(record.target);
            else record.addedNodes.forEach(cleanNode);
        }
    }).observe(document, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['id', 'class', 'src', 'alt']
    });
    if (document.documentElement) cleanNode(document.documentElement);
})();
