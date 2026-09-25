// Curated competitions. OpenLigaDB is community-run and also hosts hundreds of personal
// and test leagues; these are the real competitions that are actively maintained.
// Shortcuts are tried in order until one has matches for the season ({season} = start year).
// `completeness` is the share of past matches with a result entered, checked 2026-09-26.
export const LEAGUES = {
    bl1: { name: '1. Bundesliga', sport: 'football', shortcuts: ['bl1'], completeness: 'complete' },
    bl2: { name: '2. Bundesliga', sport: 'football', shortcuts: ['bl2'], completeness: 'complete' },
    bl3: { name: '3. Liga', sport: 'football', shortcuts: ['bl3'], completeness: 'complete' },
    dfb: { name: 'DFB-Pokal', sport: 'football', shortcuts: ['dfb'], completeness: 'complete' },
    ucl: { name: 'UEFA Champions League', sport: 'football', shortcuts: ['ucl'], completeness: 'complete' },
    uel: { name: 'UEFA Europa League', sport: 'football', shortcuts: ['uel', 'uel{season}'], completeness: 'complete' },
    epl: { name: 'Premier League', sport: 'football', shortcuts: ['pl'], completeness: 'community-maintained: recent results are often entered days late' },
    laliga: { name: 'LaLiga', sport: 'football', shortcuts: ['la1'], completeness: 'community-maintained: recent results are often entered days late' },
    'frauen-bl': { name: 'Frauen-Bundesliga', sport: 'football', shortcuts: ['ffb1'], completeness: 'complete' },
    del: { name: 'DEL (German ice hockey)', sport: 'ice-hockey', shortcuts: ['del'], completeness: 'complete' },
    chl: { name: 'Champions Hockey League', sport: 'ice-hockey', shortcuts: ['CHL'], completeness: 'complete' },
};

/** OpenLigaDB labels a season by its starting year: the 2026/27 season is 2026. */
export function currentSeason(now = new Date()) {
    return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}
