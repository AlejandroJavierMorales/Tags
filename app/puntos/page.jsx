import { headers } from "next/headers";
import Link from "next/link";
import { FaArrowLeft, FaMapLocationDot, FaQrcode } from "react-icons/fa6";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getPublicDirectoryPoints } from "@/app/modules/directory-points/server/directoryPointService";
import DirectoryPointsPublicMap from "@/app/modules/directory-points/components/DirectoryPointsPublicMap";
import "./points.css";

export const runtime="nodejs";export const dynamic="force-dynamic";
async function pageData(){const requestHeaders=await headers(),host=getHeadersHost(requestHeaders),siteCode=await getDirectorySiteCodeByHost(host);try{return await getPublicDirectoryPoints(siteCode);}catch{return null;}}
function parsed(value){if(!value)return{};if(typeof value==="object")return value;try{return JSON.parse(value);}catch{return{};}}
export async function generateMetadata(){const data=await pageData(),name=data?.site?.name||"CalamuchitAr",host=String(data?.site?.primary_host||"calamuchita.ar").replace(/^https?:\/\//,"").replace(/\/$/,"");return{title:`Puntos QR de ${name}`,description:`Encontrá los puntos QR oficiales de ${name}, descubrí dónde están instalados y cómo llegar.`,alternates:{canonical:`https://${host}/puntos`},openGraph:{title:`Puntos QR de ${name}`,description:`Mapa público de puntos QR oficiales de ${name}.`,url:`https://${host}/puntos`,type:"website"}};}
export default async function DirectoryPointsPage(){const data=await pageData();if(!data)return <main className="tags_points_public_page"><section className="tags_points_public_unavailable"><FaQrcode/><h1>Puntos QR</h1><p>La herramienta todavía no está habilitada en este Directorio.</p><Link href="/">Volver</Link></section></main>;const brand=parsed(data.site.brand_config),logo=brand.logoUrl||brand.logo_url||"/directory/calamuchitar/LogoCalamuchitar.webp";return <main className="tags_points_public_page" style={{"--points-brand":brand.primaryColor||"#2f7958"}}><header><Link href="/"><FaArrowLeft/> Volver</Link><img src={logo} alt={data.site.name}/></header><section className="tags_points_public_intro"><div className="icon"><FaMapLocationDot/></div><span>PUNTOS QR OFICIALES</span><h1>Encontrá los puntos de {data.site.name}.</h1><p>Son carteles instalados en comercios y espacios del territorio. Filtrá por tipo o localidad, conocé cada lugar y abrí las indicaciones para llegar.</p></section><DirectoryPointsPublicMap data={data} apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||""} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID||"DEMO_MAP_ID"}/></main>;}
