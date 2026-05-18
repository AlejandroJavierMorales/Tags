import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  const [qrRows] = await db.execute(
    "SELECT id FROM tags_qr_codes WHERE code = ?",
    [code]
  );

  if (!qrRows[0]) {
    return Response.json({ error: "QR no existe" }, { status: 404 });
  }

  const qrId = qrRows[0].id;

  const [stats] = await db.execute(
    `SELECT date, clicks 
     FROM tags_stats_daily 
     WHERE qr_code_id = ?
     ORDER BY date DESC
     LIMIT 30`,
    [qrId]
  );

  const [total] = await db.execute(
    `SELECT COUNT(*) as total 
     FROM tags_clicks 
     WHERE qr_code_id = ?`,
    [qrId]
  );

  return Response.json({
    total: total[0].total,
    daily: stats
  });
}