export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { eventAccessError, requireEventAccess } from "@/app/modules/e-events/lib/eventApiAccess";

export async function DELETE(req) {
    const body =
        await req.json().catch(() => null);

    const id =
        Number(body?.id || 0);

    const access =
        await requireEventAccess({
            eventId: id,
            permission: "event.delete"
        });

    if (!access.ok) return eventAccessError(access);
    if (access.isStaff) {
        return eventAccessError({
            status: 403,
            error: "El personal no puede eliminar eventos"
        });
    }

    try {
        await db.query(
            `
            DELETE FROM tags_events
            WHERE id = ?
                AND business_id = ?
            `,
            [
                id,
                access.event.business_id
            ]
        );

        return Response.json({ ok: true });
    } catch (error) {
        console.error("EVENT DELETE ERROR", error);
        return Response.json(
            {
                error: "No se pudo eliminar el evento. Puede tener información relacionada."
            },
            { status: 409 }
        );
    }
}
