import { db } from "@/app/lib/tags-db";

export async function POST(req) {
  try {
    const body = await req.json();

    const id = body.id;
    const name = body.name?.trim();
    const email = body.email?.trim();
    const phone = body.phone?.trim() || null;


console.log("Datos de Cliente en Route: " + JSON.stringify(body))

    if (!id || !email) {
      return Response.json(
        { error: "Faltan datos" },
        { status: 400 }
      );
    }

    await db.execute(
      `
      UPDATE tags_businesses
      SET name = ?, email = ?, phone = ?
      WHERE id = ?
      `,
      [name, email, phone, id]
    );

    return Response.json({ ok: true });

  } catch (error) {
    console.error("UPDATE BUSINESS ERROR:", error);

    return Response.json(
      { error: "Error actualizando cliente" },
      { status: 500 }
    );
  }
}