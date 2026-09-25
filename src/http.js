// OpenLigaDB is a privately funded community service. Its API terms ask clients to
// identify themselves, stagger requests, and back off on 429/5xx; this does all three.

export const USER_AGENT = 'live-football-scores/0.1 (+https://apify.com/m_ctim/live-football-scores)';

const MIN_GAP_MS = 1500;
let lastCallAt = 0;
let queue = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function throttle() {
    const next = queue.then(async () => {
        // Spaced out, with a little jitter so runs don't all hit on the same second.
        const wait = lastCallAt + MIN_GAP_MS + Math.floor(Math.random() * 500) - Date.now();
        if (wait > 0) await sleep(wait);
        lastCallAt = Date.now();
    });
    queue = next.catch(() => {});
    return next;
}

export async function fetchJson(url, { attempts = 3, timeoutMs = 25000 } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        await throttle();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let res;
        try {
            res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: controller.signal });
        } catch (err) {
            lastError = err.name === 'AbortError' ? new Error(`OpenLigaDB timed out after ${timeoutMs}ms`) : err;
            if (attempt < attempts) await sleep(2000 * 2 ** (attempt - 1));
            continue;
        } finally {
            clearTimeout(timer);
        }
        if (res.ok) return res.json();
        lastError = new Error(`OpenLigaDB returned HTTP ${res.status} for ${url}`);
        if (res.status !== 429 && res.status < 500) throw lastError;
        if (attempt < attempts) await sleep(4000 * 2 ** (attempt - 1));
    }
    throw lastError;
}
