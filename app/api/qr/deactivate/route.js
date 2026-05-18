import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {
  try {
    const { code } = await req.json();

    if (!code) {
      return Response.json(
        { error: "Falta code" },
        { status: 400 }
      );
    }

    // 🔥 Pasa a pending para permitir edición/reconfiguración
    await db.execute(
      `
      UPDATE tags_qr_codes
      SET status = 'pending'
      WHERE code = ?
      `,
      [code]
    );

    return Response.json({ ok: true });

  } catch (err) {
    console.error("DEACTIVATE ERROR:", err);

    return Response.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}