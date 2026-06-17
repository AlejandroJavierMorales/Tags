// =====================================
// API: /api/business/addons/delete
// Descripción: Elimina un addon asignado a un cliente.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { syncBusinessQRPageEnabled }
    from "@/app/modules/addons/lib/syncBusinessQRPageEnabled";

export async function DELETE(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const id =
            searchParams.get("id");

        if (!id) {
            return Response.json(
                { error: "id requerido" },
                { status: 400 }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    id,
                    business_id
                FROM tags_business_addons
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        if (!rows.length) {
            return Response.json(
                { error: "Addon no encontrado" },
                { status: 404 }
            );
        }

        const addon =
            rows[0];

        await db.query(
            `
            DELETE FROM
                tags_business_addons
            WHERE
                id = ?
            `,
            [id]
        );

        await syncBusinessQRPageEnabled(
            addon.business_id
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log("BUSINESS ADDONS DELETE ERROR:", err);

        return Response.json(
            { error: "Error eliminando addon" },
            { status: 500 }
        );
    }
}