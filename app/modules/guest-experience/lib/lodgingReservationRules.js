export const GUEST_STAY_STATUS = Object.freeze({
    HOLD: "hold",
    PENDING_CONFIRMATION: "pending_confirmation",
    UPCOMING: "upcoming",
    RESERVED: "reserved",
    ACTIVE: "active",
    CHECKED_OUT: "checked_out",
    CANCELLED: "cancelled",
    NO_SHOW_REBOOKING: "no_show_rebooking"
});

export const INVENTORY_RELEASED_STATUSES = Object.freeze([
    GUEST_STAY_STATUS.CANCELLED,
    GUEST_STAY_STATUS.CHECKED_OUT,
    GUEST_STAY_STATUS.NO_SHOW_REBOOKING
]);

export const EDITABLE_STAY_STATUSES = Object.freeze([
    GUEST_STAY_STATUS.HOLD,
    GUEST_STAY_STATUS.PENDING_CONFIRMATION,
    GUEST_STAY_STATUS.UPCOMING,
    GUEST_STAY_STATUS.RESERVED,
    GUEST_STAY_STATUS.NO_SHOW_REBOOKING
]);

export const CHECKIN_ELIGIBLE_STATUSES = Object.freeze([
    GUEST_STAY_STATUS.UPCOMING,
    GUEST_STAY_STATUS.RESERVED,
    GUEST_STAY_STATUS.ACTIVE
]);

export const LODGING_CAPACITY_MODE = Object.freeze({
    TOTAL_OCCUPANCY: "total_occupancy",
    ADULT_CHILD_LIMITS: "adult_child_limits"
});

export const GAP_PROTECTION_MODE = Object.freeze({
    DISABLED: "disabled",
    WARN: "warn",
    MANUAL_REVIEW: "manual_review",
    BLOCK: "block",
    AUTO_ADJUST: "auto_adjust"
});

export const LODGING_AUTOMATION_MODE = Object.freeze({
    AVAILABILITY_ONLY: "availability_only",
    QUOTE_WHATSAPP: "quote_whatsapp",
    REQUEST_REVIEW: "request_review",
    AUTOMATIC: "automatic"
});

export const LODGING_REQUEST_STATUS = Object.freeze({
    HELD: "held",
    REVIEW_REQUIRED: "review_required",
    PENDING_PAYMENT: "pending_payment",
    CONFIRMED: "confirmed",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
    REJECTED: "rejected"
});

export function stayBlocksInventory(status) {
    return !INVENTORY_RELEASED_STATUSES.includes(String(status || ""));
}

export function normalizeGuestCounts({ adults, children } = {}) {
    return {
        adults: Math.max(1, Math.trunc(Number(adults || 1))),
        children: Math.max(0, Math.trunc(Number(children || 0)))
    };
}

export function parseLodgingDateInput(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const utc = new Date(Date.UTC(year, month - 1, day));
    if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return null;
    return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
}

export function countLodgingNights(startsAt, endsAt) {
    if (!(startsAt instanceof Date) || !(endsAt instanceof Date)) return 0;
    const start = Date.UTC(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate());
    const end = Date.UTC(endsAt.getFullYear(), endsAt.getMonth(), endsAt.getDate());
    return Math.round((end - start) / 86400000);
}

export function resolveCapacityMode(settings = {}) {
    const configuredMode = settings.lodgingPolicy?.capacityMode || settings.lodgingCapacityMode;
    return configuredMode === LODGING_CAPACITY_MODE.ADULT_CHILD_LIMITS
        ? LODGING_CAPACITY_MODE.ADULT_CHILD_LIMITS
        : LODGING_CAPACITY_MODE.TOTAL_OCCUPANCY;
}

export function normalizeLodgingPolicy(source = {}) {
    const capacityMode = Object.values(LODGING_CAPACITY_MODE).includes(source.capacityMode)
        ? source.capacityMode
        : LODGING_CAPACITY_MODE.TOTAL_OCCUPANCY;
    const gapProtectionMode = Object.values(GAP_PROTECTION_MODE).includes(source.gapProtectionMode)
        ? source.gapProtectionMode
        : GAP_PROTECTION_MODE.MANUAL_REVIEW;
    const automationMode = Object.values(LODGING_AUTOMATION_MODE).includes(source.automationMode)
        ? source.automationMode
        : LODGING_AUTOMATION_MODE.QUOTE_WHATSAPP;
    const minimumNights = Math.max(1, Math.min(365, Math.trunc(Number(source.minimumNights || 1))));
    const maximumNights = Math.max(minimumNights, Math.min(730, Math.trunc(Number(source.maximumNights || 90))));

    return {
        capacityMode,
        childFreeAge: Math.max(0, Math.min(17, Math.trunc(Number(source.childFreeAge || 0)))),
        askBedOccupancy: source.askBedOccupancy !== false,
        minimumNights,
        maximumNights,
        minimumAdvanceDays: Math.max(0, Math.min(730, Math.trunc(Number(source.minimumAdvanceDays || 0)))),
        maximumAdvanceDays: Math.max(1, Math.min(1095, Math.trunc(Number(source.maximumAdvanceDays || 365)))),
        gapProtectionMode,
        minimumGapBefore: Math.max(0, Math.min(30, Math.trunc(Number(source.minimumGapBefore || 0)))),
        minimumGapAfter: Math.max(0, Math.min(30, Math.trunc(Number(source.minimumGapAfter || 0)))),
        automationMode,
        holdMinutes: Math.max(5, Math.min(120, Math.trunc(Number(source.holdMinutes || 15))))
    };
}

export function validateUnitCapacity({ unit, adults, children, settings = {} } = {}) {
    const guests = normalizeGuestCounts({ adults, children });
    const adultCapacity = Math.max(0, Math.trunc(Number(unit?.capacity_adults || 0)));
    const childCapacity = Math.max(0, Math.trunc(Number(unit?.capacity_children || 0)));
    const configuredTotal = Math.max(0, Math.trunc(Number(unit?.capacity_total || 0)));
    const totalCapacity = configuredTotal || adultCapacity + childCapacity;
    const mode = resolveCapacityMode(settings);

    if (mode === LODGING_CAPACITY_MODE.ADULT_CHILD_LIMITS) {
        if (adultCapacity && guests.adults > adultCapacity) {
            return { ok: false, code: "adult_capacity_exceeded", error: `La unidad admite hasta ${adultCapacity} adulto${adultCapacity === 1 ? "" : "s"}.`, ...guests };
        }
        if (guests.children > childCapacity) {
            return { ok: false, code: "child_capacity_exceeded", error: `La unidad admite hasta ${childCapacity} menor${childCapacity === 1 ? "" : "es"}.`, ...guests };
        }
    } else if (totalCapacity && guests.adults + guests.children > totalCapacity) {
        return { ok: false, code: "total_capacity_exceeded", error: `La unidad admite hasta ${totalCapacity} huésped${totalCapacity === 1 ? "" : "es"} que ocupan plaza.`, ...guests };
    }

    return { ok: true, mode, totalCapacity, ...guests };
}

export function validateStayLength({ startsAt, endsAt, policy } = {}) {
    const normalized = normalizeLodgingPolicy(policy);
    const nights = countLodgingNights(startsAt, endsAt);
    if (nights < normalized.minimumNights) return { ok: false, code: "minimum_nights", nights, policy: normalized, error: `La estadía mínima es de ${normalized.minimumNights} noche${normalized.minimumNights === 1 ? "" : "s"}.` };
    if (nights > normalized.maximumNights) return { ok: false, code: "maximum_nights", nights, policy: normalized, error: `La estadía máxima es de ${normalized.maximumNights} noches.` };
    return { ok: true, nights, policy: normalized };
}
