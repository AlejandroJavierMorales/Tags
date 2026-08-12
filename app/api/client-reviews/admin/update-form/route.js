// =====================================
// API: /api/client-reviews/admin/update-form
// Descripción: Actualiza configuración general, textos, logo y theme de ClientsReviews.
// El logo institucional se sincroniza con el perfil maestro del negocio.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function safeJson(value) {
    if (!value) return JSON.stringify({});
    if (typeof value === "string") {
        try { JSON.parse(value); return value; } catch { return JSON.stringify({}); }
    }
    return JSON.stringify(value);
}

export async function POST(req) {
    let connection;
    let transactionStarted = false;
    try {
        const body = await req.json().catch(() => null);
        if (!body) return Response.json({ error: "Solicitud inválida" }, { status: 400 });

        const {
            formId, businessId, title, subtitle, logo_url, theme_id,
            google_review_url, positive_threshold, success_title, success_message,
            google_cta_title, google_cta_text, google_cta_button_label,
            private_feedback_title, private_feedback_text, styles_json, settings_json
        } = body;

        if (!formId || !businessId) {
            return Response.json({ error: "formId y businessId son requeridos" }, { status: 400 });
        }

        connection = await db.getConnection();
        const [rows] = await connection.query(
            "SELECT id FROM tags_client_review_forms WHERE id=? AND business_id=? LIMIT 1",
            [formId, businessId]
        );
        if (!rows.length) return Response.json({ error: "Formulario no encontrado" }, { status: 404 });

        const finalThemeId = theme_id || null;
        if (finalThemeId) {
            const [themeRows] = await connection.query(
                "SELECT id FROM tags_qr_page_themes WHERE id=? AND is_active=1 LIMIT 1",
                [finalThemeId]
            );
            if (!themeRows.length) return Response.json({ error: "Theme inválido o inactivo" }, { status: 400 });
        }

        const sharedLogo = String(logo_url || "").trim() || null;
        await connection.beginTransaction();
        transactionStarted = true;

        await connection.query(
            `UPDATE tags_client_review_forms SET
                title=?,subtitle=?,logo_url=?,theme_id=?,google_review_url=?,positive_threshold=?,
                success_title=?,success_message=?,google_cta_title=?,google_cta_text=?,google_cta_button_label=?,
                private_feedback_title=?,private_feedback_text=?,styles_json=?,settings_json=?,updated_at=NOW()
             WHERE id=? AND business_id=?`,
            [
                title || null, subtitle || null, sharedLogo, finalThemeId,
                google_review_url || null, Number(positive_threshold || 4),
                success_title || null, success_message || null,
                google_cta_title || null, google_cta_text || null, google_cta_button_label || null,
                private_feedback_title || null, private_feedback_text || null,
                safeJson(styles_json), safeJson(settings_json), formId, businessId
            ]
        );

        await connection.query(
            "UPDATE tags_businesses SET logo_url=?,updated_at=NOW() WHERE id=?",
            [sharedLogo, businessId]
        );
        await connection.query(
            "UPDATE tags_stores SET logo_url=?,updated_at=NOW() WHERE business_id=?",
            [sharedLogo, businessId]
        );
        await connection.query(
            `UPDATE tags_qr_pages p
             INNER JOIN tags_client_review_forms f ON f.page_id=p.id
             SET p.logo_url=?,p.theme_id=?,p.global_styles=${finalThemeId
                ? "JSON_SET(COALESCE(p.global_styles, JSON_OBJECT()), '$.theme_override', true)"
                : "JSON_REMOVE(COALESCE(p.global_styles, JSON_OBJECT()), '$.theme_override')"},p.updated_at=NOW()
             WHERE f.id=? AND f.business_id=?`,
            [sharedLogo, finalThemeId, formId, businessId]
        );
        await connection.query(
            `UPDATE tags_qr_pages
             SET logo_url=?,updated_at=NOW()
             WHERE business_id=? AND page_type IN ('directory','store','resto')`,
            [sharedLogo, businessId]
        );

        await connection.commit();
        transactionStarted = false;
        return Response.json({ ok: true });
    } catch (err) {
        if (connection && transactionStarted) await connection.rollback().catch(() => {});
        console.error("CLIENT REVIEWS UPDATE FORM ERROR:", err);
        return Response.json({ error: "Error actualizando configuración" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
