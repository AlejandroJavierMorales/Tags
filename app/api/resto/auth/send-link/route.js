export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";
import { sendMagicLink } from "@/app/lib/mailgun";

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}));
        const email = String(body?.email || "").trim().toLowerCase();

        if (!email || !email.includes("@")) {
            return Response.json({ error: "Ingresá un email válido" }, { status: 400 });
        }

        const [rows] = await db.query(`
            SELECT st.id, st.store_id, st.email
            FROM tags_resto_staff st
            INNER JOIN tags_stores s ON s.id = st.store_id AND s.app_type = 'resto'
            WHERE LOWER(st.email) = ? AND st.status = 'active'
            ORDER BY st.id DESC
            LIMIT 1
        `, [email]);

        // Respuesta uniforme para no revelar si un email es personal activo.
        if (!rows.length) return Response.json({ ok: true });

        const staff = rows[0];
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        await db.query(`
            INSERT INTO tags_resto_staff_auth_tokens
                (staff_id, store_id, token_hash, expires_at, requested_ip)
            VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), ?)
        `, [staff.id, staff.store_id, tokenHash, req.headers.get("x-forwarded-for") || null]);

        await db.query(`
            UPDATE tags_resto_staff_auth_tokens
            SET used_at = NOW()
            WHERE staff_id = ? AND token_hash <> ? AND used_at IS NULL
        `, [staff.id, tokenHash]);

        const baseUrl = process.env.NODE_ENV === "development"
            ? new URL(req.url).origin
            : process.env.NEXT_PUBLIC_APP_URL;

        await sendMagicLink(
            staff.email,
            `${baseUrl}/api/resto/auth/verify?token=${encodeURIComponent(token)}`
        );

        return Response.json({ ok: true });
    } catch (error) {
        console.error("RESTO PUBLIC SEND LINK ERROR:", error);
        return Response.json({ error: "No se pudo enviar el enlace" }, { status: 500 });
    }
}
