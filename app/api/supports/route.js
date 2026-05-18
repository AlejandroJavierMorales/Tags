import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET() {

  try {

    const [rows] = await db.execute(`
      SELECT
        id,
        name,
        type,
        is_digital,
        created_at
      FROM tags_supports
      ORDER BY
        is_digital ASC,
        name ASC
    `);

    return Response.json({
      ok: true,
      data: rows
    });

  } catch (err) {

    console.error("SUPPORTS API ERROR:", err);

    return Response.json(
      {
        ok: false,
        error: err.message || "Internal server error",
        data: []
      },
      {
        status: 500
      }
    );
  }
}