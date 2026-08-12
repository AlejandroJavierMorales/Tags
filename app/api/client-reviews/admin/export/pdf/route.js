// =====================================
// API: /api/client-reviews/admin/export/pdf
// Descripción: Genera informe imprimible/PDF de reseñas filtradas.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function stars(value) {
    const n = Math.max(
        0,
        Math.min(5, Math.round(Number(value || 0)))
    );

    return "★".repeat(n) + "☆".repeat(5 - n);
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const businessId = searchParams.get("businessId");
        const formId = searchParams.get("formId");

        const q = searchParams.get("q") || "";
        const rating = searchParams.get("rating") || "";
        const status = searchParams.get("status") || "";
        const from = searchParams.get("from") || "";
        const to = searchParams.get("to") || "";

        if (!businessId || !formId) {
            return Response.json(
                { error: "businessId y formId requeridos" },
                { status: 400 }
            );
        }

        const [formRows] = await db.query(
            `
            SELECT
                f.*,
                COALESCE(NULLIF(b.display_name, ''), b.name) AS business_name,
                COALESCE(NULLIF(b.logo_url, ''), f.logo_url) AS logo_url
            FROM tags_client_review_forms f
            LEFT JOIN tags_businesses b
                ON b.id = f.business_id
            WHERE f.id = ?
            AND f.business_id = ?
            LIMIT 1
            `,
            [formId, businessId]
        );

        const form = formRows[0];

        if (!form) {
            return Response.json(
                { error: "Formulario no encontrado" },
                { status: 404 }
            );
        }

        const where = [
            "r.business_id = ?",
            "r.form_id = ?"
        ];

        const params = [
            businessId,
            formId
        ];

        if (q) {
            where.push(`
                (
                    r.customer_name LIKE ?
                    OR r.customer_email LIKE ?
                    OR r.customer_phone LIKE ?
                    OR r.general_comment LIKE ?
                )
            `);

            params.push(
                `%${q}%`,
                `%${q}%`,
                `%${q}%`,
                `%${q}%`
            );
        }

        if (rating) {
            where.push("ROUND(r.average_rating) = ?");
            params.push(Number(rating));
        }

        if (status) {
            where.push("r.status = ?");
            params.push(status);
        }

        if (from) {
            where.push("DATE(r.created_at) >= ?");
            params.push(from);
        }

        if (to) {
            where.push("DATE(r.created_at) <= ?");
            params.push(to);
        }

        const [rows] = await db.query(
            `
            SELECT
                r.id,
                r.customer_name,
                r.customer_email,
                r.customer_phone,
                r.general_comment,
                r.average_rating,
                r.min_rating,
                r.max_rating,
                r.google_prompt_shown,
                r.google_clicked,
                r.status,
                r.created_at,
                qrc.code AS qr_code,
                qrc.label AS qr_label,
                COUNT(DISTINCT m.id) AS media_count
            FROM tags_client_review_responses r

            LEFT JOIN tags_qr_codes qrc
                ON qrc.id = r.qr_code_id

            LEFT JOIN tags_client_review_media m
                ON m.response_id = r.id
                AND m.uploaded_by = 'reviewer'
                AND m.is_active = 1

            WHERE ${where.join(" AND ")}

            GROUP BY
                r.id,
                r.customer_name,
                r.customer_email,
                r.customer_phone,
                r.general_comment,
                r.average_rating,
                r.min_rating,
                r.max_rating,
                r.google_prompt_shown,
                r.google_clicked,
                r.status,
                r.created_at,
                qrc.code,
                qrc.label

            ORDER BY r.created_at DESC
            `,
            params
        );

        const html = `
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <title>Informe de reseñas</title>

    <style>
        @page {
            size: A4 portrait;
            margin: 12mm;
        }

        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111827;
        }

        .page {
            width: 100%;
            max-width: 980px;
            margin: 0 auto;
            padding: 26px 0 28px;
        }

        .top_actions {
            margin-bottom: 26px;
        }

        .print_btn {
            background: #16a34a;
            color: #ffffff;
            border: none;
            padding: 12px 18px;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
        }

        .header {
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            padding: 20px 24px;
            display: grid;
            grid-template-columns: 160px 1fr 140px;
            align-items: center;
            gap: 18px;
            margin-bottom: 18px;
        }

        .client_logo {
            max-width: 145px;
            max-height: 70px;
            object-fit: contain;
        }

        .title_box h1 {
            margin: 0;
            font-size: 24px;
            line-height: 1.1;
        }

        .title_box p {
            margin: 6px 0 0;
            font-size: 12px;
            color: #374151;
        }

        .google_box {
            text-align: center;
        }

        .google_box img {
            width: 120px;
            height: auto;
            object-fit: contain;
        }

        .stars {
            margin-top: 4px;
            color: #fbbc04;
            font-size: 19px;
            letter-spacing: 2px;
        }

        .filters {
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 12px;
            color: #374151;
        }

        .filters strong {
            color: #111827;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 0;
        }

        thead {
            display: table-header-group;
        }

        tr {
            page-break-inside: avoid;
        }

        th {
            text-align: left;
            background: #f3f4f6;
            color: #111827;
            padding: 10px 8px;
            border-bottom: 1px solid #d1d5db;
            font-size: 11px;
        }

        td {
            padding: 10px 8px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            color: #111827;
        }

        .rating {
            color: #fbbc04;
            font-size: 14px;
            letter-spacing: 1px;
            white-space: nowrap;
        }

        .rating_number {
            display: block;
            color: #111827;
            font-size: 11px;
            margin-top: 2px;
        }

        .muted {
            color: #6b7280;
        }

        .footer_spacer {
            height: 42px;
        }

        .pdf_footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
            padding-bottom: 20px;

            display: flex;
            justify-content: center;
            align-items: center;
            gap: 26px;
            flex-wrap: wrap;

            font-size: 11px;
            line-height: 1.4;
            color: #6b7280;
        }

        .pdf_footer span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }

        .pdf_footer_icon {
            display: inline-block;
            color: #111827;
            font-size: 11px;
            line-height: 1;
            transform: translateY(1px);
        }

        @media print {
            .top_actions {
                display: none !important;
            }

            .page {
                max-width: none;
                padding: 0 0 18px;
            }

            .footer_spacer {
                height: 34px;
            }

            body {
                background: #ffffff;
            }
        }
    </style>
</head>

<body>
    <div class="page">

        <div class="top_actions">
            <button
                class="print_btn"
                onclick="window.print()"
            >
                Imprimir / Guardar PDF
            </button>
        </div>

        <div class="header">

            <div>
                ${
                    form.logo_url
                        ? `<img class="client_logo" src="${esc(form.logo_url)}" alt="Logo" />`
                        : ""
                }
            </div>

            <div class="title_box">
                <h1>Informe de reseñas</h1>
                <p>
                    ${esc(form.business_name || "Cliente")}
                    ${form.title ? ` · ${esc(form.title)}` : ""}
                </p>
            </div>

            <div class="google_box">
                <img src="/assets/images/logos/logo_google_largo.webp" alt="Google" />
                <div class="stars">★★★★★</div>
            </div>

        </div>

        <div class="filters">
            <strong>Filtros aplicados:</strong>
            búsqueda: ${esc(q || "Todos")} ·
            rating: ${esc(rating || "Todos")} ·
            estado: ${esc(status || "Todos")} ·
            desde: ${esc(from || "-")} ·
            hasta: ${esc(to || "-")}
            <br />
            <strong>Total:</strong> ${rows.length} reseñas
        </div>

        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Rating</th>
                    <th>Comentario</th>
                    <th>Google</th>
                    <th>Fotos</th>
                    <th>Estado</th>
                </tr>
            </thead>

            <tbody>
                ${
                    rows.map(row => `
                        <tr>
                            <td>
                                ${new Date(row.created_at).toLocaleDateString("es-AR")}
                            </td>

                            <td>
                                <strong>${esc(row.customer_name || "-")}</strong>
                                <br />
                                <span class="muted">${esc(row.customer_email || "")}</span>
                            </td>

                            <td>
                                <span class="rating">
                                    ${stars(row.average_rating)}
                                </span>
                                <span class="rating_number">
                                    ${Number(row.average_rating || 0).toFixed(1)}
                                </span>
                            </td>

                            <td>
                                ${esc(row.general_comment || "-")}
                            </td>

                            <td>
                                ${
                                    row.google_clicked
                                        ? "Click"
                                        : row.google_prompt_shown
                                            ? "Mostrado"
                                            : "-"
                                }
                            </td>

                            <td>
                                ${Number(row.media_count || 0)}
                            </td>

                            <td>
                                ${esc(row.status || "-")}
                            </td>
                        </tr>
                    `).join("")
                }
            </tbody>
        </table>

        <div class="footer_spacer"></div>

        <div class="pdf_footer">
            <span>
                <b class="pdf_footer_icon">●</b>
                www.Tags.com.ar
            </span>

            <span>
                <b class="pdf_footer_icon">●</b>
                3546520243
            </span>

            <span>
                <b class="pdf_footer_icon">●</b>
                info@tags.com.ar
            </span>
        </div>

    </div>
</body>
</html>
`;

        return new Response(html, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8"
            }
        });

    } catch (err) {
        console.error(
            "CLIENT REVIEWS EXPORT PDF ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error generando informe PDF"
            },
            {
                status: 500
            }
        );
    }
}
