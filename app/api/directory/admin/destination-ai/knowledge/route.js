import { db } from "@/app/lib/tags-db";
import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { normalizeDestinationTerm } from "@/app/modules/destination-ai/server/destinationTaxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value, max = 500) { return String(value || "").trim().slice(0, max); }
function json(value) { return value == null ? null : JSON.stringify(value); }
function optionalNumber(value){return clean(value)===""?null:Number.isFinite(Number(value))?Number(value):null;}
function optionalBoolean(value){return value===true||value===1||value==="1"?true:value===false||value===0||value==="0"?false:null;}
function parseJson(value){if(value==null)return{};if(typeof value==="object")return value;try{return JSON.parse(value)||{};}catch{return{};}}
function dateValue(value){const text=clean(value,40);if(!text)return null;const date=new Date(text);return Number.isNaN(date.getTime())?null:text.replace("T"," ").replace(/Z$/,"").slice(0,19);}
function contentType(value){return ["attraction","walk","experience","excursion","event","beach","river_access","viewpoint","museum","route","public_service","recommendation","other"].includes(value)?value:"other";}
function contentStatus(value){return ["draft","in_review","published","hidden","archived"].includes(value)?value:"in_review";}
function verificationStatus(value){return ["editorial","source_confirmed","expired"].includes(value)?value:"editorial";}
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

async function saveTourismContent({body,siteId,access}){
  const contentId=Number(body.contentId||0),sourceId=Number(body.sourceId||0),title=clean(body.title,255);
  if(!sourceId||!title)return Response.json({ok:false,error:"Fuente y título son obligatorios"},{status:400});
  const [[sourceRow]]=await db.execute("SELECT id FROM tags_ai_tourism_sources WHERE id=? AND site_id=? LIMIT 1",[sourceId,siteId]);
  if(!sourceRow)return Response.json({ok:false,error:"La fuente no pertenece a este Directorio"},{status:400});
  const taxonomyIds=[...new Set((Array.isArray(body.taxonomyIds)?body.taxonomyIds:[]).map(Number).filter(Number.isInteger))].slice(0,20);
  if(!taxonomyIds.length)return Response.json({ok:false,error:"Seleccioná al menos un rubro final del árbol"},{status:400});
  const placeholders=taxonomyIds.map(()=>"?").join(",");
  const [validTaxonomy]=await db.execute(`SELECT n.id FROM tags_directory_taxonomy_nodes n WHERE n.id IN (${placeholders}) AND n.is_active=1 AND (n.site_id=? OR n.site_id IS NULL) AND NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1)`,[...taxonomyIds,siteId]);
  if(validTaxonomy.length!==taxonomyIds.length)return Response.json({ok:false,error:"Todos los rubros deben ser hojas finales del árbol"},{status:400});
  const latitude=optionalNumber(body.latitude),longitude=optionalNumber(body.longitude);
  if((latitude===null)!==(longitude===null))return Response.json({ok:false,error:"Completá latitud y longitud juntas, o dejá ambas vacías"},{status:400});
  if(latitude!==null&&(latitude< -90||latitude>90||longitude< -180||longitude>180))return Response.json({ok:false,error:"Las coordenadas no son válidas"},{status:400});
  const type=contentType(body.contentType),status=contentStatus(body.status),event=body.event&&typeof body.event==="object"?body.event:{};
  if(type==="event"&&status==="published"&&(!dateValue(event.start)||!dateValue(event.end)))return Response.json({ok:false,error:"Para publicar un evento, completá fecha de inicio y finalización"},{status:400});
  const audience={text:clean(body.audience?.text,3000)||null,minimumAge:clean(body.audience?.minimumAge,80)||null};
  const conditions={restrictions:clean(body.conditions?.restrictions,5000)||null,recommendations:clean(body.conditions?.recommendations,5000)||null,equipment:clean(body.conditions?.equipment,3000)||null,weather:clean(body.conditions?.weather,3000)||null};
  const availability={schedule:clean(body.availability?.schedule,3000)||null,duration:clean(body.availability?.duration,190)||null,season:clean(body.availability?.season,1000)||null,yearRound:optionalBoolean(body.availability?.yearRound),reservationRequired:optionalBoolean(body.availability?.reservationRequired),reservationMethod:clean(body.availability?.reservationMethod,2000)||null};
  const contact={responsible:clean(body.contact?.responsible,255)||null,phone:clean(body.contact?.phone,80)||null,whatsapp:clean(body.contact?.whatsapp,80)||null,email:clean(body.contact?.email,190)||null,website:clean(body.contact?.website||body.publicUrl,2000)||null,social:clean(body.contact?.social,2000)||null,bookingUrl:clean(body.contact?.bookingUrl,2000)||null};
  const practical={activity:clean(body.practical?.activity,5000)||null,features:clean(body.practical?.features,5000)||null,indoor:optionalBoolean(body.practical?.indoor),outdoor:optionalBoolean(body.practical?.outdoor),rainSuitable:optionalBoolean(body.practical?.rainSuitable),petsAllowed:optionalBoolean(body.practical?.petsAllowed),difficulty:clean(body.practical?.difficulty,500)||null,accessibility:clean(body.practical?.accessibility,2000)||null,capacity:clean(body.practical?.capacity,500)||null,priceMode:clean(body.practical?.priceMode,80)||null,priceFrom:optionalNumber(body.practical?.priceFrom),priceTo:optionalNumber(body.practical?.priceTo),currency:clean(body.practical?.currency,10)||"ARS",directions:clean(body.practical?.directions,5000)||null,meetingPoint:clean(body.practical?.meetingPoint,1000)||null,localityArea:clean(body.practical?.localityArea,500)||null};
  const eventJson={status:clean(event.status,80)||null,start:dateValue(event.start),end:dateValue(event.end),place:clean(event.place,1000)||null,organizer:clean(event.organizer,255)||null,recurrence:clean(event.recurrence,1000)||null,edition:clean(event.edition,100)||null,confirmedBy:clean(event.confirmedBy,255)||null,confirmedAt:dateValue(event.confirmedAt),verificationLabel:clean(event.verificationLabel,255)||null};
  const rawImages=Array.isArray(body.images)?body.images:[];
  const images=rawImages.slice(0,30).map(image=>({url:clean(image?.url,2000)||null,pendingFilename:clean(image?.pendingFilename,255)||null,storagePath:clean(image?.storagePath,2000)||null,originalFilename:clean(image?.originalFilename,255)||null,alt:clean(image?.alt,500)||null,credit:clean(image?.credit,500)||null,permission:optionalBoolean(image?.permission),isPrimary:Boolean(image?.isPrimary)})).filter(image=>image.url||image.pendingFilename);
  const requestedPrimary=clean(body.primaryImageUrl,2000),requestedImage=images.find(image=>image.url===requestedPrimary);
  const primaryImageUrl=requestedImage&&requestedImage.permission!==false?requestedPrimary:(images.find(image=>image.url&&image.isPrimary&&image.permission===true)?.url||images.find(image=>image.url&&image.permission===true)?.url||null);
  const searchable=clean([title,body.summary,body.description,audience.text,conditions.restrictions,conditions.recommendations,conditions.equipment,conditions.weather,availability.schedule,availability.season,contact.responsible,practical.activity,practical.features,practical.difficulty,practical.accessibility,practical.directions,practical.meetingPoint,body.localityName,practical.localityArea,body.address,eventJson.place,eventJson.organizer].filter(Boolean).join(" | "),50000);
  const slug=clean(body.slug||body.externalKey||normalizeDestinationTerm(title).replace(/\s+/g,"-"),190);
  const fields=["source_id","external_key","content_type","title","slug","summary","description","audience_json","conditions_json","availability_json","contact_json","practical_json","event_json","locality_id","locality_name","address","latitude","longitude","public_url","primary_image_url","source_url","source_checked_at","loaded_by_name","loaded_by_kind","pending_confirmation_text","images_json","status","verification_status","valid_from","valid_until","searchable_text","show_in_muchi","show_on_map","is_featured"];
  const validFrom=dateValue(type==="event"?(eventJson.start||body.validFrom):body.validFrom),validUntil=dateValue(type==="event"?(eventJson.end||body.validUntil):body.validUntil);
  const values=[sourceId,clean(body.externalKey,190)||null,type,title,slug,clean(body.summary,1000)||null,clean(body.description,50000)||null,json(audience),json(conditions),json(availability),json(contact),json(practical),json(eventJson),Number(body.localityId||0)||null,clean(body.localityName,190)||null,clean(body.address,500)||null,latitude,longitude,clean(contact.website||body.publicUrl,2000)||null,primaryImageUrl,clean(body.sourceUrl,2000)||null,dateValue(body.sourceCheckedAt),clean(body.loadedByName,190)||null,clean(body.loadedByKind,40)||null,clean(body.pendingConfirmationText,50000)||null,json(images),status,verificationStatus(body.verificationStatus),validFrom,validUntil,searchable,body.showInMuchi===false?0:1,body.showOnMap===false?0:1,body.isFeatured?1:0];
  const reviewerId=Number(access.session?.id||0)||null,connection=await db.getConnection();
  try{
    await connection.beginTransaction();let savedId=contentId;
    if(contentId){
      const [[existing]]=await connection.execute("SELECT id FROM tags_ai_tourism_contents WHERE id=? AND site_id=? LIMIT 1 FOR UPDATE",[contentId,siteId]);
      if(!existing){await connection.rollback();return Response.json({ok:false,error:"Contenido turístico no encontrado"},{status:404});}
      const assignments=fields.map(field=>`${field}=?`).join(",");
      await connection.execute(`UPDATE tags_ai_tourism_contents SET ${assignments},reviewed_by_id=?,reviewed_at=IF(?='published',NOW(),reviewed_at),updated_at=NOW() WHERE id=? AND site_id=?`,[...values,reviewerId,status,contentId,siteId]);
    }else{
      const insertFields=["site_id",...fields,"created_by_id","reviewed_by_id","reviewed_at"];
      const insertValues=[siteId,...values,reviewerId,status==="published"?reviewerId:null,status==="published"?new Date():null];
      const [result]=await connection.execute(`INSERT INTO tags_ai_tourism_contents (${insertFields.join(",")}) VALUES (${insertValues.map(()=>"?").join(",")})`,insertValues);savedId=Number(result.insertId);
    }
    await connection.execute("DELETE FROM tags_ai_tourism_content_categories WHERE site_id=? AND content_id=?",[siteId,savedId]);
    for(const taxonomyId of taxonomyIds)await connection.execute("INSERT INTO tags_ai_tourism_content_categories (site_id,content_id,taxonomy_node_id) VALUES (?,?,?)",[siteId,savedId,taxonomyId]);
    await connection.commit();return Response.json({ok:true,id:savedId});
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

export async function GET(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const params = new URL(request.url).searchParams;
  const siteId = Number(params.get("siteId") || 0);
  const site = await getSite(siteId);
  if (!site) return Response.json({ ok:false,error:"Directorio no encontrado" }, { status:404 });
  try {
    const contentId=Number(params.get("contentId")||0);
    if(contentId){
      const [[row],[categoryRows]]=await Promise.all([
        db.execute(`SELECT c.*,s.name source_name FROM tags_ai_tourism_contents c INNER JOIN tags_ai_tourism_sources s ON s.id=c.source_id WHERE c.site_id=? AND c.id=? LIMIT 1`,[siteId,contentId]),
        db.execute("SELECT taxonomy_node_id FROM tags_ai_tourism_content_categories WHERE site_id=? AND content_id=?",[siteId,contentId]),
      ]);
      if(!row.length)return Response.json({ok:false,error:"Contenido turístico no encontrado"},{status:404});
      const item=row[0];
      const parsedImages=parseJson(item.images_json),images=Array.isArray(parsedImages)?parsedImages:(parsedImages?.pendingFilename?[parsedImages]:[]);
      return Response.json({ok:true,content:{...item,audience:parseJson(item.audience_json),conditions:parseJson(item.conditions_json),availability:parseJson(item.availability_json),contact:parseJson(item.contact_json),practical:parseJson(item.practical_json),event:parseJson(item.event_json),images,taxonomyIds:categoryRows.map(category=>Number(category.taxonomy_node_id))}});
    }
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
      db.execute(`SELECT c.id,c.source_id,c.external_key,c.content_type,c.title,c.locality_name,c.primary_image_url,c.status,c.verification_status,c.valid_from,c.valid_until,c.show_in_muchi,c.show_on_map,c.is_featured,c.pending_confirmation_text,c.updated_at,s.name source_name
        FROM tags_ai_tourism_contents c INNER JOIN tags_ai_tourism_sources s ON s.id=c.source_id
        WHERE c.site_id=? ORDER BY FIELD(c.status,'in_review','draft','published','hidden','archived'),c.updated_at DESC LIMIT 500`, [siteId]),
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
    if (action === "save_tourism_content") return saveTourismContent({body,siteId,access});
    if (action === "set_tourism_content_status") {
      const contentId=Number(body.contentId||0);const status=contentStatus(body.status);
      if(!contentId)return Response.json({ok:false,error:"Contenido inválido"},{status:400});
      if(status==="published"){
        const [[contentRows],[categoryRows]]=await Promise.all([
          db.execute("SELECT content_type,valid_from,valid_until FROM tags_ai_tourism_contents WHERE id=? AND site_id=? LIMIT 1",[contentId,siteId]),
          db.execute("SELECT COUNT(*) total FROM tags_ai_tourism_content_categories WHERE content_id=? AND site_id=?",[contentId,siteId]),
        ]);
        const item=contentRows[0];if(!item)return Response.json({ok:false,error:"Contenido turístico no encontrado"},{status:404});
        if(!Number(categoryRows[0]?.total||0))return Response.json({ok:false,error:"Asigná al menos un rubro final antes de publicar"},{status:400});
        if(item.content_type==="event"&&(!item.valid_from||!item.valid_until))return Response.json({ok:false,error:"Completá las fechas del evento antes de publicar"},{status:400});
        if(item.content_type==="event"&&new Date(item.valid_until).getTime()<Date.now())return Response.json({ok:false,error:"Un evento vencido no puede publicarse como próximo"},{status:400});
      }
      const [result]=await db.execute("UPDATE tags_ai_tourism_contents SET status=?,reviewed_by_id=?,reviewed_at=IF(?='published',NOW(),reviewed_at),updated_at=NOW() WHERE id=? AND site_id=?",[status,Number(access.session?.id||0)||null,status,contentId,siteId]);
      if(!result.affectedRows)return Response.json({ok:false,error:"Contenido turístico no encontrado"},{status:404});
      return Response.json({ok:true});
    }
    return Response.json({ok:false,error:"Acción no válida"},{status:400});
  } catch(error) {
    if(missingSchema(error)) return Response.json({ok:false,error:"Primero ejecutá la migración del motor Muchi v2."},{status:409});
    if(error?.code==="ER_DUP_ENTRY") return Response.json({ok:false,error:"Ya existe un registro con esos datos."},{status:409});
    throw error;
  }
}
