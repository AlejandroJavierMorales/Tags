import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const HTML_LIMIT=2*1024*1024;
const IMAGE_LIMIT=12*1024*1024;
const USER_AGENT="Tags-Destination-AI/1.0 (+https://tags.com.ar)";

function privateIpv4(address){const parts=address.split(".").map(Number);if(parts.length!==4||parts.some(part=>!Number.isInteger(part)))return true;const [a,b]=parts;return a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===198&&[18,19].includes(b));}
function privateIp(address){if(net.isIPv4(address))return privateIpv4(address);if(!net.isIPv6(address))return true;const value=address.toLowerCase();if(value==="::"||value==="::1"||value.startsWith("fe80:")||value.startsWith("fc")||value.startsWith("fd"))return true;const mapped=value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);return mapped?privateIpv4(mapped[1]):false;}
function sourceUrls(value){return String(value||"").split(/[;|\n]/).map(item=>item.trim()).filter(Boolean).slice(0,5);}

async function assertPublicUrl(value){
  let url;try{url=new URL(value);}catch{throw new Error("La URL de la fuente no es válida");}
  if(!["http:","https:"].includes(url.protocol))throw new Error("La fuente debe usar HTTP o HTTPS");
  if(url.username||url.password)throw new Error("La URL no puede contener credenciales");
  if(url.port&&![["http:","80"],["https:","443"]].some(([protocol,port])=>url.protocol===protocol&&url.port===port))throw new Error("La URL usa un puerto no permitido");
  const host=url.hostname.toLowerCase();if(host==="localhost"||host.endsWith(".local")||host.endsWith(".internal")||host.endsWith(".localhost"))throw new Error("El dominio de la fuente no es público");
  if(net.isIP(host)){if(privateIp(host))throw new Error("La URL apunta a una red privada");}
  else{const addresses=await dns.lookup(host,{all:true,verbatim:true});if(!addresses.length||addresses.some(item=>privateIp(item.address)))throw new Error("El dominio apunta a una red no permitida");}
  return url;
}

async function readLimited(response,limit){
  const declared=Number(response.headers["content-length"]||0);if(declared>limit){response.resume();throw new Error("La respuesta supera el tamaño permitido");}
  const chunks=[];let total=0;for await(const chunk of response){total+=chunk.length;if(total>limit){response.destroy();throw new Error("La respuesta supera el tamaño permitido");}chunks.push(Buffer.from(chunk));}return Buffer.concat(chunks,total);
}

function requestOnce(url,{allowIncompleteChain=false}={}){return new Promise((resolve,reject)=>{const client=url.protocol==="https:"?https:http;const request=client.get(url,{headers:{"User-Agent":USER_AGENT,"Accept":"text/html, application/xhtml+xml, image/*"},rejectUnauthorized:!allowIncompleteChain},response=>resolve(response));request.setTimeout(10000,()=>request.destroy(new Error("La fuente demoró demasiado en responder")));request.on("error",reject);});}
async function requestWithCertificateFallback(url){try{return {response:await requestOnce(url),tlsWarning:false};}catch(error){if(url.protocol!=="https:"||!["UNABLE_TO_VERIFY_LEAF_SIGNATURE","UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(error?.code))throw error;return {response:await requestOnce(url,{allowIncompleteChain:true}),tlsWarning:true};}}

async function safeFetch(value,{maxBytes,acceptedTypes}){
  let current=await assertPublicUrl(value),tlsWarning=false;
  for(let redirect=0;redirect<=4;redirect++){
    const requested=await requestWithCertificateFallback(current);const response=requested.response;tlsWarning=tlsWarning||requested.tlsWarning;
    if(response.statusCode>=300&&response.statusCode<400){const location=response.headers.location;response.resume();if(!location)throw new Error("La fuente redirigió sin indicar destino");current=await assertPublicUrl(new URL(location,current).href);continue;}
    if(response.statusCode<200||response.statusCode>=300){response.resume();throw new Error(`La fuente respondió ${response.statusCode}`);}
    const contentType=String(response.headers["content-type"]||"").split(";")[0].trim().toLowerCase();
    if(!acceptedTypes.some(type=>contentType===type||contentType.startsWith(`${type}/`))){response.resume();throw new Error(`Tipo de contenido no permitido: ${contentType||"desconocido"}`);}
    return {buffer:await readLimited(response,maxBytes),contentType,finalUrl:current.href,tlsWarning};
  }
  throw new Error("La fuente realizó demasiadas redirecciones");
}

function attr(tag,name){const match=tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`,"i"))||tag.match(new RegExp(`\\s${name}\\s*=\\s*([^\\s>]+)`,"i"));return match?.[2]||match?.[1]||"";}
function absoluteImage(value,pageUrl,baseUrl){if(!value||/^(data|blob|javascript):/i.test(value))return null;try{const url=new URL(value,baseUrl||pageUrl);if(!["http:","https:"].includes(url.protocol))return null;if(pageUrl.startsWith("https:")&&url.protocol==="http:"&&url.hostname===new URL(pageUrl).hostname)url.protocol="https:";return url.href;}catch{return null;}}
function poorCandidate(url){return /(logo|marca|favicon|icon|sprite|loader|pixel|tracking|avatar|manchon|detalle\.png|newsletter|\/images?\/home\/|home\/(quehacer|dondedormir|dondecomer|comollegar))/i.test(url);}
function candidateKey(value){try{const url=new URL(value);return `${url.hostname.toLowerCase()}${decodeURIComponent(url.pathname).replace(/\/+$/g,"").toLowerCase()}`;}catch{return value;}}

function extractImages(html,pageUrl){
  const baseTag=html.match(/<base\b[^>]*>/i)?.[0]||"",baseUrl=attr(baseTag,"href");const candidates=[];
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const key=(attr(tag,"property")||attr(tag,"name")).toLowerCase();if(!["og:image","og:image:secure_url","twitter:image","twitter:image:src"].includes(key))continue;const url=absoluteImage(attr(tag,"content"),pageUrl,baseUrl);if(url)candidates.push({url,kind:key.startsWith("og:")?"Imagen principal declarada":"Imagen para redes",relationship:"specific",score:key==="og:image"?100:90});}
  for(const tag of html.match(/<img\b[^>]*>/gi)||[]){const url=absoluteImage(attr(tag,"src")||attr(tag,"data-src")||attr(tag,"data-lazy-src"),pageUrl,baseUrl);if(!url||poorCandidate(url))continue;const width=Number(attr(tag,"width")||0),height=Number(attr(tag,"height")||0),alt=attr(tag,"alt");candidates.push({url,kind:"Otra imagen encontrada en la fuente",relationship:"candidate",alt,score:50+(width>=600?10:0)+(height>=400?10:0)});}
  const unique=new Map();for(const candidate of candidates.sort((a,b)=>b.score-a.score)){const key=candidateKey(candidate.url);if(!unique.has(key))unique.set(key,{url:candidate.url,kind:candidate.kind,relationship:candidate.relationship||"candidate",alt:candidate.alt||"",sourcePageUrl:pageUrl});}
  return [...unique.values()].slice(0,8);
}

export async function discoverTourismImages(sourceValue){
  let lastError="";
  for(const sourceUrl of sourceUrls(sourceValue))try{const page=await safeFetch(sourceUrl,{maxBytes:HTML_LIMIT,acceptedTypes:["text/html","application/xhtml+xml"]});const images=extractImages(page.buffer.toString("utf8"),page.finalUrl).map(image=>({...image,tlsWarning:page.tlsWarning}));if(images.length)return images;lastError="La página no contiene imágenes utilizables";}catch(error){lastError=error.message;}
  return Object.assign([],{error:lastError||"No se indicó una URL exacta de la fuente"});
}

export async function downloadTourismImage(candidateUrl){
  const result=await safeFetch(candidateUrl,{maxBytes:IMAGE_LIMIT,acceptedTypes:["image"]});
  const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"}[result.contentType];
  if(!extension)throw new Error("La imagen encontrada no está en JPG, PNG, WEBP o AVIF");
  const pathName=new URL(result.finalUrl).pathname.split("/").pop()||"imagen-fuente";const base=decodeURIComponent(pathName).replace(/\.[^.]+$/,"").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120)||"imagen-fuente";
  return {...result,fileName:`${base}.${extension}`};
}

export function sourceImageAllowed(candidateUrl,candidates=[]){return candidates.some(candidate=>candidate.url===candidateUrl);}
