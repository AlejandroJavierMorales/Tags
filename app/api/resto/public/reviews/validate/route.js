export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";

const clean = value => String(value || "").trim();
const normalize = value => clean(value).toLowerCase().replace(/[\s\-()]/g, "");

export async function POST(req) {
    try {
        const { storeId, orderNumber, contact } = await req.json();
        if (!storeId || !orderNumber || !contact) return Response.json({ error: "Pedido y contacto requeridos" }, { status: 400 });
        const [sessions] = await db.query(`
            SELECT s.*, st.business_id, st.slug AS resto_slug
            FROM tags_resto_sessions s
            INNER JOIN tags_stores st ON st.id=s.store_id AND st.app_type='resto'
            WHERE s.store_id=? AND s.order_number=? AND s.status <> 'cancelled'
            LIMIT 1`, [storeId, clean(orderNumber)]);
        const session = sessions?.[0];
        if (!session) return Response.json({ error: "No encontramos ese pedido del restaurante." }, { status: 404 });
        const [servedRows] = await db.query(`SELECT 1 FROM tags_resto_session_items WHERE session_id=? AND preparation_status='served' LIMIT 1`, [session.id]);
        const eligible = session.status === "closed" || session.payment_status === "paid" || Number(session.paid_total || 0) >= Number(session.total || 0) || servedRows.length > 0;
        if (!eligible) return Response.json({ error: "Podrás calificar cuando el pedido haya sido entregado." }, { status: 409 });
        const supplied = normalize(contact);
        const matches = [session.customer_email, session.customer_phone].map(normalize).filter(Boolean).some(value => value === supplied || value.endsWith(supplied) || supplied.endsWith(value));
        if (!matches) return Response.json({ error: "El email o teléfono no coincide con el pedido." }, { status: 403 });
        const [addon] = await db.query(`SELECT 1 FROM tags_business_addons WHERE business_id=? AND addon_code='client_reviews' AND status='active' LIMIT 1`, [session.business_id]);
        if (!addon?.length) return Response.json({ error: "Tags Reviews no está habilitado." }, { status: 403 });
        const [pages] = await db.query(`SELECT slug FROM tags_qr_pages WHERE business_id=? AND page_type='client_reviews' AND status='published' ORDER BY id DESC LIMIT 1`, [session.business_id]);
        if (!pages?.[0]?.slug) return Response.json({ error: "La página de opiniones no está publicada." }, { status: 404 });
        const [existing] = await db.query(`SELECT token FROM tags_store_review_tokens WHERE store_id=? AND order_id=? AND used_at IS NULL AND expires_at>NOW() ORDER BY id DESC LIMIT 1`, [storeId, session.id]);
        const token = existing?.[0]?.token || crypto.randomBytes(32).toString("hex");
        if (!existing?.length) await db.query(`INSERT INTO tags_store_review_tokens (store_id, order_id, token, customer_name, customer_email, customer_phone, expires_at, created_at) VALUES (?,?,?,?,?,?,DATE_ADD(NOW(), INTERVAL 90 DAY),NOW())`, [storeId, session.id, token, session.customer_name || null, session.customer_email || null, session.customer_phone || null]);
        const returnTo = `/p/${session.resto_slug}/order/${session.session_token}`;
        return Response.json({ ok: true, verified: true, token, reviewUrl: `/p/${pages[0].slug}?token=${token}&returnTo=${encodeURIComponent(returnTo)}`, order: { id: session.id, order_number: session.order_number, customer_name: session.customer_name } });
    } catch (error) {
        console.error("RESTO REVIEW VALIDATE ERROR:", error);
        return Response.json({ error: "Error verificando el pedido" }, { status: 500 });
    }
}
