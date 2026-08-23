export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";

const clean = value => String(value || "").trim();
const validate = body => {
  const name = clean(body?.name), email = clean(body?.email).toLowerCase();
  if (!name) throw Object.assign(new Error("El nombre es obligatorio"),{status:400});
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("El email no tiene un formato válido"),{status:400});
  const phone = clean(body?.phone), whatsapp = clean(body?.whatsapp);
  if (phone && !/^\+?[0-9]{7,15}$/.test(phone.replace(/[\s()-]/g,""))) throw Object.assign(new Error("El teléfono no tiene un formato válido"),{status:400});
  if (whatsapp && !/^\+?[0-9]{10,15}$/.test(whatsapp.replace(/[\s()-]/g,""))) throw Object.assign(new Error("El WhatsApp no tiene un formato válido"),{status:400});
  const latitude=body?.latitude===""||body?.latitude==null?null:Number(body.latitude),longitude=body?.longitude===""||body?.longitude==null?null:Number(body.longitude);
  if(latitude!=null&&(!Number.isFinite(latitude)||latitude < -90||latitude > 90))throw Object.assign(new Error("Latitud inválida"),{status:400});
  if(longitude!=null&&(!Number.isFinite(longitude)||longitude < -180||longitude > 180))throw Object.assign(new Error("Longitud inválida"),{status:400});
  return {name,email,phone:phone||null,whatsapp:whatsapp||null,address:clean(body?.address)||null,postal_code:clean(body?.postal_code)||null,description:clean(body?.description)||null,logo_url:clean(body?.logo_url)||null,website_url:clean(body?.website_url)||null,instagram_url:clean(body?.instagram_url)||null,facebook_url:clean(body?.facebook_url)||null,latitude,longitude};
};

export async function POST(req){
  const access=await requireSubscriptionAdmin(); if(!access.ok)return subscriptionAdminError(access);
  try{
    const value=validate(await req.json().catch(()=>null));
    const [[existing]]=await db.query("SELECT id FROM tags_businesses WHERE email=? LIMIT 1",[value.email]);
    if(existing)return Response.json({ok:false,error:"Ya existe un cliente con ese email"},{status:409});
    const [result]=await db.query("INSERT INTO tags_businesses (name,display_name,email,phone,whatsapp,address,postal_code,description,logo_url,website_url,instagram_url,facebook_url,latitude,longitude,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())",[value.name,value.name,value.email,value.phone,value.whatsapp,value.address,value.postal_code,value.description,value.logo_url,value.website_url,value.instagram_url,value.facebook_url,value.latitude,value.longitude]);
    return Response.json({ok:true,id:Number(result.insertId)});
  }catch(error){return Response.json({ok:false,error:error?.message||"No se pudo crear el cliente"},{status:error?.status||500})}
}

export async function PUT(req){
  const access=await requireSubscriptionAdmin(); if(!access.ok)return subscriptionAdminError(access);
  try{
    const body=await req.json().catch(()=>null),id=Number(body?.id||0),value=validate(body);
    if(!id)return Response.json({ok:false,error:"Falta el cliente"},{status:400});
    const [[duplicate]]=await db.query("SELECT id FROM tags_businesses WHERE email=? AND id<>? LIMIT 1",[value.email,id]);
    if(duplicate)return Response.json({ok:false,error:"Ese email pertenece a otro cliente"},{status:409});
    const [result]=await db.query("UPDATE tags_businesses SET name=?,display_name=?,email=?,phone=?,whatsapp=?,address=?,postal_code=?,description=?,logo_url=?,website_url=?,instagram_url=?,facebook_url=?,latitude=?,longitude=?,updated_at=NOW() WHERE id=?",[value.name,value.name,value.email,value.phone,value.whatsapp,value.address,value.postal_code,value.description,value.logo_url,value.website_url,value.instagram_url,value.facebook_url,value.latitude,value.longitude,id]);
    if(!result.affectedRows)return Response.json({ok:false,error:"Cliente inexistente"},{status:404});
    await db.query("UPDATE tags_directory_listings SET display_name=?,short_description=COALESCE(NULLIF(short_description,''),?),description=COALESCE(NULLIF(description,''),?),email=?,phone=?,whatsapp=?,address=?,latitude=?,longitude=?,website_url=?,updated_at=NOW() WHERE business_id=?",[value.name,value.description?.slice(0,500)||null,value.description||null,value.email,value.phone,value.whatsapp,value.address,value.latitude,value.longitude,value.website_url,id]);
    return Response.json({ok:true});
  }catch(error){return Response.json({ok:false,error:error?.message||"No se pudo editar el cliente"},{status:error?.status||500})}
}

export async function DELETE(req){
  const access=await requireSubscriptionAdmin(); if(!access.ok)return subscriptionAdminError(access);
  const id=Number(new URL(req.url).searchParams.get("id")||0);
  if(!id)return Response.json({ok:false,error:"Falta el cliente"},{status:400});
  const [[usage]]=await db.query("SELECT (SELECT COUNT(*) FROM tags_subscriptions WHERE business_id=?)+(SELECT COUNT(*) FROM tags_business_addons WHERE business_id=?)+(SELECT COUNT(*) FROM tags_qr_pages WHERE business_id=?) total",[id,id,id]);
  if(Number(usage?.total||0)>0)return Response.json({ok:false,error:"El cliente tiene suscripciones, addons o páginas. Eliminá primero esas relaciones."},{status:409});
  const [result]=await db.query("DELETE FROM tags_businesses WHERE id=?",[id]);
  if(!result.affectedRows)return Response.json({ok:false,error:"Cliente inexistente"},{status:404});
  return Response.json({ok:true});
}
