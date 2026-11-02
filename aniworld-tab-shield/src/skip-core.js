/* Shared, dependency-free matching and timestamp logic. */
(() => {
    'use strict';
    const normalize = value => String(value || '').normalize('NFKD')
        .replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    function parseUrl(value) {
        try {
            const url = new URL(value);
            if (!/(^|\.)aniworld\.to$/.test(url.hostname)) return null;
            const match = url.pathname.match(/^\/anime\/stream\/([^/]+)\/staffel-(\d+)\/episode-(\d+)\/?$/);
            if (!match || Number(match[2]) < 1 || Number(match[3]) < 1) return null;
            return { url: url.origin + url.pathname, slug: match[1],
                title: decodeURIComponent(match[1]).replace(/-/g, ' '),
                season: Number(match[2]), number: Number(match[3]) };
        } catch { return null; }
    }
    function showKind(show, meta) {
        const names = [meta.title, ...(meta.aliases || [])].map(normalize).filter(Boolean);
        const candidates = [show.name, show.originalName].map(normalize).filter(Boolean);
        if (candidates.some(name => names.includes(name))) return 'series';
        const n = meta.season;
        const ordinal = n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
        return candidates.some(name => names.some(base =>
            [`${base} season ${n}`, `${base} ${ordinal} season`, `${base} ${n}`].includes(name)))
            ? 'season' : null;
    }
    function rankEpisodes(episodes, meta, kind, duration) {
        const titles = (meta.episodeTitles || []).map(normalize)
            .filter(name => name && !/^(episode|folge) \d+$/.test(name));
        // Only infer continuous numbering when the complete previous range exists.
        const previous = episodes.filter(e => Number(e.season) > 0 && Number(e.season) < meta.season)
            .map(e => Number(e.number)).filter(n => Number.isInteger(n) && n > 0);
        const max = previous.length ? Math.max(...previous) : 0;
        const continuous = max > 0 && new Set(previous).size === max;
        return episodes.flatMap(episode => {
            const season = episode.season == null || episode.season === '' ? null : Number(episode.season);
            const seasonMatches = kind === 'season'
                ? season === null || season === 1 || season === meta.season
                : season === meta.season || (meta.season === 1 && season === null);
            if (!seasonMatches) return [];
            const titleMatch = titles.includes(normalize(episode.name));
            const numberMatch = Number(episode.number) === meta.number;
            const absoluteMatch = kind === 'series' && continuous &&
                Number(episode.number) === max + meta.number;
            if (!titleMatch && !numberMatch && !absoluteMatch) return [];
            const difference = Number.isFinite(duration) && episode.baseDuration > 0
                ? Math.abs(duration - episode.baseDuration) : 0;
            return [{ ...episode, score: titleMatch ? 100 : numberMatch ? 80 : 75, difference }];
        }).sort((a, b) => b.score - a.score || a.difference - b.difference);
    }
    function segments(episode, duration, offset = 0) {
        const limit = Number.isFinite(duration) && duration > 0 ? duration : episode.baseDuration;
        if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(offset)) return [];
        const marks = (episode.timestamps || []).filter(t => Number.isFinite(t.at) && t.at >= 0)
            .slice().sort((a, b) => a.at - b.at);
        const result = [];
        for (let i = 0; i < marks.length; i++) {
            const type = marks[i].type?.name;
            // Mixed sections can contain dialogue/plot and are deliberately preserved.
            const kind = ['Intro', 'New Intro'].includes(type) ? 'opening'
                : ['Credits', 'New Credits'].includes(type) ? 'ending' : null;
            if (!kind) continue;
            const next = marks.slice(i + 1).find(t => t.at > marks[i].at);
            // Never turn an unbounded opening into a skip to the end of the episode.
            if (!next && kind === 'opening') continue;
            const start = Math.max(0, marks[i].at + offset);
            const end = Math.min(limit, next ? next.at + offset : (episode.baseDuration || limit) + offset);
            if (end > start) result.push({ kind, start, end });
        }
        return result;
    }
    const api = { normalize, parseUrl, showKind, rankEpisodes, segments };
    globalThis.AnimeSkipCore = api;
    if (typeof module !== 'undefined') module.exports = api;
})();
