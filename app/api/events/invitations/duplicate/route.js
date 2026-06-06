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
            invitation_id
        } = body;

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
                    "invitations.create"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para duplicar invitaciones"
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
        // NEW DATA
        // ============================================

        const title =
            `${invitation.title} (Copia)`;

        const slug =
            `${createSlug(title)}-${crypto.randomBytes(3).toString("hex")}`;

        // ============================================
        // INSERT DUPLICATE
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

                    ?,

                    ?,

                    NOW(),
                    NOW()

                )
                `,
                [

                    invitation.event_id,

                    invitation.template_id,
                    invitation.theme_id,

                    title,
                    slug,

                    invitation.cover_image,
                    invitation.logo_image,

                    invitation.background_music_url,

                    invitation.settings_json,

                    invitation.is_public,

                    invitation.requires_password,
                    invitation.password_hash,

                    invitation.created_by,

                    invitation.is_active
                ]
            );

        const newInvitationId =
            result.insertId;

        // ============================================
        // DUPLICATE BLOCKS
        // ============================================

        const [blocks] =
            await db.query(
                `
                SELECT *
                FROM tags_event_invitation_blocks
                WHERE invitation_id = ?
                `,
                [invitation_id]
            );

        for (const block of blocks) {

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

                    newInvitationId,

                    block.type,
                    block.position,

                    block.title,

                    block.config_json,

                    block.is_active
                ]
            );
        }

        // ============================================
        // DUPLICATE SEO
        // ============================================

        const [seoRows] =
            await db.query(
                `
                SELECT *
                FROM tags_event_invitation_seo
                WHERE invitation_id = ?
                LIMIT 1
                `,
                [invitation_id]
            );

        if (seoRows.length) {

            const seo =
                seoRows[0];

            await db.query(
                `
                INSERT INTO
                tags_event_invitation_seo
                (

                    invitation_id,

                    meta_title,
                    meta_description,

                    og_image,

                    noindex,

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

                    NOW(),
                    NOW()

                )
                `,
                [

                    newInvitationId,

                    seo.meta_title,
                    seo.meta_description,

                    seo.og_image,

                    seo.noindex
                ]
            );
        }

        // ============================================
        // LOG
        // ============================================

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.duplicate",

            entityType:
                "invitation",

            entityId:
                newInvitationId,

            description:
                `Invitación duplicada: ${title}`,

            metadata: {

                source_invitation_id:
                    invitation_id,

                new_invitation_id:
                    newInvitationId

            },

            req
        });

        // ============================================
        // RESPONSE
        // ============================================

        return Response.json({

            ok: true,

            invitation_id:
                newInvitationId

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