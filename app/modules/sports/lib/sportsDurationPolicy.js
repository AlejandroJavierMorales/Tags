import { parseJson } from "@/app/modules/turnos/lib/turnosService";

function boundedMinutes(value, fallback, minimum = 30, maximum = 720) {
    const parsed = Math.floor(Number(value));
    return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}

export function getSportsDurationPolicy(service) {
    const settings = parseJson(service?.settings_json, service?.settings || {});
    const sports = settings?.sports || {};
    const minimumMinutes = boundedMinutes(sports.minimumDurationMinutes, Math.max(60, Number(service?.duration_minutes || 60)), 30);
    const incrementMinutes = boundedMinutes(sports.durationIncrementMinutes, 30, 15, 180);
    const maxDurationMinutes = boundedMinutes(sports.maxDurationMinutes, Math.max(minimumMinutes, 180), minimumMinutes);
    return {
        minimumMinutes,
        incrementMinutes,
        maxDurationMinutes: Math.max(minimumMinutes, maxDurationMinutes)
    };
}

export function validateSportsDuration(service, requestedDuration) {
    const policy = getSportsDurationPolicy(service);
    const durationMinutes = Math.floor(Number(requestedDuration || policy.minimumMinutes));
    const valid = durationMinutes >= policy.minimumMinutes
        && durationMinutes <= policy.maxDurationMinutes
        && (durationMinutes - policy.minimumMinutes) % policy.incrementMinutes === 0;
    return { ...policy, durationMinutes, valid };
}

export function calculateSportsDurationPrice(basePrice, policy) {
    const amount = Number(basePrice || 0);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.round((amount * policy.durationMinutes / policy.minimumMinutes + Number.EPSILON) * 100) / 100;
}
