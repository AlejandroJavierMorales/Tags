export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

// ============================================
// POST
// ============================================

export async function POST(req) {

    try {

        // ============================================
        // SESSION
        // ============================================

        const session =
            await getEventSession();

        if (!session) {

            return Response.json(
                {
                    error: "Unauthorized"
                },
                {
                    status: 401
                }
            );
        }

        // ============================================
        // BODY
        // ============================================

        const body =
            await req.json();

        const {

            invitation_id,

            type,

            title,

            position,

            config_json,

            is_active

        } = body;

        // ============================================
        // VALIDATION
        // ============================================

        if (!invitation_id) {

            return Response.json(
                {
                    error:
                        "invitation_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!type) {

            return Response.json(
                {
                    error:
                        "type requerido"
                },
                {
                    status: 400
                }
            );
        }

        // ============================================
        // INVITATION
        // ============================================

        const [rows] =
            await db.query(
                `
                SELECT

                    i.*,

                    e.business_id

                FROM tags_event_invitations i

                INNER JOIN tags_events e
                    ON e.id = i.event_id

                WHERE i.id = ?
                LIMIT 1
                `,
                [invitation_id]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Invitación no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const invitation =
            rows[0];

        // ============================================
        // STAFF PERMISSIONS
        // ============================================

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

        if (!isOwner) {

            if (
                session.type !== "event_staff"
            ) {

                return Response.json(
                    {
                        error:
                            "Sin permisos"
                    },
                    {
                        status: 403
                    }
                );
            }

            const allowed =
                await staffHasPermission(
                    session.staffId,
                    "invitations.update"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para modificar invitaciones"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // ============================================
        // SECURITY
        // ============================================

        if (
            session.role !== "admin"
            &&
            invitation.business_id !==
            session.businessId
        ) {

            return Response.json(
                {
                    error:
                        "Sin permisos"
                },
                {
                    status: 403
                }
            );
        }

        // ============================================
        // POSITION
        // ============================================

        let finalPosition =
            position;

        if (
            finalPosition === undefined
            ||
            finalPosition === null
        ) {

            const [positions] =
                await db.query(
                    `
                    SELECT MAX(position) AS max_position
                    FROM tags_event_invitation_blocks
                    WHERE invitation_id = ?
                    `,
                    [invitation_id]
                );

            finalPosition =
                Number(
                    positions?.[0]?.max_position || 0
                ) + 1;
        }

        // ============================================
        // INSERT
        // ============================================

        const [result] =
            await db.query(
                `
                INSERT INTO
                tags_event_invitation_blocks
                (

                    invitation_id,

                    type,

                    position,

                    title,

                    config_json,

                    is_active,

                    created_at,
                    updated_at

                )

                VALUES
                (

                    ?,

                    ?,

                    ?,

                    ?,

                    ?,

                    ?,

                    NOW(),
                    NOW()

                )
                `,
                [

                    invitation_id,

                    type,

                    finalPosition,

                    title || null,

                    config_json
                        ? JSON.stringify(config_json)
                        : null,

                    is_active === false
                        ? 0
                        : 1
                ]
            );

        // ============================================
        // LOG
        // ============================================

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.blocks.create",

            entityType:
                "invitation_block",

            entityId:
                result.insertId,

            description:
                `Bloque agregado (${type})`,

            metadata: {

                invitation_id,

                type,

                position:
                    finalPosition

            },

            req
        });

        // ============================================
        // RESPONSE
        // ============================================

        return Response.json({

            ok: true,

            id:
                result.insertId

        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message ||
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}