import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { verifyTagsSession } from "@/app/lib/signTagsSession";

export async function getGuestAdminAccess({ businessId, guestAppId = 0, permission = null } = {}) {
    const store = await cookies();
    const value = store.get("tags_session")?.value || "";
    const signature = store.get("tags_session_sig")?.value || "";
    if (!value || !verifyTagsSession(value, signature)) return { allowed: false, status: 401 };
    let session;
    try { session = JSON.parse(value); } catch { return { allowed: false, status: 401 }; }
    const delegatedSession = ["business_staff", "turnos_staff", "resto_staff", "event_staff"].includes(session.type);
    const owner = session.role === "admin" || (
        !delegatedSession
        && String(session.business_id || session.businessId || "") === String(businessId)
    );
    if (!owner && session.type !== "business_staff") return { allowed: false, status: 403, session };
    if (guestAppId) {
        const [rows] = await db.query("SELECT id FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1", [guestAppId, businessId]);
        if (!rows.length) return { allowed: false, status: 404, session };
    }
    if (owner) return { allowed: true, status: 200, isOwner: true, isStaff: false, permissions: ["*"], session };
    const [rows] = await db.query(
        `SELECT st.id,st.name,st.email,st.status,aa.role_code,aa.permissions_json
           FROM tags_business_staff st
           INNER JOIN tags_business_staff_app_access aa
             ON aa.staff_id=st.id AND aa.business_id=st.business_id
          WHERE st.id=? AND st.business_id=? AND st.status='active'
            AND aa.app_code='guest_experience' AND aa.status='active'
            AND (?=0 OR aa.app_instance_id=0 OR aa.app_instance_id=?)
          ORDER BY aa.app_instance_id DESC LIMIT 1`,
        [session.staffId || 0, businessId, guestAppId || 0, guestAppId || 0]
    );
    const staff = rows[0];
    if (!staff) return { allowed: false, status: 403, session };
    let permissions = [];
    try { permissions = Array.isArray(staff.permissions_json) ? staff.permissions_json : JSON.parse(staff.permissions_json || "[]"); } catch {}
    const allowed = Boolean(permission) && permissions.includes(permission);
    return { allowed, status: allowed ? 200 : 403, isOwner: false, isStaff: true, staff, permissions, session: { ...session, id: staff.id, userId: staff.id, name: staff.name, email: staff.email } };
}

export function guestAdminAccessResponse(access) {
    return Response.json({ ok: false, error: access.status === 401 ? "No autenticado" : access.status === 404 ? "Instancia no encontrada" : "Sin permisos" }, { status: access.status || 403 });
}
