import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const q =
            searchParams.get("q") || "";

        const status =
            searchParams.get("status") || "";

        const type =
            searchParams.get("type") || "";

        const addon =
            searchParams.get("addon") || "";

        const page =
            Number(searchParams.get("page") || 1);

        const limit =
            Number(searchParams.get("limit") || 20);

        const offset =
            (page - 1) * limit;

        const where = [];
        const params = [];

        if (q) {
            where.push(`
                (
                    q.code LIKE ?
                    OR q.label LIKE ?
                    OR b.name LIKE ?
                    OR b.email LIKE ?
                )
            `);

            params.push(
                `%${q}%`,
                `%${q}%`,
                `%${q}%`,
                `%${q}%`
            );
        }

        if (status) {
            where.push(`q.status = ?`);
            params.push(status);
        }

        if (type) {
            where.push(`qt.code = ?`);
            params.push(type);
        }

        if (addon) {
            where.push(`
                EXISTS (
                    SELECT 1
                    FROM tags_qr_addon_usage qauf
                    WHERE qauf.qr_code_id = q.id
                    AND qauf.addon_code = ?
                    AND qauf.status = 'active'
                )
            `);

            params.push(addon);
        }

        const whereSQL =
            where.length
                ? `WHERE ${where.join(" AND ")}`
                : "";

        const [[{ total }]] =
            await db.execute(
                `
                SELECT COUNT(DISTINCT q.id) AS total

                FROM tags_qr_codes q

                LEFT JOIN tags_businesses b
                    ON q.business_id = b.id

                LEFT JOIN tags_products p
                    ON q.product_id = p.id

                LEFT JOIN tags_qr_types qt
                    ON p.qr_type_id = qt.id

                ${whereSQL}
                `,
                params
            );

        const [rows] =
            await db.execute(
                `
                SELECT
                    q.id,
                    q.code,
                    q.label,
                    q.status,
                    q.value,
                    q.final_url,
                    q.email,
                    q.business_id,
                    q.has_qr_page,

                    b.name AS business_name,
                    b.email AS business_email,

                    p.id AS product_id,
                    p.name AS product_name,

                    qt.id AS qr_type_id,
                    qt.code AS qr_type_code,
                    qt.name AS qr_type_name,

                    GROUP_CONCAT(
                        DISTINCT qau.addon_code
                        ORDER BY qau.addon_code
                        SEPARATOR ','
                    ) AS addon_features

                FROM tags_qr_codes q

                LEFT JOIN tags_businesses b
                    ON q.business_id = b.id

                LEFT JOIN tags_products p
                    ON q.product_id = p.id

                LEFT JOIN tags_qr_types qt
                    ON p.qr_type_id = qt.id

                LEFT JOIN tags_qr_addon_usage qau
                    ON qau.qr_code_id = q.id
                    AND qau.status = 'active'

                ${whereSQL}

                GROUP BY
                    q.id,
                    q.code,
                    q.label,
                    q.status,
                    q.value,
                    q.final_url,
                    q.email,
                    q.business_id,
                    q.has_qr_page,
                    b.name,
                    b.email,
                    p.id,
                    p.name,
                    qt.id,
                    qt.code,
                    qt.name

                ORDER BY q.id DESC

                LIMIT ${limit}
                OFFSET ${offset}
                `,
                params
            );

        return Response.json({
            data: rows,
            total,
            page,
            pages: Math.ceil(total / limit)
        });

    } catch (e) {
        console.error(
            "SEARCH QR API ERROR:",
            e
        );

        return Response.json(
            {
                error:
                    e.message ||
                    "Internal server error"
            },
            {
                status: 500
            }
        );
    }
}