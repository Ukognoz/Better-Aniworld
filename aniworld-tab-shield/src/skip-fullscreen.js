(() => {
    'use strict';
    const isAniWorld = value => { try { return /(^|\.)aniworld\.to$/.test(new URL(value).hostname); } catch { return false; } };
    if (![location.href, ...[document.referrer, ...Array.from(location.ancestorOrigins || [])]].some(isAniWorld)) return;
    // Native fullscreen of the <video> excludes sibling controls. Fullscreen its
    // existing player container instead so the isolated skip overlay stays visible.
    const original = Element.prototype.requestFullscreen;
    if (!original) return;
    Element.prototype.requestFullscreen = function(options) {
        const target = this instanceof HTMLVideoElement && this.parentElement ? this.parentElement : this;
        return original.call(target, options);
    };
})();
