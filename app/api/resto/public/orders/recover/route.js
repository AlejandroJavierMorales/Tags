export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

export async function POST(req) {
    try {
        const raw = await req.text();
        if (!raw.trim()) return Response.json({ error: "Completá los datos del pedido." }, { status: 400 });
        let body;
        try { body = JSON.parse(raw); } catch { return Response.json({ error: "La solicitud no es válida." }, { status: 400 }); }
        const slug = String(body?.slug || "").trim();
        const orderNumber = String(body?.orderNumber || "").trim();
        const contact = normalize(body?.contact);
        if (!slug || !orderNumber || !contact) return Response.json({ error: "Ingresá restaurante, número de pedido y email o teléfono." }, { status: 400 });
        const [rows] = await db.query(`SELECT s.session_token, s.order_number FROM tags_resto_sessions s INNER JOIN tags_stores st ON st.id=s.store_id INNER JOIN tags_qr_pages p ON p.id=st.page_id WHERE p.slug=? AND s.order_number=? AND s.status NOT IN ('closed','cancelled') AND (LOWER(TRIM(COALESCE(s.customer_email,'')))=? OR LOWER(TRIM(COALESCE(s.customer_phone,'')))=?) LIMIT 1`, [slug, orderNumber, contact, contact]);
        if (!rows.length) return Response.json({ error: "No encontramos un pedido con esos datos." }, { status: 404 });
        return Response.json({ ok: true, sessionToken: rows[0].session_token, orderNumber: rows[0].order_number });
    } catch (error) {
        console.error("RESTO ORDER RECOVER ERROR:", error);
        return Response.json({ error: "No se pudo recuperar el pedido." }, { status: 500 });
    }
}
