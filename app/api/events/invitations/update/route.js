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

            id,

            title,

            template_id,
            theme_id,

            cover_image,
            logo_image,

            background_music_url,

            settings_json,

            is_public,
            is_active,

            requires_password,
            password

        } = body;

        // ============================================
        // VALIDATION
        // ============================================

        if (!id) {

            return Response.json(
                {
                    error:
                        "id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // ============================================
        // INVITATION
        // ============================================

        const [invitations] =
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
                [id]
            );

        if (!invitations.length) {

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
            invitations[0];

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
        // BUSINESS SECURITY
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
        // TEMPLATE VALIDATION
        // ============================================

        if (template_id) {

            const [templates] =
                await db.query(
                    `
                    SELECT id
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
        // THEME VALIDATION
        // ============================================

        if (theme_id) {

            const [themes] =
                await db.query(
                    `
                    SELECT id
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
            invitation.slug;

        if (
            title
            &&
            title !== invitation.title
        ) {

            slug =
                createSlug(title);

            const [duplicates] =
                await db.query(
                    `
                    SELECT id
                    FROM tags_event_invitations
                    WHERE
                        slug = ?
                        AND id != ?
                    LIMIT 1
                    `,
                    [
                        slug,
                        id
                    ]
                );

            if (duplicates.length) {

                slug =
                    `${slug}-${crypto.randomBytes(3).toString("hex")}`;
            }
        }

        // ============================================
        // PASSWORD HASH
        // ============================================

        let passwordHash =
            invitation.password_hash;

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

        if (!requires_password) {

            passwordHash =
                null;
        }

        // ============================================
        // UPDATE
        // ============================================

        await db.query(
            `
            UPDATE tags_event_invitations
            SET

                title = ?,
                slug = ?,

                template_id = ?,
                theme_id = ?,

                cover_image = ?,
                logo_image = ?,

                background_music_url = ?,

                settings_json = ?,

                is_public = ?,
                is_active = ?,

                requires_password = ?,
                password_hash = ?,

                updated_at = NOW()

            WHERE id = ?
            `,
            [

                title || invitation.title,
                slug,

                template_id || null,
                theme_id || null,

                cover_image || null,
                logo_image || null,

                background_music_url || null,

                settings_json
                    ? JSON.stringify(settings_json)
                    : null,

                is_public
                    ? 1
                    : 0,

                is_active === false
                    ? 0
                    : 1,

                requires_password
                    ? 1
                    : 0,

                passwordHash,

                id
            ]
        );

        // ============================================
        // LOG
        // ============================================

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.update",

            entityType:
                "invitation",

            entityId:
                id,

            description:
                `Invitación modificada: ${title || invitation.title}`,

            metadata: {

                invitation_id:
                    id,

                title:
                    title || invitation.title,

                slug

            },

            req
        });

        // ============================================
        // RESPONSE
        // ============================================

        return Response.json({

            ok: true,

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