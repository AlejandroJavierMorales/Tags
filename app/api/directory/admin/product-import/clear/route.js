import crypto from "node:crypto";
import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { resolveProductImportTarget } from "@/app/modules/product-import/server/productImportTargets";
import { ensureProductImportSchema } from "@/app/modules/product-import/server/productImportService";
import { refreshDestinationBusinessProjection } from "@/app/modules/destination-ai/server/refreshDestinationBusinessProjection";
import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = value => JSON.stringify(value ?? null);

async function storeSnapshot(connection, productId) {
  const [[products], [images], [options], [optionValues], [variants], [variantValues]] = await Promise.all([
    connection.query("SELECT * FROM tags_store_products WHERE id=? LIMIT 1", [productId]),
    connection.query("SELECT * FROM tags_store_product_images WHERE product_id=? ORDER BY sort_order,id", [productId]),
    connection.query("SELECT * FROM tags_store_options WHERE product_id=? ORDER BY sort_order,id", [productId]),
    connection.query("SELECT v.* FROM tags_store_option_values v INNER JOIN tags_store_options o ON o.id=v.option_id WHERE o.product_id=? ORDER BY v.id", [productId]),
    connection.query("SELECT * FROM tags_store_variants WHERE product_id=? ORDER BY id", [productId]),
    connection.query("SELECT vv.* FROM tags_store_variant_values vv INNER JOIN tags_store_variants v ON v.id=vv.variant_id WHERE v.product_id=? ORDER BY vv.variant_id,vv.option_id", [productId]),
  ]);
  return { product: products[0], images, options, optionValues, variants, variantValues };
}

export async function POST(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await request.json().catch(() => ({}));
  const businessId = Number(body.businessId || 0);
  const targetType = String(body.targetType || "");
  const mode = String(body.mode || "");
  if (!businessId || !["catalog", "store"].includes(targetType) || !["without_sales", "all"].includes(mode) || body.confirmation !== "CLEAR_PRODUCT_IMPORT_TARGET") return Response.json({ ok: false, error: "Solicitud de limpieza inválida" }, { status: 400 });

  const connection = await db.getConnection();
  try {
    await ensureProductImportSchema(connection);
    await connection.beginTransaction();
    const target = await resolveProductImportTarget({ businessId, targetType, connection });
    const [batchResult] = await connection.query("INSERT INTO tags_product_import_batches (business_id,target_type,target_instance_id,template_version,original_filename,file_hash,overwrite_mode,empty_value_policy,status,total_rows,created_by_id,started_at) VALUES (?,?,?,'cleanup-1.0','Respaldo previo a limpieza',?,'create_only','preserve','processing',0,?,NOW())", [businessId, targetType, target.instanceId, crypto.randomBytes(32).toString("hex"), Number(access.session?.id || 0) || null]);
    const batchId = Number(batchResult.insertId);
    let deleted = 0;
    let preserved = 0;

    if (targetType === "catalog") {
      const [products] = await connection.query("SELECT * FROM tags_qr_page_products WHERE page_id=? ORDER BY id", [target.instanceId]);
      for (const product of products) await connection.query("INSERT INTO tags_product_import_items (batch_id,source_sheet,entity_type,product_code,action,target_table,target_id,before_json,after_json,applied_updated_at,item_status) VALUES (?,'RESPALDO LIMPIEZA','product',?,'updated','tags_qr_page_products',?,?,NULL,?,'conflict')", [batchId, product.sku || null, product.id, json(product), product.updated_at || null]);
      const [result] = await connection.query("DELETE FROM tags_qr_page_products WHERE page_id=?", [target.instanceId]);
      deleted = Number(result.affectedRows || 0);
      // La limpieza de Catálogo jamás modifica página, secciones, bloques, diseño, header ni footer.
    } else {
      const salesFilter = mode === "without_sales" ? "AND NOT EXISTS (SELECT 1 FROM tags_store_order_items oi WHERE oi.product_id=p.id)" : "";
      const [products] = await connection.query(`SELECT p.id FROM tags_store_products p WHERE p.store_id=? ${salesFilter} ORDER BY p.id`, [target.instanceId]);
      const ids = products.map(item => Number(item.id));
      const [[totalRow]] = await connection.query("SELECT COUNT(*) total FROM tags_store_products WHERE store_id=?", [target.instanceId]);
      preserved = Math.max(0, Number(totalRow?.total || 0) - ids.length);
      for (const id of ids) { const snapshot = await storeSnapshot(connection, id);await connection.query("INSERT INTO tags_product_import_items (batch_id,source_sheet,entity_type,product_code,action,target_table,target_id,before_json,after_json,applied_updated_at,item_status) VALUES (?,'RESPALDO LIMPIEZA','product',?,'updated','tags_store_products',?,?,NULL,?,'conflict')", [batchId, snapshot.product?.sku || null, id, json(snapshot), snapshot.product?.updated_at || null]); }
      if (ids.length) {
        const marks = ids.map(() => "?").join(",");
        await connection.query(`DELETE vv FROM tags_store_variant_values vv INNER JOIN tags_store_variants v ON v.id=vv.variant_id WHERE v.product_id IN (${marks})`, ids);
        await connection.query(`DELETE FROM tags_store_variants WHERE product_id IN (${marks})`, ids);
        await connection.query(`DELETE ov FROM tags_store_option_values ov INNER JOIN tags_store_options o ON o.id=ov.option_id WHERE o.product_id IN (${marks})`, ids);
        await connection.query(`DELETE FROM tags_store_options WHERE product_id IN (${marks})`, ids);
        await connection.query(`DELETE FROM tags_store_favorites WHERE product_id IN (${marks})`, ids);
        await connection.query(`DELETE FROM tags_store_product_images WHERE product_id IN (${marks})`, ids);
        await connection.query(`DELETE FROM tags_store_products WHERE store_id=? AND id IN (${marks})`, [target.instanceId, ...ids]);
        deleted = ids.length;
      }
      if (mode === "all") {
        const [categories] = await connection.query("SELECT * FROM tags_store_categories WHERE store_id=? ORDER BY id", [target.instanceId]);
        for (const category of categories) await connection.query("INSERT INTO tags_product_import_items (batch_id,source_sheet,entity_type,action,target_table,target_id,before_json,after_json,applied_updated_at,item_status) VALUES (?,'RESPALDO LIMPIEZA','category','updated','tags_store_categories',?,?,NULL,?,'conflict')", [batchId, category.id, json(category), category.updated_at || null]);
        await connection.query("UPDATE tags_store_categories SET parent_id=NULL WHERE store_id=?", [target.instanceId]);
        await connection.query("DELETE FROM tags_store_categories WHERE store_id=?", [target.instanceId]);
      }
    }
    await connection.query("UPDATE tags_product_import_batches SET status='completed',total_rows=?,updated_count=?,can_undo=0,report_json=?,completed_at=NOW() WHERE id=?", [deleted, deleted, json({ operation: "cleanup_backup", deleted, preserved, configurationPreserved: true }), batchId]);
    await connection.commit();
    await refreshDestinationBusinessProjection(businessId).catch(error => console.error("DESTINATION PROJECTION IMPORT CLEAR ERROR", { businessId, error }));
    return Response.json({ ok: true, deleted, preserved, batchId });
  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error("PRODUCT IMPORT CLEAR ERROR", error);
    return Response.json({ ok: false, error: error.message || "No se pudo limpiar el catálogo" }, { status: error.status || 500 });
  } finally { connection.release(); }
}
