import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { verifyTagsSession } from "@/app/lib/signTagsSession";

async function getSession() {
    const store = await cookies();
    const value = store.get("tags_session")?.value;
    const signature = store.get("tags_session_sig")?.value || "";
    if (!value || !verifyTagsSession(value, signature)) return null;
    try { return JSON.parse(value); } catch { return null; }
}

export async function getTurnosAccess({ businessId, turnosId = 0, permission = null } = {}) {
    const session = await getSession();
    if (!session) return { allowed: false, status: 401, permissions: [], session: null };
    const owner = session.role === "admin" || (
        session.type !== "turnos_staff" &&
        String(session.business_id || session.businessId || "") === String(businessId)
    );
    if (owner) {
        if (turnosId) {
            const [appRows] = await db.query("SELECT id FROM tags_turnos_apps WHERE id = ? AND business_id = ? LIMIT 1", [turnosId, businessId]);
            if (!appRows.length) return { allowed: false, status: 404, permissions: [], session };
        }
        return { allowed: true, isOwner: true, isStaff: false, permissions: ["*"], session };
    }
    if (session.type !== "turnos_staff") return { allowed: false, status: 403, permissions: [], session };

    const [staffRows] = await db.query(
        `SELECT st.*, a.business_id, r.code AS role_code
         FROM tags_turnos_staff st
         INNER JOIN tags_turnos_apps a ON a.id = st.turnos_id AND a.business_id = ?
         LEFT JOIN tags_turnos_roles r ON r.id = st.role_id
         WHERE st.id = ? AND st.status = 'active' AND (? = 0 OR st.turnos_id = ?) LIMIT 1`,
        [businessId, session.staffId || 0, turnosId, turnosId]
    );
    const staff = staffRows[0];
    if (!staff) return { allowed: false, status: 403, permissions: [], session };
    const [rows] = await db.query(
        `SELECT p.code,
                CASE WHEN spo.effect = 'deny' THEN 0 WHEN spo.effect = 'allow' THEN 1
                     WHEN rp.permission_id IS NOT NULL THEN 1 ELSE 0 END AS is_allowed
         FROM tags_turnos_permissions p
         LEFT JOIN tags_turnos_role_permissions rp ON rp.permission_id = p.id AND rp.role_id = ?
         LEFT JOIN tags_turnos_staff_permission_overrides spo ON spo.permission_id = p.id AND spo.staff_id = ?`,
        [staff.role_id || 0, staff.id]
    );
    const permissions = rows.filter(row => Number(row.is_allowed) === 1).map(row => row.code);
    const requested = Array.isArray(permission) ? permission : permission ? [permission] : [];
    const allowed = requested.length === 0 || requested.some(code => permissions.includes(code));
    return { allowed, status: allowed ? 200 : 403, isOwner: false, isStaff: true, staff, permissions, session: { ...session, name: staff.name, email: staff.email } };
}

export function turnosAccessResponse(access) {
    return Response.json({ error: access.status === 401 ? "No autenticado" : "Sin permisos" }, { status: access.status || 403 });
}
