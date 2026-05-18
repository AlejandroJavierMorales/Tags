import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return new Response("Token requerido", { status: 400 });
    }

    // =============================
    // 🔍 Buscar token válido
    // =============================
    const [rows] = await db.execute(
      `
      SELECT * 
      FROM tags_auth_tokens
      WHERE token = ?
      AND expires_at > NOW()
      LIMIT 1
      `,
      [token]
    );

    const record = rows[0];

    if (!record) {
      return new Response("Token inválido o expirado", { status: 400 });
    }

    // =============================
    // 🔍 Buscar cliente por email
    // =============================
    const [businessRows] = await db.execute(
      `
      SELECT id 
      FROM tags_businesses
      WHERE email = ?
      LIMIT 1
      `,
      [record.email]
    );

    const business = businessRows[0];

    if (!business) {
      return new Response("Cliente no encontrado", { status: 404 });
    }

    // =============================
    // 🧹 Opcional: borrar token (one-time use)
    // =============================
    await db.execute(
      `DELETE FROM tags_auth_tokens WHERE token = ?`,
      [token]
    );

    // =============================
    // 🍪 Crear sesión simple (cookie)
    // =============================
    const response = NextResponse.redirect(
      new URL(`/dashboard/businesses/${business.id}`, req.url)
    );

    response.cookies.set("tags_session", JSON.stringify({
      businessId: business.id,
      email: record.email
    }), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 días
    });

    return response;

  } catch (error) {
    console.error("VERIFY ERROR:", error);
    return new Response("Error interno", { status: 500 });
  }
}