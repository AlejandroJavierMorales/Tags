export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";

import { db }
    from "@/app/lib/tags-db";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

// ============================================
// CREATE SLUG
// ============================================

function createSlug(text = "") {

    return text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

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

            event_id,

            template_id,
            theme_id,

            title,

            cover_image,
            logo_image,

            background_music_url,

            settings_json,

            is_public,
            requires_password,
            password

        } = body;

        // ============================================
        // VALIDATION
        // ============================================

        if (!event_id) {

            return Response.json(
                {
                    error:
                        "event_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!title) {

            return Response.json(
                {
                    error:
                        "Título requerido"
                },
                {
                    status: 400
                }
            );
        }

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
                    "invitations.create"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para crear invitaciones"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // ============================================
        // EVENT
        // ============================================

        const [events] =
            await db.query(
                `
                SELECT
                    id,
                    business_id,
                    name
                FROM tags_events
                WHERE id = ?
                LIMIT 1
                `,
                [event_id]
            );

        if (!events.length) {

            return Response.json(
                {
                    error:
                        "Evento no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const event =
            events[0];

        // ============================================
        // BUSINESS SECURITY
        // ============================================

        if (
            session.role !== "admin"
            &&
            event.business_id !==
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
        // TEMPLATE
        // ============================================

        if (template_id) {

            const [templates] =
                await db.query(
                    `
                    SELECT
                        id
                    FROM tags_event_invitation_templates
                    WHERE
                        id = ?
                        AND is_active = 1
                    LIMIT 1
                    `,
                    [template_id]
                );

            if (!templates.length) {

                return Response.json(
                    {
                        error:
                            "Plantilla no encontrada"
                    },
                    {
                        status: 404
                    }
                );
            }
        }

        // ============================================
        // THEME
        // ============================================

        if (theme_id) {

            const [themes] =
                await db.query(
                    `
                    SELECT
                        id
                    FROM tags_event_invitation_themes
                    WHERE
                        id = ?
                        AND is_active = 1
                    LIMIT 1
                    `,
                    [theme_id]
                );

            if (!themes.length) {

                return Response.json(
                    {
                        error:
                            "Theme no encontrado"
                    },
                    {
                        status: 404
                    }
                );
            }
        }

        // ============================================
        // SLUG
        // ============================================

        let slug =
            createSlug(title);

        // ============================================
        // DUPLICATE SLUG
        // ============================================

        const [duplicates] =
            await db.query(
                `
                SELECT
                    id
                FROM tags_event_invitations
                WHERE slug = ?
                LIMIT 1
                `,
                [slug]
            );

        if (duplicates.length) {

            slug =
                `${slug}-${crypto.randomBytes(3).toString("hex")}`;
        }

        // ============================================
        // PASSWORD HASH
        // ============================================

        let passwordHash =
            null;

        if (
            requires_password
            &&
            password
        ) {

            passwordHash =
                crypto
                    .createHash("sha256")
                    .update(password)
                    .digest("hex");
        }

        // ============================================
        // INSERT
        // ============================================

        const [result] =
            await db.query(
                `
                INSERT INTO
                tags_event_invitations
                (

                    event_id,

                    template_id,
                    theme_id,

                    title,
                    slug,

                    cover_image,
                    logo_image,

                    background_music_url,

                    settings_json,

                    is_public,

                    requires_password,
                    password_hash,

                    published_at,

                    created_by,

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
                    ?,

                    ?,

                    ?,

                    ?,

                    ?,
                    ?,

                    NULL,

                    ?,

                    1,

                    NOW(),
                    NOW()

                )
                `,
                [

                    event_id,

                    template_id || null,
                    theme_id || null,

                    title,
                    slug,

                    cover_image || null,
                    logo_image || null,

                    background_music_url || null,

                    settings_json
                        ? JSON.stringify(settings_json)
                        : null,

                    is_public
                        ? 1
                        : 0,

                    requires_password
                        ? 1
                        : 0,

                    passwordHash,

                    session.businessId || null
                ]
            );

        const invitationId =
            result.insertId;

        // ============================================
        // DEFAULT BLOCKS
        // ============================================

        const defaultBlocks = [

            {
                type: "hero",
                title: "Portada",
                position: 1
            },

            {
                type: "event_info",
                title: "Información",
                position: 2
            },

            {
                type: "countdown",
                title: "Countdown",
                position: 3
            },

            {
                type: "location",
                title: "Ubicación",
                position: 4
            },

            {
                type: "rsvp",
                title: "RSVP",
                position: 5
            }

        ];

        for (const block of defaultBlocks) {

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

                    1,

                    NOW(),
                    NOW()

                )
                `,
                [

                    invitationId,

                    block.type,
                    block.position,

                    block.title,

                    JSON.stringify({})
                ]
            );
        }

        // ============================================
        // LOG
        // ============================================

        await createEventLog({

            eventId:
                event_id,

            actionCode:
                "invitations.create",

            entityType:
                "invitation",

            entityId:
                invitationId,

            description:
                `Invitación creada: ${title}`,

            metadata: {

                title,
                slug,

                template_id,
                theme_id

            },

            req
        });

        // ============================================
        // RESPONSE
        // ============================================

        return Response.json({

            ok: true,

            id:
                invitationId,

            slug

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