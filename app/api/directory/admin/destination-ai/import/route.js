import crypto from "node:crypto";
import { db } from "@/app/lib/tags-db";
import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { normalizeDestinationTerm } from "@/app/modules/destination-ai/server/destinationTaxonomyCore";
import { createSimpleWorkbookXlsx, parseSimpleXlsx } from "@/app/modules/destination-ai/server/simpleXlsx";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const VERSION="2.0";
const LEGACY_VERSION="1.0";
const FRIENDLY_HEADERS=["Oficina o institución","Nombre","Tipo","Rubro principal","Otro rubro (opcional)","Localidad","Resumen breve","Información completa","Dirección o cómo llegar","Latitud","Longitud","Página web","Nombre del archivo de la foto","Recomendado para","Información importante","Fecha de inicio","Fecha de finalización"];
const CONTENT_TYPES=new Set(["attraction","walk","experience","excursion","event","beach","river_access","viewpoint","museum","route","public_service","recommendation","other"]);
const SOURCE_TYPES=new Set(["municipality","tourism_office","directory_editorial","provider","other"]);
const STATUSES=new Set(["draft","in_review","published","hidden","archived"]);
const TYPE_OPTIONS=[
  ["Lugar para visitar","attraction","Un atractivo o sitio de interés general."],
  ["Paseo","walk","Una salida o actividad que se puede hacer por cuenta propia."],
  ["Experiencia","experience","Una propuesta vivencial, cultural, gastronómica o recreativa."],
  ["Excursión","excursion","Una actividad organizada o guiada."],
  ["Evento o fiesta","event","Fiestas, festivales, ferias, espectáculos o eventos con fecha."],
  ["Balneario o playa","beach","Balnearios, playas y sectores habilitados para disfrutar del agua."],
  ["Acceso al río","river_access","Bajadas o accesos públicos al río."],
  ["Mirador","viewpoint","Puntos panorámicos o lugares con vistas destacadas."],
  ["Museo","museum","Museos, centros de interpretación y espacios históricos."],
  ["Circuito o recorrido","route","Circuitos, senderos o recorridos con varias paradas."],
  ["Servicio público","public_service","Oficinas, centros de información u otros servicios útiles."],
  ["Recomendación","recommendation","Consejos oficiales o información general para visitantes."],
  ["Otro","other","Usalo solamente si ninguna opción anterior corresponde."],
];
const TYPE_BY_LABEL=new Map(TYPE_OPTIONS.map(([label,value])=>[normalizeDestinationTerm(label),value]));
const clean=(value,max=50000)=>String(value||"").trim().slice(0,max);
const nullableNumber=value=>{const text=clean(value);return text===""?null:Number(text.replace(",","."));};
const slug=value=>normalizeDestinationTerm(value).replace(/\s+/g,"-").slice(0,190);

function safeDate(value){
  const text=clean(value);if(!text)return null;
  if(/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(text))return text;
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)){const [day,month,year]=text.split("/").map(Number);const date=new Date(Date.UTC(year,month-1,day));if(date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day)return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;}
  if(/^\d+(?:\.\d+)?$/.test(text)){const serial=Number(text);if(serial>1&&serial<100000){const date=new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86400000);return date.toISOString().slice(0,10);}}
  return null;
}
function sourceKindFromName(value){const normalized=normalizeDestinationTerm(value);return normalized.includes("municipalidad")||normalized.includes("municipio")?"municipality":"tourism_office";}
function normalizeContentType(value){const text=clean(value);return CONTENT_TYPES.has(text)?text:TYPE_BY_LABEL.get(normalizeDestinationTerm(text))||"";}
async function getTaxonomyLeaves(siteId){
  const [rows]=await db.execute(`SELECT n.id,n.parent_id,n.name,NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1) is_leaf FROM tags_directory_taxonomy_nodes n WHERE (n.site_id=? OR n.site_id IS NULL) AND n.is_active=1`,[siteId]);
  const byId=new Map(rows.map(item=>[Number(item.id),item]));
  const labelFor=item=>{const parts=[];const visited=new Set();let current=item;while(current&&!visited.has(Number(current.id))){visited.add(Number(current.id));parts.unshift(current.name);current=current.parent_id?byId.get(Number(current.parent_id)):null;}return parts.join(" › ");};
  return rows.filter(item=>Number(item.is_leaf)).map(item=>({id:Number(item.id),name:item.name,label:labelFor(item)})).sort((a,b)=>a.label.localeCompare(b.label,"es",{sensitivity:"base"}));
}
function normalizeImportRow(row){
  if(row.template_version)return{...row,_templateVersion:row.template_version};
  const sourceName=clean(row["Oficina o institución"],255);const title=clean(row.Nombre,255);const locality=clean(row.Localidad,190);
  return{_templateVersion:VERSION,template_version:VERSION,action:"upsert",external_key:[locality,title].filter(Boolean).join("-"),source_name:sourceName,source_kind:sourceKindFromName(sourceName),content_type:normalizeContentType(row.Tipo),taxonomy_labels:[row["Rubro principal"],row["Otro rubro (opcional)"]].map(clean).filter(Boolean),title,summary:row["Resumen breve"],description:row["Información completa"],locality,address:row["Dirección o cómo llegar"],latitude:row.Latitud,longitude:row.Longitud,public_url:row["Página web"],primary_image_url:row["Enlace de la imagen"]||"",image_file_name:row["Nombre del archivo de la foto"],status:"published",valid_from:row["Fecha de inicio"],valid_until:row["Fecha de finalización"],taxonomy_ids:"",audience:row["Recomendado para"],conditions:row["Información importante"]};
}

function validateRows(rows,bounds,taxonomyLeaves){
  const taxonomyByLabel=new Map(taxonomyLeaves.map(item=>[normalizeDestinationTerm(item.label),item.id]));
  return rows.map((sourceRow,index)=>{const row=normalizeImportRow(sourceRow);const errors=[];if(![VERSION,LEGACY_VERSION].includes(row._templateVersion))errors.push("La versión de la plantilla no es compatible");if(!clean(row.source_name,255))errors.push("Completá Oficina o institución");if(!clean(row.title,255))errors.push("Completá Nombre");if(!CONTENT_TYPES.has(row.content_type))errors.push("Elegí un Tipo válido según la hoja CÓMO CARGAR");if(row.source_kind&&!SOURCE_TYPES.has(row.source_kind))errors.push("El tipo de institución no es válido");if(row.status&&!STATUSES.has(row.status))errors.push("El estado no es válido");const latitude=nullableNumber(row.latitude),longitude=nullableNumber(row.longitude);if((latitude===null)!==(longitude===null))errors.push("Completá Latitud y Longitud juntas, o dejá ambas vacías");if(latitude!==null&&(!Number.isFinite(latitude)||latitude< -90||latitude>90))errors.push("La Latitud no es válida");if(longitude!==null&&(!Number.isFinite(longitude)||longitude< -180||longitude>180))errors.push("La Longitud no es válida");if(latitude!==null&&longitude!==null&&bounds&&(latitude<Number(bounds.south)||latitude>Number(bounds.north)||longitude<Number(bounds.west)||longitude>Number(bounds.east)))errors.push("Las coordenadas están fuera del área de este Directorio");if(clean(row.valid_from)&&!safeDate(row.valid_from))errors.push("La Fecha de inicio no es válida");if(clean(row.valid_until)&&!safeDate(row.valid_until))errors.push("La Fecha de finalización no es válida");const taxonomyIds=clean(row.taxonomy_ids).split(/[,;|]/).map(Number).filter(Number.isInteger);for(const label of row.taxonomy_labels||[]){const taxonomyId=taxonomyByLabel.get(normalizeDestinationTerm(label));if(taxonomyId)taxonomyIds.push(taxonomyId);else errors.push(`El rubro "${label}" no pertenece a las hojas disponibles`);}const uniqueTaxonomyIds=[...new Set(taxonomyIds)];if(!uniqueTaxonomyIds.length)errors.push("Elegí un Rubro principal");return{row:index+2,valid:errors.length===0,errors,data:{...row,source_name:clean(row.source_name,255),title:clean(row.title,255),latitude,longitude,taxonomyIds:uniqueTaxonomyIds}};});
}

export async function GET(request){
  const access=await requireDirectoryAdmin();if(!access.ok)return directoryAdminError(access);
  const siteId=Number(new URL(request.url).searchParams.get("siteId")||0);if(!siteId)return Response.json({ok:false,error:"Seleccioná un Directorio antes de descargar la plantilla."},{status:400});
  const taxonomyLeaves=await getTaxonomyLeaves(siteId);if(!taxonomyLeaves.length)return Response.json({ok:false,error:"El Directorio no tiene rubros finales disponibles."},{status:409});
  const instructions=[
    ["CÓMO COMPLETAR ESTA PLANILLA"],
    ["1","Usá solamente la primera hoja, llamada INFORMACIÓN PARA MUCHI."],
    ["2","Cada fila debe contener un lugar, paseo, evento, excursión, atractivo o servicio turístico."],
    ["3","No cambies los nombres de las columnas. Podés dejar vacíos los datos que no conozcas."],
    ["4","Son obligatorios: Oficina o institución, Nombre, Tipo y Rubro principal."],
    ["5","Elegí el Rubro principal desde la lista. Si corresponde claramente a dos actividades distintas, también podés elegir Otro rubro."],
    ["6","En Resumen breve escribí en una o dos frases qué es y por qué puede interesarle a una persona."],
    ["7","En Información completa pegá todos los datos útiles y verificables que tengan sobre el lugar o actividad."],
    ["8","Para eventos, cargá Fecha de inicio y Fecha de finalización. Podés usar DD/MM/AAAA, por ejemplo 12/10/2026."],
    ["9","Si conocés la ubicación exacta, copiá Latitud y Longitud desde Google Maps. Si no, dejá las dos vacías."],
    ["10","Si hay una foto, escribí el nombre exacto del archivo, por ejemplo balneario-el-chamico.jpg, y enviá la foto junto con este Excel. No pegues la foto dentro de la planilla."],
    ["11","No hace falta saber programación. Antes de importar, CalamuchitAr revisará automáticamente si falta algún dato obligatorio."],
    [],
    ["TIPOS QUE PODÉS USAR","Cuándo usarlo"],
    ...TYPE_OPTIONS.map(([label,,description])=>[label,description]),
  ];
  const exampleCategory=taxonomyLeaves[0]?.label||"";
  const examples=[FRIENDLY_HEADERS,["Oficina de Turismo de Los Reartes","Lugar turístico de ejemplo","Lugar para visitar",exampleCategory,"","Los Reartes","Una propuesta para disfrutar en familia.","Pegá aquí la información completa: características, horarios, recomendaciones y todo dato útil.","Indicaciones para llegar desde el centro","-31.9200","-64.5700","https://ejemplo.gob.ar","lugar-turistico.jpg","Familias con niños y parejas","Consultar condiciones antes de ir. Llevar protector solar.","",""]];
  const taxonomyFormula=`INDIRECT("'RUBROS DISPONIBLES'!$A$2:$A$${taxonomyLeaves.length+1}")`;
  const workbook=createSimpleWorkbookXlsx([
    {name:"INFORMACIÓN PARA MUCHI",rows:[FRIENDLY_HEADERS],header:true,freezeHeader:true,widths:[32,34,23,42,42,24,42,60,42,15,15,35,35,34,48,18,20],validations:[{column:3,values:TYPE_OPTIONS.map(([label])=>label),allowBlank:false},{column:4,formula:taxonomyFormula,allowBlank:false},{column:5,formula:taxonomyFormula}]},
    {name:"CÓMO CARGAR",rows:instructions,title:true,widths:[28,100]},
    {name:"RUBROS DISPONIBLES",rows:[["Elegí solamente estos rubros finales"],...taxonomyLeaves.map(item=>[item.label])],header:true,freezeHeader:true,widths:[75]},
    {name:"EJEMPLO",rows:examples,header:true,freezeHeader:true,widths:[32,34,23,42,42,24,42,60,42,15,15,35,35,34,48,18,20]},
  ]);
  return new Response(workbook,{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="muchi-informacion-turistica-${VERSION}.xlsx"`,"Cache-Control":"no-store"}});
}

export async function POST(request){
  const access=await requireDirectoryAdmin();if(!access.ok)return directoryAdminError(access);
  const form=await request.formData().catch(()=>null);const file=form?.get("file");const siteId=Number(form?.get("siteId")||0);const mode=form?.get("mode")==="commit"?"commit":"preview";
  if(!file||typeof file.arrayBuffer!=="function"||!siteId)return Response.json({ok:false,error:"Archivo y Directorio son obligatorios"},{status:400});
  if(!String(file.name||"").toLowerCase().endsWith(".xlsx"))return Response.json({ok:false,error:"Usá la plantilla XLSX de Muchi"},{status:400});
  const [sites]=await db.execute("SELECT id,code,name,directory_config FROM tags_directory_sites WHERE id=? AND is_active=1 LIMIT 1",[siteId]);if(!sites.length)return Response.json({ok:false,error:"Directorio no encontrado"},{status:404});
  const buffer=Buffer.from(await file.arrayBuffer());if(buffer.length>8*1024*1024)return Response.json({ok:false,error:"El archivo supera 8 MB"},{status:413});
  let rows;try{rows=parseSimpleXlsx(buffer);}catch(error){return Response.json({ok:false,error:error.message},{status:400});}if(!rows.length)return Response.json({ok:false,error:"La hoja INFORMACIÓN PARA MUCHI no contiene filas para validar"},{status:400});
  const siteConfig=typeof sites[0].directory_config==="object"?sites[0].directory_config:JSON.parse(sites[0].directory_config||"{}");const taxonomyLeaves=await getTaxonomyLeaves(siteId);const validation=validateRows(rows,siteConfig.geographicBounds||null,taxonomyLeaves);const requestedTaxonomy=[...new Set(validation.flatMap(item=>item.data.taxonomyIds))];if(requestedTaxonomy.length){const [validTaxonomyRows]=await db.execute(`SELECT n.id FROM tags_directory_taxonomy_nodes n WHERE n.is_active=1 AND (n.site_id=? OR n.site_id IS NULL) AND n.id IN (${requestedTaxonomy.map(()=>"?").join(",")}) AND NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1)`,[siteId,...requestedTaxonomy]);const validTaxonomy=new Set(validTaxonomyRows.map(item=>Number(item.id)));for(const item of validation){const unknown=item.data.taxonomyIds.filter(id=>!validTaxonomy.has(id));if(unknown.length){item.errors.push("Todos los rubros deben ser hojas finales del árbol");item.valid=false;}}}const report={templateVersion:validation[0]?.data?._templateVersion||VERSION,totalRows:validation.length,validRows:validation.filter(item=>item.valid).length,errorRows:validation.filter(item=>!item.valid).length,rows:validation.slice(0,500)};
  if(mode==="preview"||report.errorRows)return Response.json({ok:report.errorRows===0,mode:"preview",report},{status:report.errorRows?422:200});
  const connection=await db.getConnection();
  try{
    await connection.beginTransaction();
    const fileHash=crypto.createHash("sha256").update(buffer).digest("hex");
    const [importResult]=await connection.execute(`INSERT INTO tags_ai_tourism_imports (site_id,template_version,filename,file_hash,mode,status,total_rows,valid_rows,error_rows,report_json,created_by_id) VALUES (?,?,?,?,?,'validated',?,?,?,?,?)`,[siteId,report.templateVersion,clean(file.name,255),fileHash,"commit",report.totalRows,report.validRows,report.errorRows,JSON.stringify({summary:{totalRows:report.totalRows,validRows:report.validRows,errorRows:report.errorRows}}),Number(access.session?.id||0)||null]);
    for(const item of validation){const row=item.data;const sourceKind=SOURCE_TYPES.has(row.source_kind)?row.source_kind:"other";let [sources]=await connection.execute("SELECT id FROM tags_ai_tourism_sources WHERE site_id=? AND name=? LIMIT 1",[siteId,row.source_name]);let sourceId=Number(sources[0]?.id||0);if(!sourceId){const [sourceResult]=await connection.execute(`INSERT INTO tags_ai_tourism_sources (site_id,name,source_kind,locality_name,status) VALUES (?,?,?,?,'active')`,[siteId,row.source_name,sourceKind,clean(row.locality,190)||null]);sourceId=Number(sourceResult.insertId);}
      const contentSlug=slug(row.external_key||row.title);const searchable=[row.title,row.summary,row.description,row.locality,row.audience,row.conditions].map(clean).filter(Boolean).join(" | ");
      const pendingImageFilename=clean(row.image_file_name,255);const imagesJson=pendingImageFilename?JSON.stringify({pendingFilename:pendingImageFilename}):null;
      const [contentResult]=await connection.execute(`INSERT INTO tags_ai_tourism_contents (site_id,source_id,content_type,title,slug,summary,description,audience_json,conditions_json,locality_name,address,latitude,longitude,public_url,primary_image_url,images_json,status,valid_from,valid_until,searchable_text,created_by_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE source_id=VALUES(source_id),content_type=VALUES(content_type),title=VALUES(title),summary=VALUES(summary),description=VALUES(description),audience_json=VALUES(audience_json),conditions_json=VALUES(conditions_json),locality_name=VALUES(locality_name),address=VALUES(address),latitude=VALUES(latitude),longitude=VALUES(longitude),public_url=VALUES(public_url),primary_image_url=COALESCE(VALUES(primary_image_url),primary_image_url),images_json=COALESCE(VALUES(images_json),images_json),status=VALUES(status),valid_from=VALUES(valid_from),valid_until=VALUES(valid_until),searchable_text=VALUES(searchable_text),updated_at=NOW(),id=LAST_INSERT_ID(id)`,[siteId,sourceId,row.content_type,row.title,contentSlug,clean(row.summary,1000)||null,clean(row.description)||null,row.audience?JSON.stringify({text:clean(row.audience,1000)}):null,row.conditions?JSON.stringify({text:clean(row.conditions,2000)}):null,clean(row.locality,190)||null,clean(row.address,500)||null,row.latitude,row.longitude,clean(row.public_url,2000)||null,clean(row.primary_image_url,2000)||null,imagesJson,STATUSES.has(row.status)?row.status:"published",safeDate(row.valid_from),safeDate(row.valid_until),searchable,Number(access.session?.id||0)||null]);
      const contentId=Number(contentResult.insertId);await connection.execute("DELETE FROM tags_ai_tourism_content_categories WHERE site_id=? AND content_id=?",[siteId,contentId]);for(const taxonomyId of row.taxonomyIds)await connection.execute("INSERT IGNORE INTO tags_ai_tourism_content_categories (site_id,content_id,taxonomy_node_id) VALUES (?,?,?)",[siteId,contentId,taxonomyId]);
    }
    await connection.execute("UPDATE tags_ai_tourism_imports SET status='completed',completed_at=NOW() WHERE id=?",[importResult.insertId]);await connection.commit();return Response.json({ok:true,mode:"commit",importId:Number(importResult.insertId),report});
  }catch(error){await connection.rollback();return Response.json({ok:false,error:error?.code==="ER_NO_SUCH_TABLE"?"Primero ejecutá la migración del motor Muchi v2.":"No se pudo aplicar la importación.",detail:process.env.NODE_ENV==="development"?error.message:undefined},{status:500});}finally{connection.release();}
}
