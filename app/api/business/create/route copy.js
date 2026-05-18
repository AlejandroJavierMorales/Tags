import { db } from "@/app/lib/tags-db";

export async function POST(req) {
  try {
    const body = await req.json();

    const name = body.name?.trim();
    const email = body.email?.trim();
    const phone = body.phone?.trim() || null;

    if (!name || !email) {
      return Response.json(
        { error: "Faltan datos" },
        { status: 400 }
      );
    }

    // 🔍 CHECK DUPLICADO
    const [existing] = await db.execute(
      "SELECT id FROM tags_businesses WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return Response.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    const [result] = await db.execute(
      `
      INSERT INTO tags_businesses (name, email, phone)
      VALUES (?, ?, ?)
      `,
      [name, email, phone]
    );

    return Response.json({
      ok: true,
      id: result.insertId
    });

  } catch (error) {
    console.error("CREATE BUSINESS ERROR:", error);

    return Response.json(
      { error: "Error creando cliente" },
      { status: 500 }
    );
  }
}