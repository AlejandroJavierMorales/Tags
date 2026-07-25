// =====================================
// API: /api/resto/public/session/open/route.js
// Descripción:
// Abre o reutiliza una sesión pública de Tags
// Resto a partir del QR escaneado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";

import { db }
    from "@/app/lib/tags-db";

function createToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            code
        } = await req.json();

        if (!code) {

            return Response.json(
                {
                    error:
                        "QR requerido"
                },
                {
                    status:400
                }
            );

        }

        const [qrRows] =
            await conn.query(
                `
                SELECT
                    *
                FROM tags_qr_codes
                WHERE code=?
                LIMIT 1
                `,
                [
                    code
                ]
            );

        const qr =
            qrRows[0];

        if (!qr) {

            return Response.json(
                {
                    error:
                        "QR inexistente"
                },
                {
                    status:404
                }
            );

        }

        if (
            !qr.is_active ||
            qr.status === "disabled" ||
            qr.status === "stopped"
        ) {

            return Response.json(
                {
                    error:
                        "QR no disponible"
                },
                {
                    status:403
                }
            );

        }

        const [locationRows] =
            await conn.query(
                `
                SELECT
                    l.*,

                    s.id           AS store_id,
                    s.name         AS store_name,
                    s.slug         AS store_slug,
                    s.status       AS store_status,

                    p.id           AS page_id,
                    p.status       AS page_status

                FROM tags_resto_locations l

                INNER JOIN tags_stores s
                    ON s.id=l.store_id
                   AND s.app_type='resto'

                LEFT JOIN tags_qr_pages p
                    ON p.id=s.page_id

                WHERE l.qr_code_id=?

                LIMIT 1
                `,
                [
                    qr.id
                ]
            );

        const location =
            locationRows[0];

        if (!location) {

            return Response.json(
                {
                    error:
                        "La ubicación no existe"
                },
                {
                    status:404
                }
            );

        }

        if (
            !location.is_active
        ) {

            return Response.json(
                {
                    error:
                        "La ubicación está deshabilitada"
                },
                {
                    status:403
                }
            );

        }

        const [sessionRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_resto_sessions
                WHERE location_id=?
                AND status='open'
                LIMIT 1
                `,
                [
                    location.id
                ]
            );

        let session =
            sessionRows[0];

        let isNew =
            false;

        if (!session) {

            isNew = true;

            const token =
                createToken();

            const [result] =
                await conn.query(
                    `
                    INSERT INTO tags_resto_sessions
                    (
                        store_id,
                        location_id,
                        source_qr_code_id,
                        session_token,
                        service_mode,
                        guests,
                        status,
                        subtotal,
                        discount_total,
                        total,
                        opened_at,
                        created_at,
                        updated_at
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        'table',
                        1,
                        'open',
                        0,
                        0,
                        0,
                        NOW(),
                        NOW(),
                        NOW()
                    )
                    `,
                    [
                        location.store_id,
                        location.id,
                        qr.id,
                        token
                    ]
                );

            const [newRows] =
                await conn.query(
                    `
                    SELECT *
                    FROM tags_resto_sessions
                    WHERE id=?
                    LIMIT 1
                    `,
                    [
                        result.insertId
                    ]
                );

            session =
                newRows[0];

        }

        return Response.json({

            ok:true,

            isNew,

            qr:{
                id:qr.id,
                code:qr.code,
                label:qr.label
            },

            store:{
                id:location.store_id,
                name:location.store_name,
                slug:location.store_slug,
                status:location.store_status
            },

            page:{
                id:location.page_id,
                status:location.page_status
            },

            location:{
                id:location.id,
                parent_id:location.parent_id,
                type:location.type,
                name:location.name,
                code:location.code,
                description:location.description,
                capacity:location.capacity
            },

            session

        });

    } catch (err) {

        console.error(
            "RESTO PUBLIC SESSION OPEN ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error abriendo la sesión"
            },
            {
                status:500
            }
        );

    } finally {

        conn.release();

    }

}