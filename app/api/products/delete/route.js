import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {
    const { id } = await req.json();

    await db.execute(
        "DELETE FROM tags_products WHERE id = ?",
        [id]
    );

    return Response.json({ ok: true });
}