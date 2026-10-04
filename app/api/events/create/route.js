export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { eventAccessError, requireEventSession } from "@/app/modules/e-events/lib/eventApiAccess";

const EVENT_STATUSES = new Set([
    "draft",
    "published",
    "active",
    "finished",
    "cancelled"
]);

export async function POST(req) {
    const access =
        await requireEventSession();

    if (!access.ok) return eventAccessError(access);
    if (access.isStaff) {
        return eventAccessError({
            status: 403,
            error: "El personal no puede crear eventos"
        });
    }

    if (
        !access.isPlatformAdmin
        && access.session.role !== "event_client"
    ) {
        return eventAccessError({
            status: 403,
            error: "Tags Events no está habilitado para este cliente"
        });
    }

    try {
        const body =
            await req.json().catch(() => null);

        if (!body) {
            return Response.json(
                { error: "Cuerpo JSON inválido" },
                { status: 400 }
            );
        }

        const businessId =
            access.isPlatformAdmin
                ? Number(
                    body.business_id
                    || access.businessId
                    || 0
                )
                : access.businessId;

        const name =
            String(body.name || "").trim();

        const status =
            EVENT_STATUSES.has(body.status)
                ? body.status
                : "draft";

        if (!businessId || !name) {
            return Response.json(
                {
                    error: "Negocio y nombre son obligatorios"
                },
                { status: 400 }
            );
        }

        const [[business]] =
            await db.query(
                `
                SELECT id,name,email
                FROM tags_businesses
                WHERE id = ?
                LIMIT 1
                `,
                [businessId]
            );

        if (!business) {
            return Response.json(
                { error: "Empresa no encontrada" },
                { status: 404 }
            );
        }

        const connection =
            await db.getConnection();

        try {
            await connection.beginTransaction();

            const [result] =
                await connection.query(
                    `
                    INSERT INTO tags_events
                    (
                        business_id,
                        name,
                        description,
                        location,
                        starts_at,
                        ends_at,
                        status,
                        created_at,
                        updated_at
                    )
                    VALUES (?,?,?,?,?,?,?,NOW(),NOW())
                    `,
                    [
                        businessId,
                        name,
                        body.description || null,
                        body.location || null,
                        body.starts_at || null,
                        body.ends_at || null,
                        status
                    ]
                );

            await connection.query(
                `
                INSERT INTO tags_event_users
                (
                    event_id,
                    business_id,
                    name,
                    email,
                    password_hash,
                    role,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (?,?,?,?,?,'event_owner','active',NOW(),NOW())
                `,
                [
                    result.insertId,
                    businessId,
                    business.name,
                    business.email,
                    ""
                ]
            );

            await connection.commit();

            return Response.json({
                ok: true,
                id: result.insertId
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("EVENT CREATE ERROR", error);
        return Response.json(
            { error: "No se pudo crear el evento" },
            { status: 500 }
        );
    }
}
