import { db } from "@/app/lib/tags-db";

export async function DELETE(req) {
  try {
    const { code } = await req.json();
   

    if (!code) {
      return Response.json({ error: "Falta code" }, { status: 400 });
    }

    await db.execute(
      "DELETE FROM tags_qr_codes WHERE code = ?",
      [code]
    );

    return Response.json({ ok: true });

  } catch (err) {
    console.error("DELETE QR ERROR:", err);

    return Response.json(
      { error: "Error eliminando QR" },
      { status: 500 }
    );
  }
}