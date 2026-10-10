export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { eventAccessError, requireEventAccess } from "@/app/modules/e-events/lib/eventApiAccess";

const EVENT_STATUSES = new Set([
    "draft",
    "published",
    "active",
    "finished",
    "cancelled"
]);

export async function PUT(req) {
    const body =
        await req.json().catch(() => null);

    const id =
        Number(body?.id || 0);

    const access =
        await requireEventAccess({
            eventId: id,
            permission: "event.update"
        });

    if (!access.ok) return eventAccessError(access);
    if (access.isStaff) {
        return eventAccessError({
            status: 403,
            error: "El personal no puede modificar el evento"
        });
    }

    const name =
        String(body?.name || "").trim();

    if (!name) {
        return Response.json(
            { error: "El nombre es obligatorio" },
            { status: 400 }
        );
    }

    const status =
        EVENT_STATUSES.has(body.status)
            ? body.status
            : access.event.status;

    const latitude = body.latitude === null || body.latitude === "" ? null : Number(body.latitude);
    const longitude = body.longitude === null || body.longitude === "" ? null : Number(body.longitude);
    if ((latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
        return Response.json({ error: "Revisá las coordenadas del evento" }, { status: 400 });
    }

    try {
        await db.query(
            `
            UPDATE tags_events
            SET
                name = ?,
                description = ?,
                location = ?,
                address = ?,
                latitude = ?,
                longitude = ?,
                credential_note = ?,
                starts_at = ?,
                ends_at = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
                AND business_id = ?
            `,
            [
                name,
                body.description || null,
                body.location || null,
                String(body.address || "").trim() || null,
                latitude,
                longitude,
                String(body.credential_note || "").trim() || null,
                body.starts_at || null,
                body.ends_at || null,
                status,
                id,
                access.event.business_id
            ]
        );

        return Response.json({ ok: true });
    } catch (error) {
        console.error("EVENT UPDATE ERROR", error);
        return Response.json(
            { error: "No se pudo actualizar el evento" },
            { status: 500 }
        );
    }
}
