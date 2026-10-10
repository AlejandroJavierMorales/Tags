export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/app/lib/tags-db";
import { signTagsSession } from "@/app/lib/signTagsSession";
import { getRequestBaseUrl } from "@/app/lib/channelContext";

export async function GET(request) {
  const token = String(new URL(request.url).searchParams.get("token") || "");
  if (!token) return new Response("Token requerido", { status: 400 });
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT t.id token_id,st.id staff_id,st.business_id,st.name,st.email,
              aa.app_instance_id,aa.app_code
         FROM tags_business_staff_auth_tokens t
         INNER JOIN tags_business_staff st
           ON st.id=t.staff_id AND st.business_id=t.business_id AND st.status='active'
         INNER JOIN tags_business_staff_app_access aa
           ON aa.staff_id=st.id AND aa.business_id=st.business_id
          AND aa.status='active'
        WHERE t.token_hash=? AND t.used_at IS NULL AND t.expires_at>NOW()
        ORDER BY (aa.app_code='guest_experience') DESC,aa.app_instance_id DESC,aa.id DESC LIMIT 1 FOR UPDATE`,
      [tokenHash],
    );
    const staff = rows[0];
    if (!staff) {
      await connection.rollback();
      return new Response("El enlace es inválido o venció", { status: 410 });
    }
    const [[app]] = staff.app_code === "guest_experience" ? await connection.query(
      `SELECT id FROM tags_guest_apps
        WHERE business_id=? AND (?=0 OR id=?) ORDER BY id LIMIT 1`,
      [staff.business_id, staff.app_instance_id, staff.app_instance_id],
    ) : [[{ id: 1 }]];
    if (!app) {
      await connection.rollback();
      return new Response("Mi Estadía no está disponible", { status: 403 });
    }
    await connection.query("UPDATE tags_business_staff_auth_tokens SET used_at=NOW() WHERE id=?", [staff.token_id]);
    await connection.query("UPDATE tags_business_staff SET last_access_at=NOW() WHERE id=?", [staff.staff_id]);
    await connection.commit();
    const session = {
      role: "staff",
      type: "business_staff",
      staffId: staff.staff_id,
      businessId: staff.business_id,
      business_id: staff.business_id,
      name: staff.name,
      email: staff.email,
    };
    const value = JSON.stringify(session);
    const baseUrl = getRequestBaseUrl(request);
    if (!baseUrl) return new Response("No se pudo determinar la URL del acceso", { status: 500 });
    const destination = staff.app_code === "guest_experience"
      ? `${baseUrl}/dashboard/businesses/${staff.business_id}/guest-experience`
      : staff.app_code === "turnos"
        ? `${baseUrl}/dashboard/businesses/${staff.business_id}/turnos`
      : staff.app_code === "events"
        ? `${baseUrl}/dashboard/businesses/${staff.business_id}/events`
      : staff.app_code === "e_events"
        ? `${baseUrl}/dashboard/businesses/${staff.business_id}/events-pro`
      : `${baseUrl}/dashboard/businesses/${staff.business_id}`;
    const response = NextResponse.redirect(destination);
    const options = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };
    response.cookies.set("tags_session", value, options);
    response.cookies.set("tags_session_sig", signTagsSession(value), options);
    return response;
  } catch (error) {
    await connection.rollback();
    console.error("BUSINESS STAFF VERIFY ERROR", error);
    return new Response("No se pudo iniciar sesión", { status: 500 });
  } finally {
    connection.release();
  }
}
