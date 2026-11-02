(async () => {
    'use strict';
    const isAniWorld = value => { try { return /(^|\.)aniworld\.to$/.test(new URL(value).hostname); } catch { return false; } };
    const context = await (globalThis.browser || globalThis.chrome).runtime.sendMessage({ type: 'ANIWORLD_CONTEXT' }).catch(() => null);
    if (!isAniWorld(location.href) && !context?.aniWorld) return;

    const text = selector => document.querySelector(selector)?.textContent.trim() || '';
    let video = null;
    let segments = [];
    let requestKey = '';
    let generation = 0;
    let retryAt = 0;
    let failures = 0;
    let host;
    let button;

    const playbackEvents = ['timeupdate', 'seeked', 'ended'];
    const sourceEvents = ['emptied', 'loadstart'];
    function sourceChanged() { reset(); }

    function reset() {
        generation++;
        requestKey = '';
        segments = [];
        retryAt = 0;
        failures = 0;
        render();
    }

    (globalThis.browser || globalThis.chrome).runtime.onMessage.addListener((message, sender, respond) => {
        if (message?.type === 'ANIWORLD_SKIP_META' && window === window.top) {
            respond({
                url: location.origin + location.pathname,
                title: text('.series-title h1') || text('h1'),
                aliases: (document.querySelector('h1[data-alternativeTitles]')?.getAttribute('data-alternativeTitles') || '').split(',').map(s => s.trim()).filter(Boolean),
                episodeTitles: [text('.episodeEnglishTitle'), text('.episodeGermanTitle')].filter(Boolean)
            });
        } else if (message?.type === 'ANIWORLD_SKIP_RESET') {
            reset();
        }
    });

    function currentSegment() {
        if (!video || !video.isConnected || video.ended) return null;
        return segments.find(segment => video.currentTime >= segment.start && video.currentTime < segment.end);
    }

    function createButton() {
        if (host) return;
        host = document.createElement('div');
        host.id = 'aniworld-skip-control';
        host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;pointer-events:none;display:none;';
        const shadow = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        style.textContent = `
            button { box-sizing:border-box; pointer-events:auto; cursor:pointer;
                border:1px solid #ffffff90; border-radius:7px; padding:12px 18px;
                background:#13151eeF; color:white; box-shadow:0 3px 14px #0007;
                font:600 15px/1.25 system-ui,sans-serif; white-space:nowrap; }
            button:hover { background:#33394e; }
            button:focus-visible { outline:3px solid #80bfff; outline-offset:3px; }
        `;
        button = document.createElement('button');
        button.type = 'button';
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const segment = currentSegment();
            if (!segment || !Number.isFinite(video.duration)) return;
            video.currentTime = Math.min(segment.end, video.duration);
            render();
        });
        for (const type of ['pointerdown', 'mousedown', 'dblclick']) {
            button.addEventListener(type, event => event.stopPropagation());
        }
        shadow.append(style, button);
    }

    function render() {
        const segment = currentSegment();
        if (!segment || !video) {
            if (host) host.style.display = 'none';
            return;
        }
        const rect = video.getBoundingClientRect();
        const fullscreen = document.fullscreenElement;
        if (rect.width < 160 || rect.height < 90 || rect.bottom <= 0 || rect.top >= innerHeight ||
            (fullscreen && !fullscreen.contains(video))) {
            if (host) host.style.display = 'none';
            return;
        }
        createButton();
        const container = fullscreen || document.body;
        if (!container) return;
        if (host.parentElement !== container) container.append(host);
        button.textContent = segment.kind === 'opening' ? 'Opening überspringen ⏭' : 'Ending überspringen ⏭';
        button.title = `Bis ${Math.floor(segment.end / 60)}:${String(Math.floor(segment.end % 60)).padStart(2, '0')} springen · Anime-Skip`;
        host.style.display = 'block';
        host.style.top = `${Math.max(8, Math.min(innerHeight - 55, rect.bottom - 100))}px`;
        host.style.left = `${Math.max(8, Math.min(innerWidth, rect.right) - 16 - host.getBoundingClientRect().width)}px`;
    }

    async function load() {
        if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
        const key = `${video.currentSrc || video.src}|${Math.round(video.duration)}|${location.href}`;
        if (key === requestKey || Date.now() < retryAt) return;
        requestKey = key;
        segments = [];
        render();
        const version = ++generation;
        try {
            const result = await (globalThis.browser || globalThis.chrome).runtime.sendMessage({ type: 'ANIWORLD_SKIP_GET', duration: video.duration });
            if (version !== generation) return;
            if (result?.status === 'error' || result?.status === 'stale') throw new Error(result.message || 'Seite gewechselt');
            segments = Array.isArray(result?.segments) ? result.segments.filter(s =>
                ['opening', 'ending'].includes(s.kind) && Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start) : [];
            console.info('[Anime-Skip]', result?.status, result?.name || 'Keine passenden Zeitmarken vorhanden.');
            render();
        } catch (error) {
            if (version !== generation) return;
            failures++;
            // Bounded retries avoid hammering the shared, rate-limited API.
            if (failures < 3) { requestKey = ''; retryAt = Date.now() + failures * 60000; }
            console.warn('[Anime-Skip]', error.message);
        }
    }

    function tick() {
        const candidates = Array.from(document.querySelectorAll('video')).filter(v => {
            const rect = v.getBoundingClientRect();
            return rect.width >= 160 && rect.height >= 90;
        });
        candidates.sort((a, b) => {
            const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
            return br.width * br.height - ar.width * ar.height;
        });
        const next = candidates[0] || null;
        if (next !== video) {
            if (video) {
                for (const event of playbackEvents) video.removeEventListener(event, render);
                for (const event of sourceEvents) video.removeEventListener(event, sourceChanged);
            }
            video = next;
            reset();
            if (video) {
                for (const event of playbackEvents) video.addEventListener(event, render);
                for (const event of sourceEvents) video.addEventListener(event, sourceChanged);
            }
        }
        void load();
        render();
    }
    document.addEventListener('fullscreenchange', render);
    window.addEventListener('resize', render);
    window.addEventListener('scroll', render, { passive: true });
    // Covers lazy-loaded/replaced players and source changes without touching playback.
    const timer = setInterval(tick, 500);
    window.addEventListener('pagehide', event => { if (!event.persisted) clearInterval(timer); });
    tick();
})();
