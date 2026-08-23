import Link from "next/link";
import { db } from "@/app/lib/tags-db";

export const dynamic = "force-dynamic";

function parseBrand(value) { try { return typeof value === "string" ? JSON.parse(value || "{}") : value || {}; } catch { return {}; } }

export default async function DirectoryMercadoPagoResultPage({ searchParams }) {
  const subscriptionId = Number(searchParams?.subscription || 0);
  const [[site]] = subscriptionId ? await db.query("SELECT ds.name,ds.brand_config FROM tags_subscriptions s INNER JOIN tags_directory_listings l ON l.business_id=s.business_id INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id WHERE s.id=? ORDER BY ds.id LIMIT 1",[subscriptionId]) : [[null]];
  const brand = parseBrand(site?.brand_config);
  const color = brand.primaryColor || "#2f7958";
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#eef6f1",fontFamily:"Arial,sans-serif",color:"#183226"}}><section style={{width:"min(620px,100%)",padding:32,borderRadius:18,background:"#fff",boxShadow:"0 18px 50px #173c2920",textAlign:"center"}}>{brand.logoUrl && <img src={brand.logoUrl} alt={site?.name || "Directorio"} style={{display:"block",width:"auto",height:"auto",maxWidth:240,maxHeight:100,margin:"0 auto 20px"}}/>}<h1>Estamos verificando tu suscripción</h1><p>Mercado Pago nos notificará automáticamente cuando la autorización y el primer cobro queden confirmados.</p><p>No hace falta informar el pago manualmente. Podés ingresar a tu panel para consultar el estado.</p>{subscriptionId > 0 && <small>Suscripción #{subscriptionId}</small>}<div style={{marginTop:24}}><Link href="/login" style={{display:"inline-block",padding:"12px 20px",borderRadius:9,background:color,color:"#fff",textDecoration:"none",fontWeight:800}}>Ingresar a mi panel</Link></div></section></main>;
}
