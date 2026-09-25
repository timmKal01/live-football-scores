# Live Football Scores: Bundesliga, Champions League & More

Live and final scores, goal-by-goal timelines and half-time results for German and European football, plus German ice hockey. Run it on demand for a scoreboard, or schedule it in monitor mode to get only the matches where something just happened: a goal, kickoff, or full time.

| Competition | Status |
|---|---|
| 1. Bundesliga, 2. Bundesliga, 3. Liga, DFB-Pokal, Frauen-Bundesliga | Complete and current |
| UEFA Champions League, UEFA Europa League | Complete and current |
| DEL (German ice hockey), Champions Hockey League | Complete and current |
| Premier League, LaLiga | Community-maintained: recent results are often entered days late |

The data comes from [OpenLigaDB](https://www.openligadb.de), a community-run open sports database that publishes its data under the Open Database License. It is read over a documented public API: no scraping, no proxies, no login.

## Here's a real match it returns

```json
{
  "matchId": 87388,
  "league": "ucl",
  "leagueName": "Champions League 2026/2027",
  "sport": "football",
  "round": "1.Spieltag",
  "kickoffUtc": "2026-09-08T16:45:00.000Z",
  "status": "finished",
  "minutesSinceKickoff": null,
  "homeTeam": "FC Brügge",
  "homeTeamShort": "Brügge",
  "awayTeam": "Aston Villa",
  "awayTeamShort": "Villa",
  "homeScore": 2,
  "awayScore": 3,
  "halfTimeHomeScore": 1,
  "halfTimeAwayScore": 3,
  "periodScores": [
    { "period": "Half-time", "home": 1, "away": 3 },
    { "period": "Full-time", "home": 2, "away": 3 }
  ],
  "goals": [
    { "minute": 11, "scorer": "John McGinn", "team": "away", "homeScore": 0, "awayScore": 1, "isPenalty": false, "isOwnGoal": false, "isOvertime": false },
    { "minute": 19, "scorer": "Hugo Vetlesen", "team": "home", "homeScore": 1, "awayScore": 1, "isPenalty": false, "isOwnGoal": false, "isOvertime": false },
    { "minute": 22, "scorer": "Emiliano Buendía", "team": "away", "homeScore": 1, "awayScore": 2, "isPenalty": false, "isOwnGoal": false, "isOvertime": false }
  ],
  "dataCompleteness": "complete",
  "source": "Data from OpenLigaDB (www.openligadb.de), licensed under ODbL 1.0"
}
```

(Goal list shortened here; the real row lists all five goals.)

## Match status

| `status` | Meaning |
|---|---|
| `scheduled` | Not started. Score is `null`. |
| `live` | Kicked off and not yet marked finished. The score follows the goal list as it's entered. |
| `finished` | Final result recorded. |
| `result_pending` | Kickoff was hours ago but no result has been entered yet. The score is `null`, never a made-up 0-0. |

`minutesSinceKickoff` is plain elapsed time for live matches. OpenLigaDB has no official match clock, so it includes half-time and stoppages.

Hockey matches report `periodScores` as Period 1, 2 and 3, plus overtime or shootout when played.

## Input

| Field | What it does |
|---|---|
| `leagues` | `bl1`, `bl2`, `bl3`, `dfb`, `ucl`, `uel`, `epl`, `laliga`, `frauen-bl`, `del`, `chl`. Default `bl1`, `bl2`, `ucl`. |
| `range` | `current_round` (default), `live`, `today`, `yesterday`, `tomorrow`, `last_7_days`, `next_7_days`, or `custom`. Dates are UTC. |
| `dateFrom`, `dateTo` | For `custom`, `YYYY-MM-DD`. |
| `statuses` | Keep only `scheduled`, `live`, `finished` and/or `result_pending`. |
| `team` | Only matches involving a team whose name contains this text, e.g. `Bayern`. |
| `mode` | `snapshot` (default) or `monitor`. |
| `monitorStoreName` | Where monitor mode keeps the previous scores. |
| `maxMatches` | Cap, earliest kickoff first. Default 500. |

Everything happening in the Bundesliga right now:

```json
{ "leagues": ["bl1"], "range": "live" }
```

Bayern Munich's results over the last week, in every competition:

```json
{ "leagues": ["bl1", "dfb", "ucl"], "range": "last_7_days", "team": "Bayern" }
```

## Monitor mode: goal alerts

Set `mode` to `monitor` with `range: "live"` or `"today"`, and schedule it during match days. Each run returns only matches whose score or status changed since the previous run:

```json
{
  "matchId": 83190,
  "status": "live",
  "homeScore": 2,
  "awayScore": 1,
  "changeType": "score_changed",
  "previousStatus": "live",
  "previousHomeScore": 1,
  "previousAwayScore": 1
}
```

(Illustrative.) `changeType` is `score_changed`, `status_changed` (kickoff, full time), or `new`. The first run saves a baseline and reports every match as `new`.

**Please schedule sensibly.** OpenLigaDB is a free, privately funded service, and its fair-use terms ask for at most one request per league every 30 to 60 seconds during live matches, and far fewer otherwise. A schedule of every minute or two on match days, and a few times a day otherwise, is plenty. The actor also spaces out its own requests and backs off if the service is busy.

## Pricing

Charged per match returned. In monitor mode only changed matches are returned, so quiet minutes cost nothing.

## Good to know

- **Community data.** Results are entered by OpenLigaDB volunteers without editorial review. Live goals can lag, and occasionally contain errors that are corrected later. Don't use this where a wrong score would cause harm.
- **German spellings.** Team and round names are as entered in OpenLigaDB, often in German: "FC Brügge", "1.Spieltag" (matchday 1).
- **No US leagues.** MLB, NBA, NFL and NHL score data is licensed commercially by the leagues, and there's no open source this actor could use for them.
- **Team logos are not included.** OpenLigaDB links to logos hosted by third parties without granting rights to them, and asks apps not to hotlink them.
- **Availability.** OpenLigaDB is run by one volunteer operator with no uptime guarantee. If a competition can't be fetched, the run carries on with the others and says which one failed.

## Data licence and attribution

Match data is from OpenLigaDB and licensed under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Every row carries the attribution in its `source` field. If you publish the data, credit it as **"Data from OpenLigaDB (www.openligadb.de), licensed under ODbL 1.0"**. If you publicly share a modified copy of the database itself, it must stay under the ODbL; displaying scores in an app or on a page only needs the credit.

This actor is unofficial and is not affiliated with OpenLigaDB, any league, club or governing body.
