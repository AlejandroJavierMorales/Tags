// =====================================
// FILE: app/api/resto/public/orders/get/route.js
// Descripción:
// Obtiene la sesión activa y su pedido público,
// incluyendo comercio, ubicación, sector y QR asociado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function POST(req) {

    let conn;

    try {

        const body =
            await req.json();

        const {

            sessionId,
            sessionToken

        } = body;

        if (

            !sessionId &&
            !sessionToken

        ) {

            return Response.json(

                {

                    error:
                        "sessionId o sessionToken es requerido."

                },

                {

                    status: 400

                }

            );

        }

        conn =
            await db.getConnection();

        /*
        =====================================
        SESIÓN ENRIQUECIDA
        =====================================
        */

        let sql =
            `
            SELECT
                s.*,

                st.name AS store_name,
                st.logo_url AS store_logo_url,
                st.app_type AS store_app_type,
                st.description AS store_description,
                st.slug AS store_slug,

                l.name AS location_name,
                l.location_code AS location_code,
                l.location_type AS location_type,
                l.description AS location_description,
                l.icon AS location_icon,
                l.capacity AS location_capacity,

                parent.name AS parent_location_name,
                parent.location_code AS parent_location_code,
                parent.location_type AS parent_location_type,

                qr.id AS qr_code_id,
                qr.code AS qr_code,
                qr.label AS qr_label

            FROM
                tags_resto_sessions s

            INNER JOIN
                tags_stores st
                    ON st.id = s.store_id

            LEFT JOIN
                tags_resto_locations l
                    ON l.id = s.location_id
                    AND l.store_id = s.store_id

            LEFT JOIN
                tags_resto_locations parent
                    ON parent.id = l.parent_id
                    AND parent.store_id = s.store_id

            LEFT JOIN
                tags_qr_codes qr
                    ON qr.id = COALESCE(
                        s.source_qr_code_id,
                        l.qr_code_id
                    )

            WHERE
            `;

        const params = [];

        if (sessionId) {

            sql +=
                " s.id = ? ";

            params.push(
                sessionId
            );

        } else {

            sql +=
                " s.session_token = ? ";

            params.push(
                sessionToken
            );

        }

        sql +=
            `
            LIMIT 1
            `;

        const [sessions] =
            await conn.query(

                sql,
                params

            );

        if (

            !sessions.length

        ) {

            return Response.json(

                {

                    error:
                        "Sesión no encontrada."

                },

                {

                    status: 404

                }

            );

        }

        const session =
            sessions[0];

        /*
        =====================================
        ITEMS
        =====================================
        */

        const [items] =
            await conn.query(

                `
                SELECT
                    *
                FROM
                    tags_resto_session_items
                WHERE
                    session_id = ?
                ORDER BY
                    id ASC
                `,

                [

                    session.id

                ]

            );

        /*
        =====================================
        RECALCULAR TOTALES
        =====================================
        */

        const subtotal =
            items.reduce(

                (

                    total,
                    item

                ) =>

                    total +

                    Number(

                        item.total_price || 0

                    ),

                0

            );

        const discount =
            Number(

                session.discount_total || 0

            );

        const total =
            subtotal - discount;

        /*
        =====================================
        SINCRONIZAR SESIÓN
        =====================================
        */

        await conn.query(

            `
            UPDATE
                tags_resto_sessions
            SET
                subtotal = ?,
                total = ?,
                updated_at = NOW()
            WHERE
                id = ?
            `,

            [

                subtotal,
                total,
                session.id

            ]

        );

        session.subtotal =
            subtotal;

        session.total =
            total;

        /*
        =====================================
        RESPUESTA
        =====================================
        */

        return Response.json(

            {

                success: true,

                session,

                items,

                totals: {

                    subtotal,

                    discount,

                    total

                }

            }

        );

    }

    catch (error) {

        console.error(

            "GET RESTO ORDER:",
            error

        );

        return Response.json(

            {

                error:
                    "Error interno del servidor."

            },

            {

                status: 500

            }

        );

    }

    finally {

        if (conn) {

            conn.release();

        }

    }

}