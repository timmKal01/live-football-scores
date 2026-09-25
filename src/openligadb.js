import { fetchJson } from './http.js';

const API = 'https://api.openligadb.de';

/**
 * Fetches matches for one league. The current round is a single small request; any
 * date range needs the whole season (one request, a few hundred matches).
 * Tries each configured shortcut until one returns matches.
 */
export async function fetchLeagueMatches(league, season, { currentRoundOnly }) {
    let lastError = null;
    for (const template of league.shortcuts) {
        const shortcut = template.replace('{season}', String(season));
        const url = currentRoundOnly ? `${API}/getmatchdata/${encodeURIComponent(shortcut)}` : `${API}/getmatchdata/${encodeURIComponent(shortcut)}/${season}`;
        try {
            const matches = await fetchJson(url);
            if (Array.isArray(matches) && matches.length) return { shortcut, matches };
        } catch (err) {
            lastError = err;
        }
    }
    if (lastError) throw lastError;
    return { shortcut: null, matches: [] };
}
