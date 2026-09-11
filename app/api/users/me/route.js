// =====================================
// API: /api/users/me
// Descripcion: Perfil de la persona autenticada.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSessionUser } from "@/app/modules/users/lib/userSession";

export async function GET() {
    const session = await getSessionUser();
    if (!session) return Response.json({ success: false, error: "No autenticado" }, { status: 401 });

    const [rows] = await db.query(
        `SELECT id,email,first_name,last_name,display_name,phone,whatsapp,
                document_type,document_number,birth_date,gender,nationality,
                address,locality,province,country,profile_image_url,
                profile_image_width,profile_image_height,email_verified_at
           FROM tags_users WHERE id=? LIMIT 1`,
        [session.userId]
    );

    if (!rows[0]) return Response.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
    return Response.json({ success: true, user: rows[0] });
}

export async function PATCH(request) {
    const session = await getSessionUser();
    if (!session) return Response.json({ success: false, error: "No autenticado" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const allowed = [
        "first_name", "last_name", "display_name", "phone", "whatsapp",
        "document_type", "document_number", "birth_date", "gender",
        "nationality", "address", "locality", "province", "country"
    ];
    const sets = [];
    const values = [];
    for (const field of allowed) {
        if (Object.prototype.hasOwnProperty.call(body || {}, field)) {
            sets.push(`${field}=?`);
            values.push(String(body[field] ?? "").trim() || null);
        }
    }
    if (!sets.length) return Response.json({ success: false, error: "No hay datos para actualizar" }, { status: 400 });

    values.push(session.userId);
    await db.query(`UPDATE tags_users SET ${sets.join(",")},updated_at=NOW() WHERE id=?`, values);
    return Response.json({ success: true });
}
