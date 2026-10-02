"use client";

import { useMemo, useState } from "react";
import { FaLocationCrosshairs, FaMagnifyingGlass, FaRoute } from "react-icons/fa6";
import DirectoryPointsMap from "./DirectoryPointsMap";
import { distanceBetweenPoints } from "./directoryPointsMapUtils";
import "./DirectoryPointsPublicMap.css";

function normalize(value){return String(value||"").toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function directions(point,origin){const params=new URLSearchParams({api:"1",destination:`${point.latitude},${point.longitude}`});if(origin)params.set("origin",`${origin.latitude},${origin.longitude}`);return `https://www.google.com/maps/dir/?${params}`;}

export default function DirectoryPointsPublicMap({ data, apiKey, mapId }){
  const [typeId,setTypeId]=useState(""),[locality,setLocality]=useState(""),[search,setSearch]=useState(""),[position,setPosition]=useState(null),[locating,setLocating]=useState(false),[error,setError]=useState("");
  const localities=useMemo(()=>[...new Set(data.points.map(item=>item.locality_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es")),[data.points]);
  const points=useMemo(()=>{const term=normalize(search);return data.points.filter(item=>(!typeId||String(item.point_type_id)===typeId)&&(!locality||item.locality_name===locality)&&(!term||normalize([item.point_number,item.type_name,item.host_display_name,item.address,item.locality_name].join(" ")).includes(term))).map(item=>({...item,distance:position?distanceBetweenPoints(position,item):null})).sort((a,b)=>position?a.distance-b.distance:String(a.point_number).localeCompare(String(b.point_number),"es",{numeric:true}));},[data.points,typeId,locality,search,position]);
  function locate(){if(!navigator.geolocation){setError("Este dispositivo no permite obtener tu ubicación.");return;}setLocating(true);setError("");navigator.geolocation.getCurrentPosition(result=>{setPosition({latitude:result.coords.latitude,longitude:result.coords.longitude});setLocating(false);},()=>{setError("No pudimos obtener tu ubicación. Revisá los permisos del navegador.");setLocating(false);},{enableHighAccuracy:true,timeout:12000,maximumAge:0});}
  return <section className="tags_points_public_explorer">
    <div className="tags_points_public_filters"><label><FaMagnifyingGlass/><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar punto, comercio o domicilio"/></label><select value={typeId} onChange={event=>setTypeId(event.target.value)}><option value="">Todos los tipos</option>{data.types.map(type=><option value={type.id} key={type.id}>{type.name}</option>)}</select><select value={locality} onChange={event=>setLocality(event.target.value)}><option value="">Todas las localidades</option>{localities.map(name=><option value={name} key={name}>{name}</option>)}</select><button onClick={locate} disabled={locating}><FaLocationCrosshairs/> {locating?"Ubicando...":position?"Actualizar ubicación":"Usar mi ubicación"}</button></div>
    {error&&<p className="tags_points_public_error">{error}</p>}
    <div className="tags_points_public_count"><b>{points.length}</b> {points.length===1?"punto encontrado":"puntos encontrados"}</div>
    {points.length?<><DirectoryPointsMap points={points} apiKey={apiKey} mapId={mapId}/><div className="tags_points_public_cards">{points.map(point=><article key={point.id}><img src={point.primary_photo_url} alt={`${point.type_name} ${point.point_number}`}/><div><span style={{color:point.color_hex}}>{point.type_name}</span><h2>{point.point_number}</h2><strong>{point.host_display_name||point.display_name||"Punto del Directorio"}</strong><p>{point.address||"Ubicación registrada"}{point.locality_name?` · ${point.locality_name}`:""}</p>{point.distance!=null&&<small>{point.distance<1?`${Math.round(point.distance*1000)} metros`: `${point.distance.toFixed(1)} km`} desde tu ubicación</small>}<a href={directions(point,position)} target="_blank" rel="noreferrer"><FaRoute/> Cómo llegar</a></div></article>)}</div></>:<div className="tags_points_public_empty">No encontramos puntos con esos filtros.</div>}
  </section>;
}
