export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

export async function POST(req) {
    let connection;

    try {
        const body = await req.json();
        const businessId =
            String(body?.businessId || "").trim();
        const status =
            body?.status === "published"
                ? "published"
                : body?.status === "draft"
                    ? "draft"
                    : null;

        if (!businessId || !status) {
            return Response.json(
                {
                    error:
                        "businessId y status son requeridos"
                },
                { status: 400 }
            );
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [rows] =
            await connection.query(
                `
                SELECT id, page_id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'resto'
                LIMIT 1
                FOR UPDATE
                `,
                [businessId]
            );

        const store = rows[0];

        if (!store) {
            await connection.rollback();
            return Response.json(
                {
                    error:
                        "Tags Resto no encontrado"
                },
                { status: 404 }
            );
        }

        await connection.query(
            `
            UPDATE tags_stores
            SET status = ?
            WHERE id = ?
            AND business_id = ?
            AND app_type = 'resto'
            `,
            [status, store.id, businessId]
        );

        if (store.page_id) {
            await connection.query(
                `
                UPDATE tags_qr_pages
                SET
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND business_id = ?
                `,
                [status, store.page_id, businessId]
            );
        }

        await connection.commit();

        return Response.json({
            ok: true,
            status
        });
    } catch (error) {
        if (connection) {
            await connection
                .rollback()
                .catch(() => {});
        }

        console.error(
            "RESTO SETTINGS STATUS ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    "No se pudo actualizar la publicación del restaurante"
            },
            { status: 500 }
        );
    } finally {
        connection?.release();
    }
}
