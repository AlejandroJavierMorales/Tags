// =====================================
// API: /api/business/addons/list
// Descripción: Lista addons de clientes, con datos del cliente asociado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("business_id");

        const params = [];

        let whereSQL = "";

        if (businessId) {
            whereSQL = "WHERE a.business_id = ?";
            params.push(businessId);
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    a.*,
                    b.name AS business_name,
                    b.email AS business_email
                FROM
                    tags_business_addons a
                INNER JOIN
                    tags_businesses b
                        ON b.id = a.business_id
                ${whereSQL}
                ORDER BY
                    a.id DESC
                `,
                params
            );

        return Response.json(rows);

    } catch (err) {

        console.log("BUSINESS ADDONS LIST ERROR:", err);

        return Response.json([]);
    }
}