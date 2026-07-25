// =====================================
// API: /api/resto/admin/locations/toggle-active
// Descripción:
// Activa / desactiva una ubicación.
// También actualiza el estado del QR asociado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            id,
            businessId,
            is_active
        } = await req.json();

        if (!id) {

            return Response.json(
                {
                    error: "id requerido"
                },
                {
                    status: 400
                }
            );

        }

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId requerido"
                },
                {
                    status: 400
                }
            );

        }

        const [storeRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id=?
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        if (!storeRows.length) {

            return Response.json(
                {
                    error:
                        "Tienda inexistente"
                },
                {
                    status: 404
                }
            );

        }

        const storeId =
            storeRows[0].id;

        const [rows] =
            await conn.query(
                `
                SELECT *
                FROM tags_resto_locations
                WHERE id=?
                AND store_id=?
                LIMIT 1
                `,
                [
                    id,
                    storeId
                ]
            );

        const location =
            rows[0];

        if (!location) {

            return Response.json(
                {
                    error:
                        "Ubicación inexistente"
                },
                {
                    status: 404
                }
            );

        }

        await conn.beginTransaction();

        await conn.query(
            `
            UPDATE
                tags_resto_locations
            SET
                is_active=?,
                updated_at=NOW()
            WHERE id=?
            `,
            [
                is_active ? 1 : 0,
                id
            ]
        );

        if (location.qr_code_id) {

            await conn.query(
                `
                UPDATE
                    tags_qr_codes
                SET
                    is_active=?,
                    status=?
                WHERE id=?
                `,
                [
                    is_active ? 1 : 0,
                    is_active
                        ? "assigned"
                        : "disabled",
                    location.qr_code_id
                ]
            );

        }

        await conn.commit();

        return Response.json({
            ok: true
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "RESTO LOCATION TOGGLE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error actualizando ubicación"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}