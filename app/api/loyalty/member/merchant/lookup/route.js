export const runtime="nodejs";
export const dynamic="force-dynamic";
import {db} from "@/app/lib/tags-db";
import {getSessionUser} from "@/app/modules/users/lib/userSession";

function identifier(value){return String(value||"").trim().replace(/^tags-loyalty-business:/i,"");}

export async function POST(request){
 try{
  const session=await getSessionUser();if(!session)return Response.json({success:false,error:"No autenticado"},{status:401});
  const body=await request.json().catch(()=>null),value=identifier(body?.value);if(!value)return Response.json({success:false,error:"Ingresá o escaneá el código del comercio"},{status:400});
  const [rows]=await db.query(`SELECT c.business_id,c.program_id,c.expires_at,p.name program_name,p.description program_description,p.mechanic,b.display_name business_name,b.logo_url business_logo FROM tags_loyalty_merchant_codes c INNER JOIN tags_loyalty_programs p ON p.id=c.program_id AND p.status='active' INNER JOIN tags_businesses b ON b.id=c.business_id INNER JOIN tags_business_addons ba ON ba.business_id=b.id AND ba.addon_code='loyalty' AND ba.status='active' AND (ba.expires_at IS NULL OR ba.expires_at>=NOW()) WHERE c.status='active' AND c.expires_at>NOW() AND (c.access_code=? OR c.qr_token=?) LIMIT 1`,[value,value]);
  const merchant=rows[0];if(!merchant)return Response.json({success:false,error:"El código no es válido o ya venció"},{status:404});
  const [rewards]=await db.query(`SELECT id,name,description,required_points,required_stamps,required_visits FROM tags_loyalty_rewards WHERE program_id=? AND status='active' AND (valid_from IS NULL OR valid_from<=NOW()) AND (valid_until IS NULL OR valid_until>=NOW()) ORDER BY name`,[merchant.program_id]);
  return Response.json({success:true,merchant,rewards});
 }catch(error){console.error("LOYALTY MERCHANT LOOKUP ERROR",error);return Response.json({success:false,error:"No se pudo verificar el comercio"},{status:500});}
}
