import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";




export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

console.log("Business Id: " + id)

  await db.execute(`
    DELETE FROM tags_businesses WHERE id = ?
  `, [id]);

  return Response.json({ ok: true });
}