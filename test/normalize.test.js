// Tests on real OpenLigaDB responses (1. Bundesliga and DEL, 2026/27, captured 2026-09-26).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ATTRIBUTION, currentScore, matchStatus, periodName, toRow } from '../src/normalize.js';
import { diffScores } from '../src/monitor.js';
import { LEAGUES, currentSeason } from '../src/leagues.js';

const fixture = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}`, import.meta.url)));
const bl1 = fixture('bl1-2026.json');
const del = fixture('del-2026.json');
const FIXED_NOW = Date.parse('2026-09-26T12:00:00Z');

test('status: finished, scheduled, live and result_pending', () => {
    const finished = bl1.find((m) => m.matchIsFinished);
    assert.equal(matchStatus(finished, 'football', FIXED_NOW), 'finished');

    const future = bl1.find((m) => !m.matchIsFinished && Date.parse(m.matchDateTimeUTC) > FIXED_NOW);
    assert.equal(matchStatus(future, 'football', FIXED_NOW), 'scheduled');

    const kickoff = Date.parse(future.matchDateTimeUTC);
    assert.equal(matchStatus(future, 'football', kickoff + 50 * 60e3), 'live');
    assert.equal(matchStatus(future, 'football', kickoff + 4 * 3600e3), 'result_pending');
});

test('finished football match: final score, half-time and goals line up', () => {
    const m = bl1.find((x) => x.matchIsFinished && x.goals?.length >= 3);
    const row = toRow(m, { leagueKey: 'bl1', league: LEAGUES.bl1, now: FIXED_NOW, fetchedAt: 'x' });
    const final = [...m.matchResults].sort((a, b) => a.resultOrderID - b.resultOrderID).at(-1);
    assert.equal(row.homeScore, final.pointsTeam1);
    assert.equal(row.awayScore, final.pointsTeam2);
    assert.equal(row.status, 'finished');
    assert.ok(row.halfTimeHomeScore <= row.homeScore && row.halfTimeAwayScore <= row.awayScore);
    assert.deepEqual(row.periodScores.map((p) => p.period), ['Half-time', 'Full-time']);
    // The last goal's running score equals the final score.
    const lastGoal = row.goals.at(-1);
    assert.deepEqual([lastGoal.homeScore, lastGoal.awayScore], [row.homeScore, row.awayScore]);
    // Every goal is attributed to one of the two teams, and each goal adds exactly one.
    assert.ok(row.goals.every((g) => g.team === 'home' || g.team === 'away'));
    for (let i = 0; i < row.goals.length; i++) {
        const prev = i ? row.goals[i - 1] : { homeScore: 0, awayScore: 0 };
        const g = row.goals[i];
        assert.equal(g.homeScore + g.awayScore, prev.homeScore + prev.awayScore + 1);
    }
    assert.equal(row.source, ATTRIBUTION);
    assert.equal(row.minutesSinceKickoff, null);
});

test('hockey matches report periods, not halves', () => {
    const m = del.find((x) => x.matchIsFinished && x.matchResults?.length >= 3);
    const row = toRow(m, { leagueKey: 'del', league: LEAGUES.del, now: FIXED_NOW, fetchedAt: 'x' });
    assert.equal(row.sport, 'ice-hockey');
    assert.deepEqual(row.periodScores.slice(0, 3).map((p) => p.period), ['Period 1', 'Period 2', 'Period 3']);
    assert.equal(row.halfTimeHomeScore, null);
});

test('live score follows the goal list; scheduled has no score', () => {
    const live = { matchIsFinished: false, matchDateTimeUTC: '2026-09-26T11:00:00Z', matchResults: [{ resultOrderID: 1, resultTypeID: 1, pointsTeam1: 0, pointsTeam2: 0 }], goals: [{ goalID: 2, scoreTeam1: 1, scoreTeam2: 0 }, { goalID: 3, scoreTeam1: 1, scoreTeam2: 1 }] };
    assert.deepEqual(currentScore(live, 'live'), { home: 1, away: 1 });
    assert.deepEqual(currentScore({ matchResults: [], goals: [] }, 'scheduled'), { home: null, away: null });
    assert.deepEqual(currentScore({ matchResults: [], goals: [] }, 'live'), { home: 0, away: 0 });
    // A finished-but-not-entered result is unknown, never reported as 0-0.
    assert.deepEqual(currentScore({ matchResults: [], goals: [] }, 'result_pending'), { home: null, away: null });
});

test('period names translate from German', () => {
    assert.equal(periodName('Halbzeit'), 'Half-time');
    assert.equal(periodName('Endergebnis'), 'Full-time');
    assert.equal(periodName('2.Drittel'), 'Period 2');
    assert.equal(periodName('nach Verlängerung'), 'After extra time');
    assert.equal(periodName('Something else'), 'Something else');
});

test('monitor reports only new matches and real changes', () => {
    const rows = [
        { matchId: 1, status: 'live', homeScore: 1, awayScore: 0 },
        { matchId: 2, status: 'live', homeScore: 0, awayScore: 0 },
        { matchId: 3, status: 'finished', homeScore: 2, awayScore: 2 },
        { matchId: 4, status: 'scheduled', homeScore: null, awayScore: null },
    ];
    const previous = {
        1: { status: 'live', homeScore: 0, awayScore: 0 }, // goal
        2: { status: 'live', homeScore: 0, awayScore: 0 }, // unchanged
        3: { status: 'live', homeScore: 2, awayScore: 2 }, // full time
    };
    const changed = diffScores(rows, previous);
    assert.deepEqual(changed.map((c) => [c.matchId, c.changeType]), [[1, 'score_changed'], [3, 'status_changed'], [4, 'new']]);
    assert.equal(changed[0].previousHomeScore, 0);
});

test('season label is the starting year', () => {
    assert.equal(currentSeason(new Date('2026-09-26T00:00:00Z')), 2026);
    assert.equal(currentSeason(new Date('2027-03-01T00:00:00Z')), 2026);
    assert.equal(currentSeason(new Date('2027-07-15T00:00:00Z')), 2027);
});
