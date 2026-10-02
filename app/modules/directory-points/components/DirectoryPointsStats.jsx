"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TagsSpinner from "@/app/components/TagsSpinner";
import "./DirectoryPointsStats.css";

const number = value => Number(value || 0).toLocaleString("es-AR");
const dateInput = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const METHOD_LABELS={unique_qr:"QR exclusivo",geolocation:"Ubicación",printed_code:"Código impreso",unattributed:"Sin identificar"};

async function readJson(response){const text=await response.text();try{return text?JSON.parse(text):{};}catch{return{};}}

export default function DirectoryPointsStats({ siteId, types, points, businesses, initialPointId="" }) {
  const today=useMemo(()=>new Date(),[]),start=useMemo(()=>{const value=new Date();value.setDate(value.getDate()-29);return value;},[]);
  const [filters,setFilters]=useState({from:dateInput(start),to:dateInput(today),typeId:"",hostBusinessId:"",pointId:String(initialPointId||""),attribution:""});
  const [stats,setStats]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>setFilters(current=>({...current,pointId:String(initialPointId||"")})),[initialPointId]);
  const load=useCallback(async()=>{setLoading(true);setError("");try{const params=new URLSearchParams({siteId:String(siteId),from:filters.from,to:filters.to});for(const key of ["typeId","hostBusinessId","pointId","attribution"])if(filters[key])params.set(key,filters[key]);const response=await fetch(`/api/directory/admin/points/stats?${params}`,{cache:"no-store"}),payload=await readJson(response);if(!response.ok)throw new Error(payload.error||"No se pudieron cargar las estadísticas");setStats(payload);}catch(loadError){setStats(null);setError(loadError.message);}finally{setLoading(false);}},[siteId,filters]);
  useEffect(()=>{load();},[load]);
  const maxTimeline=Math.max(1,...(stats?.timeline||[]).map(item=>Number(item.scans||0)));
  const hostOptions=useMemo(()=>{const ids=new Set(points.map(item=>String(item.host_business_id||"")).filter(Boolean));return businesses.filter(item=>ids.has(String(item.id)));},[businesses,points]);
  const update=(key,value)=>setFilters(current=>({...current,[key]:value,...(key==="typeId"?{pointId:""}:{})}));
  return <section className="tags_directory_point_stats">
    <header><div><h3>Estadísticas de escaneo</h3><p>Medí el uso de los QR y la ubicación física desde la que fueron escaneados.</p></div><button type="button" onClick={load} disabled={loading}>Actualizar</button></header>
    <div className="tags_directory_point_stats_filters">
      <label>Desde<input type="date" value={filters.from} max={filters.to} onChange={event=>update("from",event.target.value)}/></label>
      <label>Hasta<input type="date" value={filters.to} min={filters.from} onChange={event=>update("to",event.target.value)}/></label>
      <label>Tipo<select value={filters.typeId} onChange={event=>update("typeId",event.target.value)}><option value="">Todos</option>{types.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Cliente anfitrión<select value={filters.hostBusinessId} onChange={event=>update("hostBusinessId",event.target.value)}><option value="">Todos</option>{hostOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Punto<select value={filters.pointId} onChange={event=>update("pointId",event.target.value)}><option value="">Todos</option>{points.filter(item=>!filters.typeId||String(item.point_type_id)===filters.typeId).map(item=><option key={item.id} value={item.id}>{item.type_name} {item.point_number} · {item.host_display_name}</option>)}</select></label>
      <label>Identificación<select value={filters.attribution} onChange={event=>update("attribution",event.target.value)}><option value="">Todos</option><option value="identified">Punto identificado</option><option value="unidentified">Sin identificar</option></select></label>
    </div>
    {loading&&<div className="tags_directory_point_stats_loading"><TagsSpinner/></div>}
    {!loading&&error&&<div className="tags_directory_point_stats_error"><strong>No se pudieron abrir las estadísticas</strong><span>{error}</span></div>}
    {!loading&&stats&&<>
      <div className="tags_directory_point_stats_summary">
        <article><b>{number(stats.summary.total_scans)}</b><span>Escaneos</span></article>
        <article><b>{number(stats.summary.visitors)}</b><span>Visitantes</span></article>
        <article><b>{number(stats.summary.identified_scans)}</b><span>Punto identificado</span></article>
        <article><b>{number(stats.summary.unidentified_scans)}</b><span>Sin identificar</span></article>
      </div>
      <div className="tags_directory_point_stats_columns">
        <article className="tags_directory_point_stats_timeline"><h4>Evolución diaria</h4>{stats.timeline.length?<div>{stats.timeline.map(item=><span key={item.scan_date} title={`${item.scan_date}: ${item.scans} escaneos`}><i style={{height:`${Math.max(5,Number(item.scans)*100/maxTimeline)}%`}}/><small>{String(item.scan_date).slice(5,10)}</small></span>)}</div>:<p>Sin escaneos en el período.</p>}</article>
        <article><h4>Dispositivos</h4><ul>{stats.devices.map(item=><li key={item.label}><span>{item.label}</span><b>{number(item.scans)}</b></li>)}</ul><h4>Ciudades aproximadas</h4><ul>{stats.cities.map(item=><li key={item.city}><span>{item.city}</span><b>{number(item.scans)}</b></li>)}</ul></article>
      </div>
      <StatsTable title="Resultados por punto" empty="Todavía no hay escaneos atribuidos a puntos físicos." headers={["Punto","Lugar","Localidad","Escaneos","Visitantes","Último"]} rows={stats.points.map(item=>[`${item.type_name} ${item.point_number}`,item.host_display_name||item.display_name||"—",item.point_locality||"—",number(item.scans),number(item.visitors),item.last_scan_at?new Date(item.last_scan_at).toLocaleString("es-AR"):"—"])} />
      <StatsTable title="Resultados por cliente anfitrión" empty="No hay clientes con escaneos identificados." headers={["Cliente","Puntos","Escaneos","Visitantes"]} rows={stats.clients.map(item=>[item.host_display_name||"Lugar sin cliente vinculado",number(item.points),number(item.scans),number(item.visitors)])} />
      <StatsTable title="Resultados por QR" empty="No hay escaneos para estos filtros." headers={["QR","Tipo","Puntos asociados","Escaneos","Identificados"]} rows={stats.qrs.map(item=>[item.qr_code,item.type_name,number(item.point_count),number(item.scans),number(item.identified)])} />
      <StatsTable title="Escaneos recientes" empty="No hay movimientos recientes." headers={["Fecha","QR","Punto","Lugar","Método","Ciudad","Dispositivo"]} rows={stats.recent.map(item=>[new Date(item.created_at).toLocaleString("es-AR"),item.qr_code,item.point_number||"Sin identificar",item.host_display_name||"—",METHOD_LABELS[item.attribution_method]||item.attribution_method,item.city||"—",item.device_type||"—"])} />
    </>}
  </section>;
}

function StatsTable({title,headers,rows,empty}){return <article className="tags_directory_point_stats_table"><h4>{title}</h4><div><table><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex}>{cell}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={headers.length}>{empty}</td></tr>}</tbody></table></div></article>}
