import { db } from "@/app/lib/tags-db";
import { getEventSession } from "./geEventSession";
import { getStaffPermissions } from "./getStaffPermissions";

const PERMISSION_ALIASES = {
    "checkin.scan": ["checkin.scan", "checkin_scan", "checkin.manage"],
    checkin_scan: ["checkin.scan", "checkin_scan", "checkin.manage"],
    "attendees.update": ["attendees.update", "attendees.manage"],
    "attendees.view": ["attendees.view", "attendees.manage"],
    "settings.manage": ["settings.manage", "events.manage"],
    "events.view": ["events.view", "events.manage", "dashboard.view"]
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
        session.type === "event_staff" || session.type === "business_staff";

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
                product_code,
                status,
                name,
                location,
                address,
                latitude,
                longitude,
                credential_note,
                starts_at,
                ends_at
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

    const [[activeProduct]] = await db.query(
        `SELECT 1 AS enabled
           FROM tags_business_addons
          WHERE business_id=?
            AND TRIM(LOWER(addon_code))=?
            AND status='active'
            AND (expires_at IS NULL OR expires_at>=NOW())
          LIMIT 1`,
        [Number(event.business_id), String(event.product_code || "e_events")]
    );
    if (!activeProduct) {
        return { ok: false, status: 403, error: "El producto de Eventos correspondiente no está activo" };
    }

    if (access.isStaff) {
        if (access.session.type === "business_staff") {
            if (Number(event.business_id) !== access.businessId) return { ok: false, status: 403, error: "El evento pertenece a otro negocio" };
            const [[central]] = await db.query(`SELECT permissions_json FROM tags_business_staff_app_access WHERE staff_id=? AND business_id=? AND app_code=? AND status='active' LIMIT 1`, [Number(access.session.staffId || 0), Number(event.business_id), String(event.product_code || "e_events")]);
            if (!central) return { ok: false, status: 403, error: "No tenés acceso a Eventos" };
            let permissions = [];
            try { permissions = Array.isArray(central.permissions_json) ? central.permissions_json : JSON.parse(central.permissions_json || "[]"); } catch {}
            const accepted = PERMISSION_ALIASES[permission] || [permission];
            if (permission && !accepted.some(item => permissions.includes(item))) return { ok: false, status: 403, error: "No tenés permisos para esta operación" };
            return { ...access, event, permissions };
        }
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
