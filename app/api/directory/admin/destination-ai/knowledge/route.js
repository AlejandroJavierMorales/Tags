import { db } from "@/app/lib/tags-db";
import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { normalizeDestinationTerm } from "@/app/modules/destination-ai/server/destinationTaxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value, max = 500) { return String(value || "").trim().slice(0, max); }
function json(value) { return value == null ? null : JSON.stringify(value); }
function optionalNumber(value){return clean(value)===""?null:Number.isFinite(Number(value))?Number(value):null;}
function missingSchema(error) { return ["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code); }

async function getSite(siteId) {
  const [rows] = await db.execute("SELECT id,code,name FROM tags_directory_sites WHERE id=? AND is_active=1 LIMIT 1", [siteId]);
  return rows[0] || null;
}

async function normalizeCategoryAssignments(connection, siteId, reviewerId = null, reviewerType = "system") {
  const [parents]=await connection.execute(`UPDATE tags_ai_search_location_categories lc
    INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lc.taxonomy_node_id
    SET lc.assignment_status='rejected',lc.reviewed_by_type=?,lc.reviewed_by_id=?,lc.reviewed_at=NOW()
    WHERE lc.site_id=? AND lc.assignment_status<>'rejected'
      AND EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1)`,[reviewerType,reviewerId,siteId]);
  const [leaves]=await connection.execute(`UPDATE tags_ai_search_location_categories lc
    INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lc.taxonomy_node_id
    SET lc.assignment_status='confirmed',lc.reviewed_by_type=?,lc.reviewed_by_id=?,lc.reviewed_at=NOW()
    WHERE lc.site_id=? AND lc.assignment_status='declared'
      AND NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1)`,[reviewerType,reviewerId,siteId]);
  return { rejectedParents:Number(parents.affectedRows||0),confirmedLeaves:Number(leaves.affectedRows||0) };
}

export async function GET(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const params = new URL(request.url).searchParams;
  const siteId = Number(params.get("siteId") || 0);
  const site = await getSite(siteId);
  if (!site) return Response.json({ ok:false,error:"Directorio no encontrado" }, { status:404 });
  try {
    await normalizeCategoryAssignments(db,siteId);
    const [countsResult, categoriesResult, taxonomyResult, sourcesResult, contentsResult] = await Promise.all([
      db.execute(`SELECT
        (SELECT COUNT(*) FROM tags_ai_search_locations WHERE site_id=? AND visibility='public') locations,
        (SELECT COUNT(*) FROM tags_ai_search_items WHERE site_id=? AND visibility='public') items,
        (SELECT COUNT(*) FROM tags_ai_search_location_categories WHERE site_id=? AND assignment_status='declared') pending_categories,
        (SELECT COUNT(*) FROM tags_ai_search_location_categories WHERE site_id=? AND assignment_status='confirmed') confirmed_categories,
        (SELECT COUNT(*) FROM tags_ai_search_location_categories WHERE site_id=? AND assignment_status='rejected') rejected_categories,
        (SELECT COUNT(*) FROM tags_ai_tourism_contents WHERE site_id=? AND status='published') tourism_published,
        (SELECT COUNT(*) FROM tags_ai_tourism_contents WHERE site_id=? AND status IN ('draft','in_review')) tourism_pending`, [siteId,siteId,siteId,siteId,siteId,siteId,siteId]),
      db.execute(`SELECT lc.search_location_id,lc.listing_id,l.name listing_name,lc.taxonomy_node_id,n.name category_name,n.depth,
          NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1) is_leaf,
          lc.is_primary,lc.assignment_status
        FROM tags_ai_search_location_categories lc
        INNER JOIN tags_ai_search_locations l ON l.id=lc.search_location_id
        INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lc.taxonomy_node_id
        WHERE lc.site_id=? ORDER BY FIELD(lc.assignment_status,'declared','confirmed','rejected'),l.name,n.depth DESC,n.name LIMIT 300`, [siteId]),
      db.execute(`SELECT n.id,n.parent_id,n.name,n.node_type,n.depth,
          NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1) is_leaf
        FROM tags_directory_taxonomy_nodes n
        WHERE (n.site_id=? OR n.site_id IS NULL) AND n.is_active=1
        ORDER BY n.depth,n.sort_order,n.name`, [siteId]),
      db.execute("SELECT id,name,source_kind,locality_name,status,updated_at FROM tags_ai_tourism_sources WHERE site_id=? ORDER BY name", [siteId]),
      db.execute("SELECT id,source_id,content_type,title,locality_name,status,valid_from,valid_until,updated_at FROM tags_ai_tourism_contents WHERE site_id=? ORDER BY FIELD(status,'in_review','draft','published','hidden','archived'),updated_at DESC LIMIT 300", [siteId]),
    ]);
    return Response.json({ ok:true,schemaReady:true,site,summary:countsResult[0][0]||{},categories:categoriesResult[0],taxonomy:taxonomyResult[0],sources:sourcesResult[0],contents:contentsResult[0] });
  } catch(error) {
    if (missingSchema(error)) return Response.json({ ok:true,schemaReady:false,site,summary:{},categories:[],taxonomy:[],sources:[],contents:[] });
    throw error;
  }
}

export async function POST(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await request.json().catch(() => null);
  const siteId = Number(body?.siteId || 0);
  const site = await getSite(siteId);
  if (!site) return Response.json({ ok:false,error:"Directorio no encontrado" }, { status:404 });
  const action = clean(body?.action, 40);
  try {
    if (action === "review_category") {
      const searchLocationId=Number(body.searchLocationId); const listingId=Number(body.listingId); const taxonomyNodeId=Number(body.taxonomyNodeId);
      const status=["declared","confirmed","rejected"].includes(body.status)?body.status:"declared";
      if(status==="confirmed"){
        const [[node]]=await db.execute(`SELECT n.id,NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1) is_leaf FROM tags_directory_taxonomy_nodes n WHERE n.id=? AND n.is_active=1 LIMIT 1`,[taxonomyNodeId]);
        if(!node||!Number(node.is_leaf))return Response.json({ok:false,error:"Solo se pueden confirmar rubros finales del árbol. El rubro padre se obtiene automáticamente."},{status:400});
      }
      const where=searchLocationId?"site_id=? AND search_location_id=? AND taxonomy_node_id=?":"site_id=? AND listing_id=? AND taxonomy_node_id=?";
      const targetId=searchLocationId||listingId;
      const [result]=await db.execute(`UPDATE tags_ai_search_location_categories SET assignment_status=?,reviewed_by_type='directory_admin',reviewed_by_id=?,reviewed_at=NOW() WHERE ${where}`,[status,Number(access.session?.id||0)||null,siteId,targetId,taxonomyNodeId]);
      if(!result.affectedRows) return Response.json({ok:false,error:"Asignación no encontrada"},{status:404});
      return Response.json({ok:true});
    }
    if (action === "replace_category") {
      const searchLocationId=Number(body.searchLocationId);const oldTaxonomyNodeId=Number(body.oldTaxonomyNodeId);const newTaxonomyNodeId=Number(body.newTaxonomyNodeId);
      if(!searchLocationId||!oldTaxonomyNodeId||!newTaxonomyNodeId)return Response.json({ok:false,error:"Seleccioná una hoja válida para reemplazar el rubro."},{status:400});
      const connection=await db.getConnection();
      try{
        await connection.beginTransaction();
        const [[newNode]]=await connection.execute(`SELECT n.id FROM tags_directory_taxonomy_nodes n
          WHERE n.id=? AND n.is_active=1 AND (n.site_id=? OR n.site_id IS NULL)
            AND NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1)
          LIMIT 1 FOR UPDATE`,[newTaxonomyNodeId,siteId]);
        if(!newNode){await connection.rollback();return Response.json({ok:false,error:"El rubro nuevo debe ser una hoja activa del árbol."},{status:400});}
        const [[current]]=await connection.execute(`SELECT listing_id,is_primary,source_type FROM tags_ai_search_location_categories
          WHERE site_id=? AND search_location_id=? AND taxonomy_node_id=? LIMIT 1 FOR UPDATE`,[siteId,searchLocationId,oldTaxonomyNodeId]);
        if(!current){await connection.rollback();return Response.json({ok:false,error:"La asignación original ya no existe."},{status:404});}
        const reviewerId=Number(access.session?.id||0)||null;
        await connection.execute(`UPDATE tags_ai_search_location_categories
          SET assignment_status='rejected',reviewed_by_type='directory_admin',reviewed_by_id=?,reviewed_at=NOW()
          WHERE site_id=? AND search_location_id=? AND taxonomy_node_id=?`,[reviewerId,siteId,searchLocationId,oldTaxonomyNodeId]);
        await connection.execute(`INSERT INTO tags_ai_search_location_categories
          (site_id,search_location_id,listing_id,taxonomy_node_id,assignment_status,is_primary,source_type,reviewed_by_type,reviewed_by_id,reviewed_at)
          VALUES (?,?,?,?,'confirmed',?,?,'directory_admin',?,NOW())
          ON DUPLICATE KEY UPDATE assignment_status='confirmed',is_primary=VALUES(is_primary),reviewed_by_type='directory_admin',reviewed_by_id=VALUES(reviewed_by_id),reviewed_at=NOW()`,
          [siteId,searchLocationId,current.listing_id,newTaxonomyNodeId,Number(current.is_primary)?1:0,current.source_type||"directory",reviewerId]);
        await connection.commit();
        return Response.json({ok:true});
      }catch(error){await connection.rollback();throw error;}finally{connection.release();}
    }
    if (action === "normalize_categories") {
      const connection=await db.getConnection();
      try{
        await connection.beginTransaction();
        const reviewerId=Number(access.session?.id||0)||null;
        const result=await normalizeCategoryAssignments(connection,siteId,reviewerId,"directory_admin");
        await connection.commit();
        return Response.json({ok:true,...result});
      }catch(error){await connection.rollback();throw error;}finally{connection.release();}
    }
    if (action === "save_alias") {
      const taxonomyNodeId=Number(body.taxonomyNodeId); const alias=clean(body.alias,190); const normalized=normalizeDestinationTerm(alias);
      if(!taxonomyNodeId||!normalized) return Response.json({ok:false,error:"Alias o rubro inválido"},{status:400});
      const contextType=["all","business","product","dish","service","tourism"].includes(body.contextType)?body.contextType:"all";
      await db.execute(`INSERT INTO tags_ai_taxonomy_aliases (site_id,taxonomy_node_id,alias_value,normalized_alias,context_type,status,source_type) VALUES (?,?,?,?,?,'active','editorial') ON DUPLICATE KEY UPDATE alias_value=VALUES(alias_value),status='active',updated_at=NOW()`,[siteId,taxonomyNodeId,alias,normalized,contextType]);
      return Response.json({ok:true});
    }
    if (action === "save_tourism_source") {
      const name=clean(body.name,255); if(!name) return Response.json({ok:false,error:"Ingresá el nombre de la fuente"},{status:400});
      const kind=["municipality","tourism_office","directory_editorial","provider","other"].includes(body.sourceKind)?body.sourceKind:"other";
      const [result]=await db.execute(`INSERT INTO tags_ai_tourism_sources (site_id,business_id,name,source_kind,locality_id,locality_name,website_url,contact_json,status) VALUES (?,?,?,?,?,?,?,?,?)`,[siteId,Number(body.businessId||0)||null,name,kind,Number(body.localityId||0)||null,clean(body.localityName,190)||null,clean(body.websiteUrl,2000)||null,json(body.contact||null),body.status==='active'?'active':'draft']);
      return Response.json({ok:true,id:Number(result.insertId)});
    }
    if (action === "save_tourism_content") {
      const sourceId=Number(body.sourceId); const title=clean(body.title,255); const searchable=clean([title,body.summary,body.description,(body.constraints||[]).join(" ")].filter(Boolean).join(" | "),50000);
      if(!sourceId||!title||!searchable) return Response.json({ok:false,error:"Fuente y título son obligatorios"},{status:400});
      const taxonomyIds=[...new Set((Array.isArray(body.taxonomyIds)?body.taxonomyIds:[]).map(Number).filter(Number.isInteger))].slice(0,20);
      if(!taxonomyIds.length)return Response.json({ok:false,error:"Seleccioná al menos un rubro final del árbol."},{status:400});
      const placeholders=taxonomyIds.map(()=>"?").join(",");
      const [validTaxonomy]=await db.execute(`SELECT n.id FROM tags_directory_taxonomy_nodes n WHERE n.id IN (${placeholders}) AND n.is_active=1 AND (n.site_id=? OR n.site_id IS NULL) AND NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1)`,[...taxonomyIds,siteId]);
      if(validTaxonomy.length!==taxonomyIds.length)return Response.json({ok:false,error:"Todos los rubros seleccionados deben ser hojas finales del árbol."},{status:400});
      const type=["attraction","walk","experience","excursion","event","beach","river_access","viewpoint","museum","route","public_service","recommendation","other"].includes(body.contentType)?body.contentType:"other";
      const slug=clean(body.slug||normalizeDestinationTerm(title).replace(/\s+/g,"-"),190);
      const status=["draft","in_review","published","hidden","archived"].includes(body.status)?body.status:"draft";
      const [result]=await db.execute(`INSERT INTO tags_ai_tourism_contents (site_id,source_id,content_type,title,slug,summary,description,audience_json,conditions_json,availability_json,locality_id,locality_name,address,latitude,longitude,public_url,primary_image_url,images_json,status,searchable_text,created_by_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[siteId,sourceId,type,title,slug,clean(body.summary,1000)||null,clean(body.description,50000)||null,json(body.audience||null),json(body.conditions||null),json(body.availability||null),Number(body.localityId||0)||null,clean(body.localityName,190)||null,clean(body.address,500)||null,optionalNumber(body.latitude),optionalNumber(body.longitude),clean(body.publicUrl,2000)||null,clean(body.primaryImageUrl,2000)||null,json(body.images||null),status,searchable,Number(access.session?.id||0)||null]);
      const contentId=Number(result.insertId);for(const taxonomyId of taxonomyIds)await db.execute(`INSERT INTO tags_ai_tourism_content_categories (site_id,content_id,taxonomy_node_id) VALUES (?,?,?)`,[siteId,contentId,taxonomyId]);
      return Response.json({ok:true,id:contentId});
    }
    return Response.json({ok:false,error:"Acción no válida"},{status:400});
  } catch(error) {
    if(missingSchema(error)) return Response.json({ok:false,error:"Primero ejecutá la migración del motor Muchi v2."},{status:409});
    if(error?.code==="ER_DUP_ENTRY") return Response.json({ok:false,error:"Ya existe un registro con esos datos."},{status:409});
    throw error;
  }
}
