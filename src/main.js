import { Actor, log } from 'apify';
import { LEAGUES, currentSeason } from './leagues.js';
import { fetchLeagueMatches } from './openligadb.js';
import { toRow } from './normalize.js';
import { diffAgainstLastRun } from './monitor.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    leagues: leaguesInput,
    range = 'current_round',
    dateFrom,
    dateTo,
    statuses,
    team,
    mode = 'snapshot',
    monitorStoreName = 'live-football-scores-monitor',
    maxMatches = 500,
} = input;

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const MATCH_EVENT = 'match-score';

// An empty form (first click, Apify's daily health check) still returns real matches:
// the current round always has fixtures, unlike "today" on a weekday.
const leagueKeys = (leaguesInput?.length ? leaguesInput : ['bl1', 'bl2', 'ucl']).filter((k) => {
    if (LEAGUES[k]) return true;
    log.warning(`Unknown league "${k}", skipping. Valid: ${Object.keys(LEAGUES).join(', ')}`);
    return false;
});

const DAY = 86400e3;
const startOfUtcDay = (t) => Math.floor(t / DAY) * DAY;
function window() {
    const today = startOfUtcDay(Date.now());
    switch (range) {
        case 'today': return [today, today + DAY];
        case 'yesterday': return [today - DAY, today];
        case 'tomorrow': return [today + DAY, today + 2 * DAY];
        case 'last_7_days': return [today - 6 * DAY, today + DAY];
        case 'next_7_days': return [today, today + 7 * DAY];
        case 'custom': {
            const from = Date.parse(`${dateFrom}T00:00:00Z`);
            const to = Date.parse(`${dateTo}T00:00:00Z`);
            if (Number.isNaN(from) || Number.isNaN(to)) throw new Error('For range "custom", set dateFrom and dateTo as YYYY-MM-DD.');
            return [from, to + DAY];
        }
        default: return null; // current_round and live
    }
}

const season = currentSeason();
const currentRoundOnly = range === 'current_round' || range === 'live';
const bounds = window();
const now = Date.now();
const fetchedAt = new Date(now).toISOString();
const wantedStatuses = new Set(range === 'live' ? ['live'] : (statuses?.length ? statuses : ['scheduled', 'live', 'finished', 'result_pending']));
const teamNeedle = team?.trim().toLowerCase();

let rows = [];
const problems = [];
for (const key of leagueKeys) {
    const league = LEAGUES[key];
    try {
        const { shortcut, matches } = await fetchLeagueMatches(league, season, { currentRoundOnly });
        let kept = 0;
        for (const m of matches) {
            try {
                const kickoff = Date.parse(m.matchDateTimeUTC);
                if (bounds && !(kickoff >= bounds[0] && kickoff < bounds[1])) continue;
                const row = toRow(m, { leagueKey: key, league, now, fetchedAt });
                if (!wantedStatuses.has(row.status)) continue;
                if (teamNeedle && ![row.homeTeam, row.awayTeam, row.homeTeamShort, row.awayTeamShort].some((t) => t?.toLowerCase().includes(teamNeedle))) continue;
                rows.push(row);
                kept++;
            } catch (err) {
                log.warning('Skipping malformed match', { league: key, matchId: m?.matchID, error: err.message });
            }
        }
        log.info(`${league.name}: ${kept} match(es)${shortcut ? '' : ' (no data for this season yet)'}`);
    } catch (err) {
        problems.push({ league: key, error: err.message });
        log.warning(`${league.name} failed; continuing with the others`, { error: err.message });
    }
}
if (leagueKeys.length && problems.length === leagueKeys.length) {
    throw new Error(`OpenLigaDB returned no data for any league (${problems.map((p) => `${p.league}: ${p.error}`).join('; ')}). It is a volunteer-run service and may be briefly down; try again shortly.`);
}

rows.sort((a, b) => (a.kickoffUtc ?? '').localeCompare(b.kickoffUtc ?? '') || a.matchId - b.matchId);
rows = rows.slice(0, Math.max(1, maxMatches));

if (mode === 'monitor') {
    const { changed, isFirstRun } = await diffAgainstLastRun(rows, monitorStoreName);
    log.info(isFirstRun
        ? `Monitor: first run, saved ${rows.length} match(es) as the baseline. All are reported as "new" this time.`
        : `Monitor: ${changed.length} of ${rows.length} match(es) changed since the last run.`);
    rows = changed;
}

await Actor.pushData(rows);
log.info(`Returned ${rows.length} match(es).`, {
    live: rows.filter((r) => r.status === 'live').length,
    resultPending: rows.filter((r) => r.status === 'result_pending').length,
    problems,
});

if (rows.length) await Actor.charge({ eventName: MATCH_EVENT, count: rows.length });

await Actor.exit();
