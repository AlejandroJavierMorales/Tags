import { sendMagicLink } from "@/app/lib/mailgun";
import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import crypto from "crypto";

export async function POST(req) {
    const { email } = await req.json();

    if (!email) {
        return Response.json({ error: "Email requerido" }, { status: 400 });
    }

    // buscar cliente
    const [rows] = await db.execute(
        "SELECT id FROM tags_businesses WHERE email = ?",
        [email]
    );

    if (!rows.length) {
        return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const token = crypto.randomUUID();

    await db.execute(`
    INSERT INTO tags_auth_tokens (email, token, expires_at)
    VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
  `, [email, token]);

    const isDev = process.env.NODE_ENV === "development";

    const baseUrl = isDev
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_APP_URL;
        
    const link = `${baseUrl}/api/auth/verify?token=${token}`;


    await sendMagicLink(email, link);

    // 👉 acá después metemos Mailgun

    return Response.json({ ok: true });
}