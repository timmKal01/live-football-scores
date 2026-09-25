// Monitor mode: remember each match's score and status from the previous run and return
// only matches that changed. Kept in a NAMED key-value store, because every Apify run
// gets a fresh default store.
import { Actor } from 'apify';

const SNAPSHOT_KEY = 'LAST_SCORES';

export function diffScores(rows, previous) {
    const changed = [];
    for (const r of rows) {
        const prev = previous[r.matchId];
        const scoreChanged = prev && (prev.homeScore !== r.homeScore || prev.awayScore !== r.awayScore);
        const statusChanged = prev && prev.status !== r.status;
        if (prev && !scoreChanged && !statusChanged) continue;
        changed.push({
            ...r,
            changeType: !prev ? 'new' : scoreChanged ? 'score_changed' : 'status_changed',
            previousStatus: prev?.status ?? null,
            previousHomeScore: prev?.homeScore ?? null,
            previousAwayScore: prev?.awayScore ?? null,
        });
    }
    return changed;
}

export async function diffAgainstLastRun(rows, storeName) {
    const store = await Actor.openKeyValueStore(storeName);
    const previous = (await store.getValue(SNAPSHOT_KEY)) ?? {};
    const changed = diffScores(rows, previous);
    // Merge rather than replace, so matches outside this run's range keep their state.
    const next = { ...previous };
    for (const r of rows) next[r.matchId] = { status: r.status, homeScore: r.homeScore, awayScore: r.awayScore };
    await store.setValue(SNAPSHOT_KEY, next);
    return { changed, isFirstRun: Object.keys(previous).length === 0 };
}
