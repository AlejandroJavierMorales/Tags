import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { verifyTagsSession } from "@/app/lib/signTagsSession";

export async function requireBusinessOwner(businessId) {
  const store = await cookies();
  const value = store.get("tags_session")?.value || "";
  const signature = store.get("tags_session_sig")?.value || "";
  if (!value || !verifyTagsSession(value, signature)) return { ok: false, status: 401 };
  let session;
  try { session = JSON.parse(value); } catch { return { ok: false, status: 401 }; }
  const owner = session.role === "admin" || String(session.business_id || session.businessId || session.id || "") === String(businessId);
  if (!owner) return { ok: false, status: 403, session };
  return { ok: true, status: 200, session };
}

export function businessStaffAdminError(access, message = "No autorizado") {
  return Response.json({ ok: false, error: access.status === 401 ? "No autenticado" : message }, { status: access.status || 403 });
}

export async function getBusinessStaff(businessId) {
  const [rows] = await db.query(
    `SELECT st.id,st.name,st.email,st.phone,st.status,st.invited_at,st.last_access_at,
            aa.id access_id,aa.app_code,aa.app_instance_id,aa.role_code,aa.permissions_json,aa.status access_status
       FROM tags_business_staff st
       LEFT JOIN tags_business_staff_app_access aa ON aa.staff_id=st.id AND aa.business_id=st.business_id
      WHERE st.business_id=?
      ORDER BY st.status='active' DESC,st.name,aa.app_code,aa.app_instance_id`,
    [businessId]
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) map.set(row.id, { id: row.id, name: row.name, email: row.email, phone: row.phone, status: row.status, invited_at: row.invited_at, last_access_at: row.last_access_at, access: [] });
    if (row.access_id) {
      let permissions = [];
      try { permissions = Array.isArray(row.permissions_json) ? row.permissions_json : JSON.parse(row.permissions_json || "[]"); } catch {}
      map.get(row.id).access.push({ id: row.access_id, appCode: row.app_code, appInstanceId: row.app_instance_id, roleCode: row.role_code, permissions, status: row.access_status });
    }
  }
  return [...map.values()];
}
