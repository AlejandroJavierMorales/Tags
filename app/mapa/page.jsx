import { headers } from "next/headers";
import Link from "next/link";
import { FaArrowLeft, FaMapLocationDot } from "react-icons/fa6";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectorySiteByCode, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDestinationMapPoints } from "@/app/modules/destination-ai/server/getDestinationMapPoints";
import DirectoryResultsMap from "@/app/modules/directory/components/public/DirectoryResultsMap";
import "./mapa.css";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function getSite(){const requestHeaders=await headers();return getDirectorySiteByCode(await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders)));}
export async function generateMetadata(){const site=await getSite();const name=site?.name||"CalamuchitAr";return{title:`Mapa de comercios y prestadores | ${name}`,description:"Encontrá comercios, servicios, alojamientos, gastronomía y propuestas del Valle en el mapa.",alternates:{canonical:"https://calamuchita.ar/mapa"}};}

export default async function DirectoryMapPage(){
  const site=await getSite();const points=site?await getDestinationMapPoints(site.code):[];
  return <main className="tags_public_map_page"><header><Link href="/enlaces"><FaArrowLeft/> Volver a los enlaces</Link><img src="/directory/calamuchitar/LogoCalamuchitar.webp" alt="CalamuchitAr"/></header><section><div className="tags_public_map_icon"><FaMapLocationDot/></div><span>MAPA DE CALAMUCHITAR</span><h1>Encontrá comercios y prestadores cerca tuyo.</h1><p>Buscá por nombre, rubro, producto o servicio. Los puntos utilizan el icono de su actividad para que puedas identificarlos rápidamente.</p>{points.length?<DirectoryResultsMap listings={points} apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||""} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID||"DEMO_MAP_ID"} defaultOpen/>:<div className="tags_public_map_empty">Todavía no hay ubicaciones públicas disponibles.</div>}</section></main>;
}
