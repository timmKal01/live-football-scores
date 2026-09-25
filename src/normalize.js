// Pure: turns one OpenLigaDB match record into an output row. Unit-tested.

export const ATTRIBUTION = 'Data from OpenLigaDB (www.openligadb.de), licensed under ODbL 1.0';

// Past kickoff by more than this and still not marked finished: the game is over, but
// the volunteer-entered result hasn't arrived yet.
const LIVE_WINDOW_MS = { football: 3 * 3600e3, 'ice-hockey': 3.5 * 3600e3 };

const PERIOD_NAMES = [
    [/^Halbzeit$/i, 'Half-time'],
    [/^Endergebnis$/i, 'Full-time'],
    [/^(\d)\.\s*Drittel$/i, (m) => `Period ${m[1]}`],
    [/Verl[äa]ngerung/i, 'After extra time'],
    [/Elfmeter|Penalty/i, 'After penalties'],
];

export function periodName(german) {
    for (const [re, en] of PERIOD_NAMES) {
        const m = german?.match(re);
        if (m) return typeof en === 'function' ? en(m) : en;
    }
    return german ?? null;
}

export function matchStatus(match, sport, now = Date.now()) {
    if (match.matchIsFinished) return 'finished';
    const kickoff = Date.parse(match.matchDateTimeUTC);
    if (!Number.isFinite(kickoff) || now < kickoff) return 'scheduled';
    return now - kickoff <= (LIVE_WINDOW_MS[sport] ?? 3 * 3600e3) ? 'live' : 'result_pending';
}

/** Latest known score: final/period results when present, else the running goal tally. */
export function currentScore(match, status) {
    const results = [...(match.matchResults ?? [])].sort((a, b) => a.resultOrderID - b.resultOrderID);
    const goals = [...(match.goals ?? [])].sort((a, b) => a.goalID - b.goalID);
    const lastResult = results.at(-1);
    const lastGoal = goals.at(-1);
    // During a game the goal list moves before the results table does.
    if (status === 'live' && lastGoal) return { home: lastGoal.scoreTeam1, away: lastGoal.scoreTeam2 };
    if (lastResult) return { home: lastResult.pointsTeam1, away: lastResult.pointsTeam2 };
    if (lastGoal) return { home: lastGoal.scoreTeam1, away: lastGoal.scoreTeam2 };
    // Only a game in progress with no goals yet is genuinely 0-0. A scheduled game, or one
    // whose result simply hasn't been entered, has an unknown score, not a goalless one.
    return status === 'live' ? { home: 0, away: 0 } : { home: null, away: null };
}

export function toRow(match, { leagueKey, league, now = Date.now(), fetchedAt }) {
    const status = matchStatus(match, league.sport, now);
    const score = currentScore(match, status);
    const kickoff = Date.parse(match.matchDateTimeUTC);
    const home = match.team1 ?? {};
    const away = match.team2 ?? {};
    const results = [...(match.matchResults ?? [])].sort((a, b) => a.resultOrderID - b.resultOrderID);
    const halfTime = league.sport === 'football' ? results.find((r) => r.resultTypeID === 1) : null;

    return {
        matchId: match.matchID,
        league: leagueKey,
        leagueName: match.leagueName ?? league.name,
        sport: league.sport,
        round: match.group?.groupName ?? null,
        kickoffUtc: Number.isFinite(kickoff) ? new Date(kickoff).toISOString() : null,
        status,
        // OpenLigaDB has no match clock; this is plain elapsed time since kickoff,
        // so it includes half-time and stoppages.
        minutesSinceKickoff: status === 'live' ? Math.floor((now - kickoff) / 60000) : null,
        homeTeam: home.teamName ?? null,
        homeTeamShort: home.shortName || null,
        awayTeam: away.teamName ?? null,
        awayTeamShort: away.shortName || null,
        homeScore: score.home,
        awayScore: score.away,
        halfTimeHomeScore: halfTime?.pointsTeam1 ?? null,
        halfTimeAwayScore: halfTime?.pointsTeam2 ?? null,
        periodScores: results.map((r) => ({ period: periodName(r.resultName), home: r.pointsTeam1, away: r.pointsTeam2 })),
        goals: [...(match.goals ?? [])]
            .sort((a, b) => a.goalID - b.goalID)
            .map((g) => ({
                minute: g.matchMinute ?? null,
                scorer: g.goalGetterName || null,
                team: g.scoringTeamId === home.teamId ? 'home' : g.scoringTeamId === away.teamId ? 'away' : null,
                homeScore: g.scoreTeam1,
                awayScore: g.scoreTeam2,
                isPenalty: Boolean(g.isPenalty),
                isOwnGoal: Boolean(g.isOwnGoal),
                isOvertime: Boolean(g.isOvertime),
            })),
        // German local time as OpenLigaDB records it (no zone given).
        sourceLastUpdated: match.lastUpdateDateTime ?? null,
        dataCompleteness: league.completeness,
        source: ATTRIBUTION,
        fetchedAt,
    };
}
