import crypto from "node:crypto";
import sharp from "sharp";
import { db } from "@/app/lib/tags-db";
import { uploadFile } from "@/app/modules/files/lib/uploadFile";
import { deleteFile } from "@/app/modules/files/lib/deleteFile";
import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { normalizeDestinationTerm } from "@/app/modules/destination-ai/server/destinationTaxonomyCore";
import { createSimpleWorkbookXlsx, parseSimpleXlsx } from "@/app/modules/destination-ai/server/simpleXlsx";
import { TOURISM_TEMPLATE_VERSION, createTourismV3Workbook, tourismSafeDate, validateTourismV3Rows } from "@/app/modules/destination-ai/server/tourismImportV3";
import { discoverTourismImages, downloadTourismImage, sourceImageAllowed } from "@/app/modules/destination-ai/server/tourismRemoteImages";

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
const normalizedFilename=value=>clean(value,255).replace(/\\/g,"/").split("/").pop().toLowerCase();
const jsonArray=value=>{if(Array.isArray(value))return value;if(!value)return[];try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[];}catch{return[];}};

async function uploadTourismImage(file,siteId,externalKey,index){
  const input=Buffer.from(await file.arrayBuffer());
  let output=await sharp(input).rotate().resize({width:1200,height:1200,fit:"inside",withoutEnlargement:true}).webp({quality:82,effort:5}).toBuffer();
  if(output.length>1200*1024)output=await sharp(output).webp({quality:68,effort:6}).toBuffer();
  if(output.length>1200*1024)throw new Error(`${file.name}: la imagen optimizada supera 1,2 MB`);
  return uploadFile({buffer:output,storagePath:`destination-ai/tourism/${siteId}/${slug(externalKey)}-${index}-${Date.now()}.webp`,mimeType:"image/webp"});
}

async function mapLimit(items,limit,mapper){const results=new Array(items.length);let cursor=0;async function worker(){while(cursor<items.length){const index=cursor++;results[index]=await mapper(items[index],index);}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return results;}

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
  const [[localityRows],[existingContents]]=await Promise.all([
    db.execute("SELECT DISTINCT name FROM tags_geo_places WHERE place_type='locality' AND is_active=1 AND name IS NOT NULL AND name<>'' ORDER BY name").catch(()=>[[]]),
    db.execute("SELECT external_key,title,locality_name,status FROM tags_ai_tourism_contents WHERE site_id=? AND external_key IS NOT NULL AND external_key<>'' ORDER BY locality_name,title",[siteId]).catch(()=>[[]]),
  ]);
  const workbookV3=createTourismV3Workbook(taxonomyLeaves,localityRows.map(item=>clean(item.name,190)).filter(Boolean),existingContents);
  return new Response(workbookV3,{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="muchi-informacion-turistica-${TOURISM_TEMPLATE_VERSION}.xlsx"`,"Cache-Control":"no-store"}});
  /* La plantilla 2.0 queda debajo solamente para aceptar archivos históricos. */
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
  const form=await request.formData().catch(()=>null);const file=form?.get("file");const imageFiles=(form?.getAll("images")||[]).filter(item=>item&&typeof item.arrayBuffer==="function");const imageByName=new Map(imageFiles.map(item=>[normalizedFilename(item.name),item]));const siteId=Number(form?.get("siteId")||0);const mode=form?.get("mode")==="commit"?"commit":"preview";
  let selectedRows=[];try{selectedRows=JSON.parse(String(form?.get("selectedRows")||"[]"));}catch{selectedRows=[];}const selectedSet=new Set((Array.isArray(selectedRows)?selectedRows:[]).map(Number).filter(Number.isInteger));
  let selectedRemoteImages={};try{selectedRemoteImages=JSON.parse(String(form?.get("selectedRemoteImages")||"{}"));}catch{selectedRemoteImages={};}const selectedRemoteByRow=new Map(Object.entries(selectedRemoteImages&&typeof selectedRemoteImages==="object"?selectedRemoteImages:{}).map(([row,value])=>{const rawUrls=typeof value==="string"?[value]:Array.isArray(value?.urls)?value.urls:[];const urls=[...new Set(rawUrls.map(url=>clean(url,2000)).filter(Boolean))].slice(0,8);const requestedPrimary=clean(typeof value==="string"?value:value?.primaryUrl,2000);return[Number(row),{urls,primaryUrl:urls.includes(requestedPrimary)?requestedPrimary:(urls[0]||"")}];}).filter(([row,selection])=>Number.isInteger(row)&&selection.urls.length));
  if(!file||typeof file.arrayBuffer!=="function"||!siteId)return Response.json({ok:false,error:"Archivo y Directorio son obligatorios"},{status:400});
  if(!String(file.name||"").toLowerCase().endsWith(".xlsx"))return Response.json({ok:false,error:"Usá la plantilla XLSX de Muchi"},{status:400});
  const [sites]=await db.execute("SELECT id,code,name,directory_config FROM tags_directory_sites WHERE id=? AND is_active=1 LIMIT 1",[siteId]);if(!sites.length)return Response.json({ok:false,error:"Directorio no encontrado"},{status:404});
  const buffer=Buffer.from(await file.arrayBuffer());if(buffer.length>8*1024*1024)return Response.json({ok:false,error:"El archivo supera 8 MB"},{status:413});
  if(imageFiles.length>250)return Response.json({ok:false,error:"Podés importar hasta 250 imágenes por vez"},{status:413});
  if(imageFiles.some(item=>Number(item.size||0)>12*1024*1024))return Response.json({ok:false,error:"Cada imagen debe pesar menos de 12 MB antes de optimizarse"},{status:413});
  let rows;try{rows=parseSimpleXlsx(buffer);}catch(error){return Response.json({ok:false,error:error.message},{status:400});}if(!rows.length)return Response.json({ok:false,error:"La hoja de información turística no contiene filas para validar"},{status:400});
  const isV3=Object.prototype.hasOwnProperty.call(rows[0]||{},"Código único");
  const siteConfig=typeof sites[0].directory_config==="object"?sites[0].directory_config:JSON.parse(sites[0].directory_config||"{}");const taxonomyLeaves=await getTaxonomyLeaves(siteId);const validation=isV3?validateTourismV3Rows(rows,siteConfig.geographicBounds||null,taxonomyLeaves):validateRows(rows,siteConfig.geographicBounds||null,taxonomyLeaves);const requestedTaxonomy=[...new Set(validation.flatMap(item=>item.data.taxonomyIds))];if(requestedTaxonomy.length){const [validTaxonomyRows]=await db.execute(`SELECT n.id FROM tags_directory_taxonomy_nodes n WHERE n.is_active=1 AND (n.site_id=? OR n.site_id IS NULL) AND n.id IN (${requestedTaxonomy.map(()=>"?").join(",")}) AND NOT EXISTS(SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id AND child.is_active=1)`,[siteId,...requestedTaxonomy]);const validTaxonomy=new Set(validTaxonomyRows.map(item=>Number(item.id)));for(const item of validation){const unknown=item.data.taxonomyIds.filter(id=>!validTaxonomy.has(id));if(unknown.length){item.errors.push("Todos los rubros deben ser hojas finales del árbol");item.valid=false;}}}
  if(isV3){const keys=validation.map(item=>item.data.external_key).filter(Boolean);const existing=new Set();if(keys.length){const [existingRows]=await db.execute(`SELECT external_key FROM tags_ai_tourism_contents WHERE site_id=? AND external_key IN (${keys.map(()=>"?").join(",")})`,[siteId,...keys]);existingRows.forEach(item=>existing.add(item.external_key));}validation.forEach(item=>{item.operation=item.data.action==="archivar"?"archive":item.data.action==="ocultar"?"hide":existing.has(item.data.external_key)?"update":"create";});}
  if(isV3){for(const item of validation){const names=[item.data.image_file_name,...String(item.data.additional_images||"").split(/[,;|]/)].map(normalizedFilename).filter(Boolean);const missing=names.filter(name=>!imageByName.has(name));if(missing.length)item.warnings.push(`Imágenes pendientes de cargar: ${missing.join(", ")}`);}}
  if(isV3){
    const discoveryTargets=validation.filter(item=>{const names=[item.data.image_file_name,...String(item.data.additional_images||"").split(/[,;|]/)].map(normalizedFilename).filter(Boolean);return item.valid&&item.data.source_url&&!names.length&&(mode==="preview"||selectedRemoteByRow.has(Number(item.row)));});
    await mapLimit(discoveryTargets,4,async item=>{item.warnings=item.warnings||[];const candidates=await discoverTourismImages(item.data.source_url);item.remoteImages=[...candidates];item.remoteImageError=candidates.error||"";if(mode==="preview"&&!item.remoteImages.length)item.warnings.push(`No se encontraron imágenes utilizables en la fuente: ${item.remoteImageError}`);if(mode==="commit"&&selectedRemoteByRow.has(Number(item.row))){const selection=selectedRemoteByRow.get(Number(item.row)),missing=selection.urls.filter(url=>!sourceImageAllowed(url,item.remoteImages));if(missing.length){item.errors.push("Una o más imágenes aprobadas ya no están disponibles en la fuente indicada");item.valid=false;}else{item.approvedRemoteImages=selection.urls.map(url=>item.remoteImages.find(candidate=>candidate.url===url));item.approvedRemotePrimaryUrl=selection.primaryUrl;}}});
  }
  const selectedValidation=mode==="commit"?validation.filter(item=>selectedSet.has(Number(item.row))):validation.filter(item=>item.valid);
  const report={templateVersion:isV3?TOURISM_TEMPLATE_VERSION:validation[0]?.data?._templateVersion||VERSION,totalRows:validation.length,validRows:validation.filter(item=>item.valid).length,errorRows:validation.filter(item=>!item.valid).length,warningRows:validation.filter(item=>item.warnings?.length).length,selectedRows:selectedValidation.length,selectedValidRows:selectedValidation.filter(item=>item.valid).length,creates:validation.filter(item=>item.operation==="create").length,updates:validation.filter(item=>item.operation==="update").length,rows:validation.slice(0,500)};
  if(mode==="preview")return Response.json({ok:true,mode:"preview",report});
  if(!selectedSet.size)return Response.json({ok:false,error:"Seleccioná al menos una fila válida para importar",report},{status:400});
  const invalidSelected=selectedValidation.filter(item=>!item.valid);if(invalidSelected.length)return Response.json({ok:false,error:"Hay filas seleccionadas con errores. Corregilas u omitilas antes de importar",report},{status:422});
  const connection=await db.getConnection();
  const uploadedPaths=[];
  try{
    await connection.beginTransaction();
    const fileHash=crypto.createHash("sha256").update(buffer).digest("hex");
    const [importResult]=await connection.execute(`INSERT INTO tags_ai_tourism_imports (site_id,template_version,filename,file_hash,mode,status,total_rows,valid_rows,error_rows,report_json,created_by_id) VALUES (?,?,?,?,?,'validated',?,?,?,?,?)`,[siteId,report.templateVersion,clean(file.name,255),fileHash,"commit",report.selectedRows,report.selectedValidRows,0,JSON.stringify({summary:{fileRows:report.totalRows,selectedRows:report.selectedRows,validRows:report.selectedValidRows,omittedRows:report.totalRows-report.selectedRows}}),Number(access.session?.id||0)||null]);
    for(const item of selectedValidation){const row=item.data;const sourceKind=SOURCE_TYPES.has(row.source_kind)?row.source_kind:"other";let [sources]=await connection.execute("SELECT id FROM tags_ai_tourism_sources WHERE site_id=? AND name=? LIMIT 1",[siteId,row.source_name]);let sourceId=Number(sources[0]?.id||0);if(!sourceId){const [sourceResult]=await connection.execute(`INSERT INTO tags_ai_tourism_sources (site_id,name,source_kind,locality_name,status) VALUES (?,?,?,?,'active')`,[siteId,row.source_name,sourceKind,clean(row.locality,190)||null]);sourceId=Number(sourceResult.insertId);}
      if(isV3){
        const [existingRows]=await connection.execute("SELECT id,status,images_json,primary_image_url FROM tags_ai_tourism_contents WHERE site_id=? AND external_key=? LIMIT 1 FOR UPDATE",[siteId,row.external_key]);
        const existingId=Number(existingRows[0]?.id||0);
        if(row.action==="ocultar"||row.action==="archivar"){
          if(existingId)await connection.execute("UPDATE tags_ai_tourism_contents SET status=?,updated_at=NOW() WHERE id=? AND site_id=?",[row.action==="archivar"?"archived":"hidden",existingId,siteId]);
          continue;
        }
        const audienceJson=JSON.stringify({text:row.audience||null,minimumAge:row.minimum_age||null});
        const conditionsJson=JSON.stringify({restrictions:row.restrictions||null,recommendations:row.recommendations||null,equipment:row.equipment||null,weather:row.weather||null});
        const availabilityJson=JSON.stringify({schedule:row.schedule||null,duration:row.duration||null,season:row.season||null,yearRound:row.year_round,reservationRequired:row.reservation_required,reservationMethod:row.reservation_method||null});
        const contactJson=JSON.stringify({responsible:row.responsible||null,phone:row.phone||null,whatsapp:row.whatsapp||null,email:row.email||null,website:row.public_url||null,social:row.social_url||null,bookingUrl:row.booking_url||null});
        const practicalJson=JSON.stringify({activity:row.activity_text||null,features:row.features||null,indoor:row.indoor,outdoor:row.outdoor,rainSuitable:row.rain_suitable,petsAllowed:row.pets_allowed,difficulty:row.difficulty||null,accessibility:row.accessibility||null,capacity:row.capacity||null,priceMode:row.price_mode||null,priceFrom:row.price_from,priceTo:row.price_to,currency:row.currency||null,directions:row.directions||null,meetingPoint:row.meeting_point||null,localityArea:row.locality_area||null});
        const eventJson=JSON.stringify({status:row.event_status||null,start:tourismSafeDate(row.event_start),end:tourismSafeDate(row.event_end),place:row.event_place||null,organizer:row.event_organizer||null,recurrence:row.event_recurrence||null,edition:row.event_edition||null,confirmedBy:row.confirmed_by||null,confirmedAt:tourismSafeDate(row.confirmed_at),verificationLabel:row.verification_label||null});
        const remoteImportedImages=[];for(let remoteIndex=0;remoteIndex<(item.approvedRemoteImages||[]).length;remoteIndex++){const approvedImage=item.approvedRemoteImages[remoteIndex];let remote;try{remote=await downloadTourismImage(approvedImage.url);}catch(error){throw new Error(`IMAGEN_REMOTA: No se pudo descargar una imagen aprobada de "${row.title}": ${error.message}`);}const remoteFile={name:remote.fileName,arrayBuffer:async()=>remote.buffer};const media=await uploadTourismImage(remoteFile,siteId,row.external_key,remoteIndex);uploadedPaths.push(media.storagePath);remoteImportedImages.push({url:media.url,storagePath:media.storagePath,originalFilename:remote.fileName,alt:row.image_alt||approvedImage.alt||row.title,credit:row.image_credit||null,permission:true,isPrimary:approvedImage.url===item.approvedRemotePrimaryUrl,sourceUrl:remote.finalUrl,sourcePageUrl:approvedImage.sourcePageUrl,downloadedAt:new Date().toISOString()});}
        const imageNames=[row.image_file_name,...String(row.additional_images||"").split(/[,;|]/)].map(normalizedFilename).filter(Boolean);const importedImages=[...remoteImportedImages];for(let imageIndex=0;imageIndex<imageNames.length;imageIndex++){const imageName=imageNames[imageIndex],imageFile=imageByName.get(imageName);if(imageFile){const media=await uploadTourismImage(imageFile,siteId,row.external_key,remoteImportedImages.length+imageIndex);uploadedPaths.push(media.storagePath);importedImages.push({url:media.url,storagePath:media.storagePath,originalFilename:imageFile.name,alt:row.image_alt||row.title,credit:row.image_credit||null,permission:row.image_permission,isPrimary:false});}else importedImages.push({url:null,pendingFilename:imageName,originalFilename:imageName,alt:row.image_alt||row.title,credit:row.image_credit||null,permission:row.image_permission,isPrimary:false});}const previousImages=existingId?jsonArray(existingRows[0]?.images_json):[];const importedNames=new Set(importedImages.map(image=>normalizedFilename(image.originalFilename||image.pendingFilename)).filter(Boolean));const importedSources=new Set(importedImages.map(image=>image.sourceUrl).filter(Boolean));const uploadedImages=[...previousImages.filter(image=>!importedNames.has(normalizedFilename(image.originalFilename||image.pendingFilename))&&!importedSources.has(image.sourceUrl)),...importedImages];const previousPrimary=clean(existingRows[0]?.primary_image_url,2000);const firstPublishable=importedImages.find(image=>image.url&&image.permission===true&&image.isPrimary)||importedImages.find(image=>image.url&&image.permission===true)||uploadedImages.find(image=>image.url===previousPrimary&&image.permission!==false)||uploadedImages.find(image=>image.url&&image.permission===true);uploadedImages.forEach(image=>{image.isPrimary=Boolean(firstPublishable&&image.url===firstPublishable.url);});const primaryImageUrl=firstPublishable?.url||null;const resolvedPrimaryImageUrl=importedImages.length?primaryImageUrl:(previousPrimary||null);const imagesJson=importedImages.length?JSON.stringify(uploadedImages):null;
        const searchable=[row.title,row.summary,row.description,row.activity_text,row.features,row.audience,row.locality,row.locality_area,row.address,row.directions,row.schedule,row.difficulty,row.accessibility,row.responsible,row.event_place,row.event_organizer].map(clean).filter(Boolean).join(" | ");
        const importedStatus=existingId?(existingRows[0]?.status||"in_review"):"in_review";
        const values=[sourceId,row.content_type,row.title,slug(row.external_key),clean(row.summary,1000)||null,clean(row.description)||null,audienceJson,conditionsJson,availabilityJson,contactJson,practicalJson,eventJson,clean(row.locality,190)||null,clean(row.address,500)||null,row.latitude,row.longitude,clean(row.public_url,2000)||null,resolvedPrimaryImageUrl,clean(row.source_url,2000)||null,tourismSafeDate(row.source_checked_at),clean(row.loaded_by_name,190)||"Work",clean(row.loaded_by_kind,40)||"Relevamiento web",clean(row.pending_confirmation,50000)||null,imagesJson,importedStatus,row.verification_status,tourismSafeDate(row.event_start||row.valid_from),tourismSafeDate(row.event_end||row.valid_until),searchable,row.show_in_muchi?1:0,row.show_on_map?1:0,row.is_featured?1:0];
        let contentId=existingId;
        if(existingId){await connection.execute(`UPDATE tags_ai_tourism_contents SET source_id=?,content_type=?,title=?,slug=?,summary=?,description=?,audience_json=?,conditions_json=?,availability_json=?,contact_json=?,practical_json=?,event_json=?,locality_name=?,address=?,latitude=?,longitude=?,public_url=?,primary_image_url=?,source_url=?,source_checked_at=?,loaded_by_name=?,loaded_by_kind=?,pending_confirmation_text=?,images_json=COALESCE(?,images_json),status=?,verification_status=?,valid_from=?,valid_until=?,searchable_text=?,show_in_muchi=?,show_on_map=?,is_featured=?,updated_at=NOW() WHERE id=? AND site_id=?`,[...values,existingId,siteId]);}
        else{const [created]=await connection.execute(`INSERT INTO tags_ai_tourism_contents (site_id,source_id,external_key,content_type,title,slug,summary,description,audience_json,conditions_json,availability_json,contact_json,practical_json,event_json,locality_name,address,latitude,longitude,public_url,primary_image_url,source_url,source_checked_at,loaded_by_name,loaded_by_kind,pending_confirmation_text,images_json,status,verification_status,valid_from,valid_until,searchable_text,show_in_muchi,show_on_map,is_featured,created_by_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[siteId,sourceId,row.external_key,row.content_type,row.title,slug(row.external_key),clean(row.summary,1000)||null,clean(row.description)||null,audienceJson,conditionsJson,availabilityJson,contactJson,practicalJson,eventJson,clean(row.locality,190)||null,clean(row.address,500)||null,row.latitude,row.longitude,clean(row.public_url,2000)||null,primaryImageUrl,clean(row.source_url,2000)||null,tourismSafeDate(row.source_checked_at),clean(row.loaded_by_name,190)||"Work",clean(row.loaded_by_kind,40)||"Relevamiento web",clean(row.pending_confirmation,50000)||null,imagesJson,importedStatus,row.verification_status,tourismSafeDate(row.event_start||row.valid_from),tourismSafeDate(row.event_end||row.valid_until),searchable,row.show_in_muchi?1:0,row.show_on_map?1:0,row.is_featured?1:0,Number(access.session?.id||0)||null]);contentId=Number(created.insertId);}
        await connection.execute("DELETE FROM tags_ai_tourism_content_categories WHERE site_id=? AND content_id=?",[siteId,contentId]);for(const taxonomyId of row.taxonomyIds)await connection.execute("INSERT IGNORE INTO tags_ai_tourism_content_categories (site_id,content_id,taxonomy_node_id) VALUES (?,?,?)",[siteId,contentId,taxonomyId]);
        continue;
      }
      const contentSlug=slug(row.external_key||row.title);const searchable=[row.title,row.summary,row.description,row.locality,row.audience,row.conditions].map(clean).filter(Boolean).join(" | ");
      const pendingImageFilename=clean(row.image_file_name,255);const imagesJson=pendingImageFilename?JSON.stringify({pendingFilename:pendingImageFilename}):null;
      const [contentResult]=await connection.execute(`INSERT INTO tags_ai_tourism_contents (site_id,source_id,content_type,title,slug,summary,description,audience_json,conditions_json,locality_name,address,latitude,longitude,public_url,primary_image_url,images_json,status,valid_from,valid_until,searchable_text,created_by_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE source_id=VALUES(source_id),content_type=VALUES(content_type),title=VALUES(title),summary=VALUES(summary),description=VALUES(description),audience_json=VALUES(audience_json),conditions_json=VALUES(conditions_json),locality_name=VALUES(locality_name),address=VALUES(address),latitude=VALUES(latitude),longitude=VALUES(longitude),public_url=VALUES(public_url),primary_image_url=COALESCE(VALUES(primary_image_url),primary_image_url),images_json=COALESCE(VALUES(images_json),images_json),status=VALUES(status),valid_from=VALUES(valid_from),valid_until=VALUES(valid_until),searchable_text=VALUES(searchable_text),updated_at=NOW(),id=LAST_INSERT_ID(id)`,[siteId,sourceId,row.content_type,row.title,contentSlug,clean(row.summary,1000)||null,clean(row.description)||null,row.audience?JSON.stringify({text:clean(row.audience,1000)}):null,row.conditions?JSON.stringify({text:clean(row.conditions,2000)}):null,clean(row.locality,190)||null,clean(row.address,500)||null,row.latitude,row.longitude,clean(row.public_url,2000)||null,clean(row.primary_image_url,2000)||null,imagesJson,STATUSES.has(row.status)?row.status:"published",safeDate(row.valid_from),safeDate(row.valid_until),searchable,Number(access.session?.id||0)||null]);
      const contentId=Number(contentResult.insertId);await connection.execute("DELETE FROM tags_ai_tourism_content_categories WHERE site_id=? AND content_id=?",[siteId,contentId]);for(const taxonomyId of row.taxonomyIds)await connection.execute("INSERT IGNORE INTO tags_ai_tourism_content_categories (site_id,content_id,taxonomy_node_id) VALUES (?,?,?)",[siteId,contentId,taxonomyId]);
    }
    await connection.execute("UPDATE tags_ai_tourism_imports SET status='completed',completed_at=NOW() WHERE id=?",[importResult.insertId]);await connection.commit();return Response.json({ok:true,mode:"commit",importId:Number(importResult.insertId),report});
  }catch(error){await connection.rollback();await Promise.all(uploadedPaths.map(path=>deleteFile(path)));const remoteError=String(error?.message||"").startsWith("IMAGEN_REMOTA:")?String(error.message).replace(/^IMAGEN_REMOTA:\s*/,""):null;return Response.json({ok:false,error:error?.code==="ER_NO_SUCH_TABLE"?"Primero ejecutá la migración del motor Muchi v2.":remoteError||"No se pudo aplicar la importación.",detail:process.env.NODE_ENV==="development"?error.message:undefined},{status:500});}finally{connection.release();}
}
