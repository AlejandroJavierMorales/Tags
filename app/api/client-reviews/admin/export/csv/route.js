// =====================================
// API: /api/client-reviews/admin/export/csv
// Descripción: Exporta respuestas de ClientsReviews en CSV.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function csvEscape(value) {
    if (value === null || value === undefined) {
        return "";
    }

    const text =
        String(value).replace(/"/g, '""');

    return `"${text}"`;
}

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        const formId =
            searchParams.get("formId") || "";

        const from =
            searchParams.get("from") || "";

        const to =
            searchParams.get("to") || "";

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        const where = [
            "r.business_id = ?"
        ];

        const params = [
            businessId
        ];

        if (formId) {
            where.push("r.form_id = ?");
            params.push(formId);
        }

        if (from) {
            where.push("DATE(r.created_at) >= ?");
            params.push(from);
        }

        if (to) {
            where.push("DATE(r.created_at) <= ?");
            params.push(to);
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    r.id,
                    r.created_at,
                    r.customer_name,
                    r.customer_email,
                    r.customer_phone,
                    r.average_rating,
                    r.min_rating,
                    r.max_rating,
                    r.general_comment,
                    r.google_prompt_shown,
                    r.google_clicked,
                    r.status,
                    q.code AS qr_code,
                    q.label AS qr_label
                FROM tags_client_review_responses r

                LEFT JOIN tags_qr_codes q
                    ON q.id = r.qr_code_id

                WHERE ${where.join(" AND ")}

                ORDER BY r.created_at DESC
                `,
                params
            );

        const headers = [
            "ID",
            "Fecha",
            "QR",
            "Etiqueta QR",
            "Nombre",
            "Email",
            "Teléfono",
            "Promedio",
            "Mínima",
            "Máxima",
            "Comentario general",
            "Mostró Google",
            "Click Google",
            "Estado"
        ];

        const lines = [
            headers.map(csvEscape).join(",")
        ];

        for (const row of rows) {
            lines.push([
                row.id,
                row.created_at,
                row.qr_code,
                row.qr_label,
                row.customer_name,
                row.customer_email,
                row.customer_phone,
                row.average_rating,
                row.min_rating,
                row.max_rating,
                row.general_comment,
                row.google_prompt_shown,
                row.google_clicked,
                row.status
            ].map(csvEscape).join(","));
        }

        const csv =
            lines.join("\n");

        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="client-reviews-${businessId}.csv"`
            }
        });

    } catch (err) {
        console.error(
            "CLIENT REVIEWS CSV EXPORT ERROR:",
            err
        );

        return Response.json(
            { error: "Error exportando CSV" },
            { status: 500 }
        );
    }
}