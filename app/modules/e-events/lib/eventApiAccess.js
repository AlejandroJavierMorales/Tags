import { db } from "@/app/lib/tags-db";
import { getEventSession } from "./geEventSession";
import { getStaffPermissions } from "./getStaffPermissions";

const PERMISSION_ALIASES = {
    "checkin.scan": ["checkin.scan", "checkin_scan"],
    checkin_scan: ["checkin.scan", "checkin_scan"]
};

function normalizedBusinessId(session) {
    return Number(
        session?.businessId
        || session?.business_id
        || 0
    );
}

export function eventAccessError(access) {
    return Response.json(
        {
            ok: false,
            error:
                access?.error
                || "Sin permisos"
        },
        {
            status:
                access?.status
                || 403
        }
    );
}

export async function requireEventSession() {
    const session =
        await getEventSession();

    if (!session) {
        return {
            ok: false,
            status: 401,
            error: "No autenticado"
        };
    }

    const isPlatformAdmin =
        session.role === "admin";

    const isStaff =
        session.type === "event_staff";

    const businessId =
        normalizedBusinessId(session);

    if (
        !isPlatformAdmin
        && !isStaff
        && !businessId
    ) {
        return {
            ok: false,
            status: 403,
            error: "La sesión no pertenece a un negocio"
        };
    }

    return {
        ok: true,
        session,
        isPlatformAdmin,
        isStaff,
        businessId
    };
}

export async function requireEventAccess({
    eventId,
    permission = null
}) {
    const access =
        await requireEventSession();

    if (!access.ok) return access;

    const normalizedEventId =
        Number(eventId || 0);

    if (!normalizedEventId) {
        return {
            ok: false,
            status: 400,
            error: "Evento inválido"
        };
    }

    const [[event]] =
        await db.query(
            `
            SELECT
                id,
                business_id,
                status,
                name
            FROM tags_events
            WHERE id = ?
            LIMIT 1
            `,
            [normalizedEventId]
        );

    if (!event) {
        return {
            ok: false,
            status: 404,
            error: "Evento no encontrado"
        };
    }

    if (access.isPlatformAdmin) {
        return {
            ...access,
            event
        };
    }

    if (access.isStaff) {
        const [[assignment]] =
            await db.query(
                `
                SELECT es.event_id
                FROM tags_events_event_staff es
                INNER JOIN tags_events_staff staff
                    ON staff.id = es.staff_id
                    AND staff.status = 'active'
                WHERE es.event_id = ?
                    AND es.staff_id = ?
                    AND staff.business_id = ?
                LIMIT 1
                `,
                [
                    normalizedEventId,
                    Number(access.session.staffId || 0),
                    Number(event.business_id)
                ]
            );

        if (!assignment) {
            return {
                ok: false,
                status: 403,
                error: "No estás asignado a este evento"
            };
        }

        if (permission) {
            const permissions =
                await getStaffPermissions(
                    access.session.staffId
                );

            const accepted =
                PERMISSION_ALIASES[permission]
                || [permission];

            if (
                !accepted.some(item =>
                    permissions.includes(item)
                )
            ) {
                return {
                    ok: false,
                    status: 403,
                    error: "No tenés permisos para esta operación"
                };
            }
        }

        return {
            ...access,
            event
        };
    }

    if (
        Number(event.business_id)
        !== access.businessId
    ) {
        return {
            ok: false,
            status: 403,
            error: "El evento pertenece a otro negocio"
        };
    }

    return {
        ...access,
        event
    };
}
