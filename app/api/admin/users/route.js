// =====================================
// API: /api/admin/users
// Descripcion: Administracion global de cuentas personales.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSessionBusiness } from "@/app/lib/getSessionBusiness";

async function requireAdmin() {
    const session = await getSessionBusiness();
    if (session?.role !== "admin") throw new Error("No autorizado");
}

export async function GET(request) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(request.url);
        const id = Number(searchParams.get("id") || 0);
        if (id) {
            const [[user]] = await db.query(`SELECT * FROM tags_users WHERE id=? LIMIT 1`, [id]);
            if (!user) return Response.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
            const [memberships] = await db.query(
                `SELECT m.*,s.name AS directory_name,s.code AS directory_code
                   FROM tags_user_directory_memberships m
                   LEFT JOIN tags_directory_sites s ON s.id=m.directory_site_id
                  WHERE m.user_id=? ORDER BY m.created_at DESC`, [id]
            );
            const [roles] = await db.query(
                `SELECT r.*,b.name AS business_name,b.display_name AS business_display_name
                   FROM tags_user_business_roles r
                   LEFT JOIN tags_businesses b ON b.id=r.business_id
                  WHERE r.user_id=? ORDER BY r.created_at DESC`, [id]
            );
            const [consents] = await db.query(`SELECT * FROM tags_user_consents WHERE user_id=? ORDER BY granted_at DESC,id DESC`, [id]);
            const [movements] = await db.query(
                `SELECT t.id,t.transaction_type,t.points_delta,t.stamps_delta,t.visits_delta,
                        t.points_balance_after,t.stamps_balance_after,t.visits_balance_after,
                        t.amount,t.source,t.description,t.created_at,
                        p.name AS program_name,b.display_name AS business_name
                   FROM tags_loyalty_transactions t
                   INNER JOIN tags_loyalty_programs p ON p.id=t.program_id
                   LEFT JOIN tags_businesses b ON b.id=p.business_id
                  WHERE t.member_id IN (SELECT id FROM tags_loyalty_members WHERE user_id=?)
                  ORDER BY t.created_at DESC,t.id DESC LIMIT 200`, [id]
            );
            return Response.json({ success: true, user, memberships, roles, consents, movements });
        }

        const search = String(searchParams.get("search") || "").trim();
        const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
        const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
        const params = [];
        let where = "";
        if (search) {
            where = "WHERE u.email_normalized LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.document_number LIKE ?";
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }
        const [users] = await db.query(
            `SELECT u.id,u.email,u.email_verified_at,u.first_name,u.last_name,u.display_name,
                    u.phone,u.whatsapp,u.profile_image_url,u.status,u.source,u.last_login_at,
                    u.created_at,u.updated_at,
                    (SELECT COUNT(*) FROM tags_user_directory_memberships m WHERE m.user_id=u.id AND m.status='active') AS directory_count,
                    (SELECT COUNT(*) FROM tags_loyalty_members lm WHERE lm.user_id=u.id) AS loyalty_member_count,
                    (SELECT COUNT(*) FROM tags_loyalty_transactions t WHERE t.member_id IN (SELECT id FROM tags_loyalty_members WHERE user_id=u.id)) AS movement_count
               FROM tags_users u ${where}
              ORDER BY u.created_at DESC,u.id DESC
              LIMIT ${limit} OFFSET ${offset}`,
            params
        );
        return Response.json({ success: true, users });
    } catch (error) {
        console.error("ADMIN USERS GET ERROR", error);
        return Response.json({ success: false, error: error.message || "No se pudo cargar usuarios" }, { status: error.message === "No autorizado" ? 403 : 500 });
    }
}

export async function PATCH(request) {
    try {
        await requireAdmin();
        const body = await request.json().catch(() => null);
        const id = Number(body?.id || 0);
        if (!id) throw new Error("Falta el usuario");
        const fields = ["first_name", "last_name", "display_name", "phone", "whatsapp", "document_type", "document_number", "birth_date", "gender", "nationality", "address", "locality", "province", "country", "status"];
        const updates = [];
        const values = [];
        for (const field of fields) {
            if (Object.prototype.hasOwnProperty.call(body, field)) {
                updates.push(`${field}=?`);
                values.push(body[field] === "" ? null : body[field]);
            }
        }
        if (!updates.length) throw new Error("No hay cambios para guardar");
        values.push(id);
        const [result] = await db.query(`UPDATE tags_users SET ${updates.join(",")},updated_at=NOW() WHERE id=?`, values);
        if (!result.affectedRows) throw new Error("Usuario no encontrado");
        return Response.json({ success: true });
    } catch (error) {
        console.error("ADMIN USERS PATCH ERROR", error);
        return Response.json({ success: false, error: error.message || "No se pudo actualizar el usuario" }, { status: error.message === "No autorizado" ? 403 : 400 });
    }
}

export async function DELETE(request) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(request.url);
        const id = Number(searchParams.get("id") || 0);
        if (!id) throw new Error("Falta el usuario");
        const [result] = await db.query(`UPDATE tags_users SET status='inactive',updated_at=NOW() WHERE id=?`, [id]);
        if (!result.affectedRows) throw new Error("Usuario no encontrado");
        return Response.json({ success: true, deactivated: true });
    } catch (error) {
        console.error("ADMIN USERS DELETE ERROR", error);
        return Response.json({ success: false, error: error.message || "No se pudo desactivar el usuario" }, { status: error.message === "No autorizado" ? 403 : 400 });
    }
}
