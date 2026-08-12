"use client";

import { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaMagnifyingGlassPlus, FaXmark } from "react-icons/fa6";
import "./DirectoryProviderGallery.css";

function imageUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `https://www.calamuchita.ar${value}`;
  return value;
}

function columnsForWidth(width){if(width>=992)return 4;if(width>=768)return 3;if(width>=576)return 2;return 1;}

export default function DirectoryProviderGallery({ images = [], providerName, content = {}, styles = {} }) {
  const [failed,setFailed]=useState([]),[zoomed,setZoomed]=useState(null),[active,setActive]=useState(0),[columns,setColumns]=useState(1);
  const visible=images.slice(0,8).filter(image=>!failed.includes(image.id));
  const carousel=content.imageLayout==="carousel";
  const maxStart=Math.max(0,visible.length-columns);
  useEffect(()=>{const resize=()=>setColumns(columnsForWidth(window.innerWidth));resize();window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize);},[]);
  useEffect(()=>{setActive(current=>Math.min(current,maxStart));},[maxStart]);
  if(!visible.length)return null;
  const fail=image=>setFailed(current=>current.includes(image.id)?current:[...current,image.id]);
  return <section className={`tags_directory_provider_gallery${carousel?" is_carousel":""}`} style={{textAlign:styles.alignment||"left"}}>
    {(content.eyebrow!==""||content.title!=="")&&<header>{content.eyebrow!==""&&<span>{content.eyebrow||"GALERÍA"}</span>}{content.title!==""&&<h2 style={styles.typography?.title||{}}>{content.title||`Conocé ${providerName}`}</h2>}{content.subtitle&&<p style={styles.typography?.subtitle||{}}>{content.subtitle}</p>}</header>}
    {carousel?<div className="tags_directory_provider_gallery_carousel"><div className="track" style={{transform:`translateX(-${active*100/columns}%)`}}>{visible.map(image=><figure style={{flexBasis:`${100/columns}%`}} key={image.id}><img src={imageUrl(image.url)} alt={image.alt_text||providerName} loading="lazy" onError={()=>fail(image)} /><button type="button" className="zoom" onClick={()=>setZoomed(image)} aria-label="Ampliar imagen"><FaMagnifyingGlassPlus /></button></figure>)}</div>{maxStart>0&&<><button type="button" className="previous" onClick={()=>setActive(index=>Math.max(0,index-1))} disabled={active===0} aria-label="Imágenes anteriores"><FaChevronLeft /></button><button type="button" className="next" onClick={()=>setActive(index=>Math.min(maxStart,index+1))} disabled={active===maxStart} aria-label="Imágenes siguientes"><FaChevronRight /></button><div className="dots">{Array.from({length:maxStart+1},(_,index)=><button type="button" key={index} className={index===active?"active":""} onClick={()=>setActive(index)} aria-label={`Ver grupo ${index+1}`} />)}</div></>}</div>:<div className="tags_directory_provider_gallery_grid">{visible.map(image=><figure key={image.id}><img src={imageUrl(image.url)} alt={image.alt_text||providerName} loading="lazy" onError={()=>fail(image)} /><button type="button" onClick={()=>setZoomed(image)} aria-label="Ampliar imagen"><FaMagnifyingGlassPlus /></button></figure>)}</div>}
    {zoomed&&<div className="tags_directory_provider_gallery_modal" role="dialog" aria-modal="true" aria-label="Imagen ampliada" onClick={()=>setZoomed(null)}><div onClick={event=>event.stopPropagation()}><button type="button" onClick={()=>setZoomed(null)} aria-label="Cerrar"><FaXmark /></button><img src={imageUrl(zoomed.url)} alt={zoomed.alt_text||providerName} /></div></div>}
  </section>;
}
