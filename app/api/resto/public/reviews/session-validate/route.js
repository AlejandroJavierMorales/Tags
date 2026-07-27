export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const { sessionToken } = await req.json();
        if (!sessionToken) return Response.json({ error: "Sesión requerida" }, { status: 400 });
        const [rows] = await db.query(`
            SELECT s.*, st.business_id, st.slug AS resto_slug, p.id AS page_id, p.qr_code_id
            FROM tags_resto_sessions s
            INNER JOIN tags_stores st ON st.id=s.store_id AND st.app_type='resto'
            LEFT JOIN tags_qr_pages p ON p.business_id=st.business_id AND p.page_type='client_reviews' AND p.status='published'
            WHERE s.session_token=? LIMIT 1`, [sessionToken]);
        const session = rows?.[0];
        if (!session) return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
        if (["cancelled", "pending_activation", "pending_confirmation"].includes(session.status)) return Response.json({ error: "Podrás calificar cuando el pedido haya sido atendido." }, { status: 409 });
        const [servedRows] = await db.query(`SELECT 1 FROM tags_resto_session_items WHERE session_id=? AND preparation_status='served' LIMIT 1`, [session.id]);
        const eligible = session.status === "closed" || session.payment_status === "paid" || Number(session.paid_total || 0) >= Number(session.total || 0) || servedRows.length > 0;
        if (!eligible) return Response.json({ error: "Podrás calificar cuando el pedido haya sido entregado." }, { status: 409 });
        const [addonRows] = await db.query(`SELECT 1 FROM tags_business_addons WHERE business_id=? AND addon_code='client_reviews' AND status='active' LIMIT 1`, [session.business_id]);
        if (!addonRows.length) return Response.json({ error: "Tags Reviews no está habilitado." }, { status: 403 });
        if (!session.page_id) return Response.json({ error: "La página de opiniones no está publicada." }, { status: 404 });
        const [reviewedRows] = await db.query(`SELECT id FROM tags_client_review_responses WHERE store_id=? AND order_id=? AND verified_purchase=1 LIMIT 1`, [session.store_id, session.id]);
        if (reviewedRows.length) return Response.json({ error: "Este pedido ya fue calificado." }, { status: 409 });
        const [existing] = await db.query(`SELECT token FROM tags_store_review_tokens WHERE store_id=? AND order_id=? AND used_at IS NULL AND expires_at>NOW() ORDER BY id DESC LIMIT 1`, [session.store_id, session.id]);
        const token = existing?.[0]?.token || crypto.randomBytes(32).toString("hex");
        if (!existing.length) await db.query(`INSERT INTO tags_store_review_tokens (store_id, order_id, token, customer_name, customer_email, customer_phone, expires_at, created_at) VALUES (?,?,?,?,?,?,DATE_ADD(NOW(), INTERVAL 90 DAY),NOW())`, [session.store_id, session.id, token, session.customer_name || null, session.customer_email || null, session.customer_phone || null]);
        const [pageRows] = await db.query(`SELECT slug FROM tags_qr_pages WHERE id=? LIMIT 1`, [session.page_id]);
        const returnTo = `/p/${session.resto_slug}/order/${session.session_token}`;
        return Response.json({ ok: true, reviewUrl: `/p/${pageRows?.[0]?.slug}?token=${token}&returnTo=${encodeURIComponent(returnTo)}` });
    } catch (error) {
        console.error("RESTO SESSION REVIEW ERROR:", error);
        return Response.json({ error: "No se pudo preparar la valoración" }, { status: 500 });
    }
}
