'use strict';

// Public shared client ID documented by anime-skip/api-client-ts (rate limited).
const SKIP_CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
const skipCache = new Map();
async function skipQuery(query, variables) {
    const key = JSON.stringify([query, variables]);
    const cached = skipCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.promise;
    const promise = (async () => {
        const response = await fetch('https://api.anime-skip.com/graphql', {
            method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json', 'X-Client-ID': SKIP_CLIENT_ID },
            body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000)
        });
        if (!response.ok) throw new Error(`Anime-Skip HTTP ${response.status}`);
        const result = await response.json();
        if (result.errors?.length) throw new Error(result.errors[0].message);
        return result.data;
    })();
    if (skipCache.size > 100) skipCache.delete(skipCache.keys().next().value);
    skipCache.set(key, { promise, expires: Date.now() + 30 * 60 * 1000 });
    try { return await promise; }
    catch (error) { skipCache.delete(key); throw error; }
}

async function resolveSkip(meta, duration) {
    const core = AnimeSkipCore;
    let shows = [];
    // AniWorld's visible and alternative titles cover translated and Japanese names.
    const searches = [...new Set([meta.title, ...(meta.aliases || [])])].filter(Boolean).slice(0, 4);
    for (const search of searches) {
        const data = await skipQuery(
            'query($search: String!) { searchShows(search: $search, limit: 50) { id name originalName } }',
            { search });
        shows = data.searchShows.filter(show => core.showKind(show, meta));
        if (shows.length) break;
    }
    const candidates = [];
    for (const show of shows.slice(0, 4)) {
        const data = await skipQuery(
            'query($id: ID!) { findEpisodesByShowId(showId: $id) { id season number name baseDuration } }',
            { id: show.id });
        candidates.push(...core.rankEpisodes(data.findEpisodesByShowId, meta,
            core.showKind(show, meta), duration).map(e => ({ ...e, showName: show.name })));
    }
    candidates.sort((a, b) => b.score - a.score || a.difference - b.difference);
    for (const candidate of candidates.slice(0, 4)) {
        // Large runtime differences indicate another cut; don't skip arbitrary scenes.
        if (candidate.difference > 30) continue;
        const data = await skipQuery(
            'query($id: ID!) { findEpisode(episodeId: $id) { id name baseDuration timestamps { at type { name } } urls { url timestampsOffset } } }',
            { id: candidate.id });
        const episode = data.findEpisode;
        const knownUrl = episode.urls?.find(item => item.url === meta.url);
        const segments = core.segments(episode, duration, knownUrl?.timestampsOffset || 0);
        if (segments.length) return { status: 'ready', segments, episodeId: episode.id,
            name: `${candidate.showName} · ${episode.name || meta.number}` };
    }
    return { status: 'missing', segments: [] };
}

(globalThis.browser || globalThis.chrome).runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'ANIWORLD_SKIP_GET' || sender.tab?.id == null) return;
    (async () => {
        const tab = await (globalThis.browser || globalThis.chrome).tabs.get(sender.tab.id);
        const meta = AnimeSkipCore.parseUrl(tab.url);
        if (!meta) return { status: 'inactive', segments: [] };
        try {
            const page = await (globalThis.browser || globalThis.chrome).tabs.sendMessage(tab.id, { type: 'ANIWORLD_SKIP_META' }, { frameId: 0 });
            if (page?.url === meta.url) {
                meta.aliases = [page.title, ...(page.aliases || [])].filter(s => typeof s === 'string').map(s => s.slice(0, 180)).slice(0, 20);
                meta.episodeTitles = (page.episodeTitles || []).filter(s => typeof s === 'string').map(s => s.slice(0, 200));
            }
        } catch { /* URL matching is still available if the page is being replaced. */ }
        const result = await resolveSkip(meta, Number(message.duration));
        const current = await (globalThis.browser || globalThis.chrome).tabs.get(tab.id);
        if (AnimeSkipCore.parseUrl(current.url)?.url !== meta.url) return { status: 'stale', segments: [] };
        return { ...result, pageUrl: meta.url };
    })().then(respond).catch(error => {
        console.warn('[Anime-Skip]', error.message);
        respond({ status: 'error', segments: [], message: 'Anime-Skip ist gerade nicht erreichbar.' });
    });
    return true;
});

(globalThis.browser || globalThis.chrome).tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (!changeInfo.url) return;
    (globalThis.browser || globalThis.chrome).tabs.sendMessage(tabId, { type: 'ANIWORLD_SKIP_RESET' }).catch(() => {});
});

(globalThis.browser || globalThis.chrome).runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'ANIWORLD_CONTEXT') return;
    respond({ aniWorld: !!sender.tab?.url && /(^|\.)aniworld\.to$/.test(new URL(sender.tab.url).hostname) });
});
