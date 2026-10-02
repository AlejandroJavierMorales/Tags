import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { undoProductImport } from "@/app/modules/product-import/server/productImportService";
import { db } from "@/app/lib/tags-db";
import { refreshDestinationBusinessProjection } from "@/app/modules/destination-ai/server/refreshDestinationBusinessProjection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const access = await requireDirectoryAdmin();if (!access.ok) return directoryAdminError(access);
  const body = await request.json().catch(() => ({}));const batchId = Number(body.batchId || 0);if (!batchId) return Response.json({ ok: false, error: "Importación requerida" }, { status: 400 });
  try { const [[batch]]=await db.query("SELECT business_id FROM tags_product_import_batches WHERE id=? LIMIT 1",[batchId]);const result=await undoProductImport({ batchId, actorId: Number(access.session?.id || 0) || null });if(batch?.business_id)await refreshDestinationBusinessProjection(batch.business_id).catch(error=>console.error("DESTINATION PROJECTION PRODUCT IMPORT UNDO SYNC ERROR",{businessId:batch.business_id,error}));return Response.json(result); }
  catch (error) { console.error("PRODUCT IMPORT UNDO ERROR", error);return Response.json({ ok: false, error: error.message || "No se pudo deshacer" }, { status: error.status || 500 }); }
}
