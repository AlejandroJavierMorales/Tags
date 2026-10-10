import crypto from "node:crypto";

export function normalizeEventSlug(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 180);
}

export function createRegistrationAccessToken() {
    const token = crypto.randomBytes(32).toString("hex");
    return { token, hash: hashRegistrationAccessToken(token) };
}

export function hashRegistrationAccessToken(token) {
    return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function registrationAvailability(settings, event, occupied) {
    const now = Date.now();
    const opensAt = settings?.registration_opens_at
        ? new Date(settings.registration_opens_at).getTime()
        : null;
    const closesAt = settings?.registration_closes_at
        ? new Date(settings.registration_closes_at).getTime()
        : null;
    const capacity = settings?.capacity == null ? null : Number(settings.capacity);
    const remaining = capacity == null ? null : Math.max(0, capacity - Number(occupied || 0));

    let code = "available";
    let message = "La inscripción está disponible.";

    if (!settings || Number(settings.registration_enabled) !== 1) {
        code = "disabled";
        message = "La inscripción no está habilitada.";
    } else if (!["published", "active"].includes(event?.status)) {
        code = "event_unavailable";
        message = "El evento todavía no está disponible para inscripciones.";
    } else if (opensAt && opensAt > now) {
        code = "not_open";
        message = "La inscripción todavía no comenzó.";
    } else if (closesAt && closesAt < now) {
        code = "closed";
        message = "La inscripción ya finalizó.";
    } else if (remaining !== null && remaining <= 0) {
        code = "full";
        message = "No quedan lugares disponibles.";
    }

    return { code, message, available: code === "available", capacity, occupied: Number(occupied || 0), remaining };
}

export async function countOccupiedEventSeats(connection, eventId) {
    const [[row]] = await connection.query(
        `SELECT COALESCE(SUM(1 + GREATEST(COALESCE(plus_ones_confirmed,0),0)),0) AS occupied
           FROM tags_event_attendees
          WHERE event_id = ?
            AND status IN ('pending','confirmed','checked_in')`,
        [eventId]
    );
    return Number(row?.occupied || 0);
}
