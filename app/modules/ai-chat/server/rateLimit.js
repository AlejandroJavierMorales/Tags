const requests = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

export function checkRateLimit(key) {
    const now = Date.now();
    const current = requests.get(key);

    if (!current || now - current.startedAt >= WINDOW_MS) {
        requests.set(key, { startedAt: now, count: 1 });
        return true;
    }

    if (current.count >= MAX_REQUESTS) return false;
    current.count += 1;
    return true;
}
