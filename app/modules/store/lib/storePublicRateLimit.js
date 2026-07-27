const buckets =
    globalThis.__tagsStoreRateLimits ||
    new Map();

globalThis.__tagsStoreRateLimits =
    buckets;

export function checkStorePublicRateLimit({
    key,
    limit = 20,
    windowMs = 60_000
}) {
    const now = Date.now();
    const current =
        buckets.get(key);

    if (
        !current ||
        current.resetAt <= now
    ) {
        buckets.set(key, {
            count: 1,
            resetAt: now + windowMs
        });

        return {
            allowed: true,
            retryAfter: 0
        };
    }

    if (current.count >= limit) {
        return {
            allowed: false,
            retryAfter:
                Math.max(
                    1,
                    Math.ceil(
                        (
                            current.resetAt -
                            now
                        ) / 1000
                    )
                )
        };
    }

    current.count += 1;

    return {
        allowed: true,
        retryAfter: 0
    };
}

export function storeRequestIp(req) {
    return (
        req.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown"
    );
}
