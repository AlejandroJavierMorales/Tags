import { db } from "@/app/lib/tags-db";

export async function POST(req) {
  try {
    const { code, qr_type_id, value, label, email } = await req.json();

    if (!code || !qr_type_id || !value || !email) {
      return Response.json(
        { error: "Faltan datos" },
        { status: 400 }
      );
    }

    // traer tipo
    const [typeRows] = await db.execute(
      "SELECT * FROM tags_qr_types WHERE id = ?",
      [qr_type_id]
    );

    const type = typeRows[0];

    if (!type) {
      return Response.json(
        { error: "Tipo inválido" },
        { status: 400 }
      );
    }

    // construir URL final
    const finalUrl = type.url_prefix
      ? type.url_prefix + value
      : value;

    // actualizar + activar
    await db.execute(
      `
      UPDATE tags_qr_codes
      SET 
        label = ?,
        qr_type_id = ?,
        value = ?,
        final_url = ?,
        email = ?,
        is_active = 1
      WHERE code = ?
      `,
      [label, qr_type_id, value, finalUrl, email, code]
    );

    return Response.json({
      ok: true,
      final_url: finalUrl
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Error guardando QR" },
      { status: 500 }
    );
  }
}