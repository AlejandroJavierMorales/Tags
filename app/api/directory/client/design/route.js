export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";

const clean = (value,max=500) => String(value||"").trim().slice(0,max);

export async function POST(request){
  const body=await request.json().catch(()=>null);
  const businessId=Number(body?.businessId||0),pageId=Number(body?.pageId||0);
  if(!body||!businessId||!pageId)return Response.json({error:"Solicitud inválida"},{status:400});
  const access=await requireQRPageAccess(businessId,{skipQRPageValidation:true});
  if(!access.ok)return Response.json({error:access.error},{status:access.status});
  const drawerDirection=["top","bottom","left","right"].includes(body.headerConfig?.drawerDirection)?body.headerConfig.drawerDirection:"right";
  const header={isVisible:body.headerConfig?.isVisible!==false,showCover:body.headerConfig?.showCover!==false,showLogo:body.headerConfig?.showLogo!==false,showName:body.headerConfig?.showName!==false,showLocation:body.headerConfig?.showLocation!==false,showMenu:body.headerConfig?.showMenu!==false,drawerDirection,eyebrow:clean(body.headerConfig?.eyebrow,120),title:clean(body.headerConfig?.title,190),subtitle:clean(body.headerConfig?.subtitle,500)};
  const footer={showFooter:body.footerConfig?.showFooter!==false,showLogo:body.footerConfig?.showLogo!==false,showBusinessName:body.footerConfig?.showBusinessName!==false,showDescription:body.footerConfig?.showDescription!==false,showContact:body.footerConfig?.showContact!==false,showSocialLinks:body.footerConfig?.showSocialLinks!==false,title:clean(body.footerConfig?.title,190),contactTitle:clean(body.footerConfig?.contactTitle,120),socialTitle:clean(body.footerConfig?.socialTitle,120),text:clean(body.footerConfig?.text,1000)};
  const allowedRadius=["0px","8px","12px","18px","24px"];
  const [pages]=await db.query("SELECT global_styles FROM tags_qr_pages WHERE id=? AND business_id=? AND page_type='directory' LIMIT 1",[pageId,businessId]);
  if(!pages.length)return Response.json({error:"Web Directory no encontrada"},{status:404});
  let currentStyles={};
  try{currentStyles=typeof pages[0].global_styles==="string"?JSON.parse(pages[0].global_styles||"{}"):pages[0].global_styles||{};}catch{currentStyles={};}
  const requestedRadius=clean(body.globalStyles?.borderRadius,10);
  const globalStyles={...currentStyles,borderRadius:allowedRadius.includes(requestedRadius)?requestedRadius:(currentStyles.borderRadius||"12px")};
  await db.query("UPDATE tags_qr_pages SET header_config=?,footer_config=?,global_styles=?,updated_at=NOW() WHERE id=? AND business_id=? AND page_type='directory'",[JSON.stringify(header),JSON.stringify(footer),JSON.stringify(globalStyles),pageId,businessId]);
  return Response.json({ok:true,headerConfig:header,footerConfig:footer,globalStyles});
}
