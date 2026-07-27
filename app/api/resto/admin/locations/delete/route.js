// =====================================
// API: /api/resto/admin/locations/delete
// Descripción:
// Elimina una ubicación de Tags Resto.
// No permite eliminar si existen sesiones abiertas.
// Elimina también el QR asociado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

export async function DELETE(req) {

    const conn =
        await db.getConnection();

    try {

        const { searchParams } =
            new URL(req.url);

        const id =
            searchParams.get("id");

        const businessId =
            searchParams.get("businessId");

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

        const access =
            await getRestoAccess({
                businessId,
                permission:
                    "locations.manage"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const [storeRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'resto'
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

        const [locationRows] =
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
            locationRows[0];

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

        const [children] =
            await conn.query(
                `
                SELECT id
                FROM tags_resto_locations
                WHERE parent_id=?
                LIMIT 1
                `,
                [
                    id
                ]
            );

        if (children.length) {

            return Response.json(
                {
                    error:
                        "La ubicación posee ubicaciones hijas"
                },
                {
                    status: 400
                }
            );

        }

        const [sessions] =
            await conn.query(
                `
                SELECT id
                FROM tags_resto_sessions
                WHERE location_id=?
                AND status IN
                (
                    'open',
                    'bill_requested'
                )
                LIMIT 1
                `,
                [
                    id
                ]
            );

        if (sessions.length) {

            return Response.json(
                {
                    error:
                        "La ubicación posee una sesión activa"
                },
                {
                    status: 400
                }
            );

        }

        await conn.beginTransaction();

        if (location.qr_code_id) {

            await conn.query(
                `
                DELETE
                FROM tags_qr_codes
                WHERE id=?
                LIMIT 1
                `,
                [
                    location.qr_code_id
                ]
            );

        }

        await conn.query(
            `
            DELETE
            FROM tags_resto_locations
            WHERE id=?
            LIMIT 1
            `,
            [
                id
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "RESTO LOCATION DELETE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error eliminando ubicación"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}
