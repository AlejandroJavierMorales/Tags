"use client";

import { useCallback, useEffect, useState } from "react";
import TagsSpinner from "@/app/components/TagsSpinner";
import "./DestinationAiQuestionsPanel.css";

const number=value=>Number(value||0).toLocaleString("es-AR");
const money=value=>`USD ${Number(value||0).toFixed(6)}`;
const STATUS_LABELS={answered:"Respondida",clarification:"Pidió precisión",no_results:"Sin resultados",error:"Error",blocked:"Bloqueada"};
const MODE_LABELS={tourist:"Turista",resident:"Residente",unselected:"Sin seleccionar"};
const INTENT_LABELS={find_business_category:"Buscar comercio o lugar",find_product:"Buscar producto",find_dish:"Buscar comida o plato",find_service:"Buscar servicio",find_experience:"Buscar experiencia",find_event:"Buscar evento",plan_day:"Planificar paseo",public_local_info:"Información local",inspect_business:"Consultar un prestador",follow_up:"Continuar consulta",other:"Otra consulta"};
async function readJson(response){const text=await response.text();try{return text?JSON.parse(text):{};}catch{return{};}}

export default function DestinationAiQuestionsPanel({siteId,period}){
  const [filters,setFilters]=useState({mode:"",status:"",search:""}),[applied,setApplied]=useState({mode:"",status:"",search:""}),[page,setPage]=useState(1),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async()=>{if(!siteId)return;setLoading(true);setError("");try{const params=new URLSearchParams({siteId:String(siteId),period,page:String(page)});for(const key of ["mode","status","search"])if(applied[key])params.set(key,applied[key]);const response=await fetch(`/api/directory/admin/destination-ai/questions?${params}`,{cache:"no-store"}),payload=await readJson(response);if(!response.ok||!payload.ok)throw new Error(payload.error||"No se pudieron cargar las consultas");setData(payload);}catch(loadError){setData(null);setError(loadError.message);}finally{setLoading(false);}},[siteId,period,page,applied]);
  useEffect(()=>{setPage(1);},[siteId,period]);
  useEffect(()=>{load();},[load]);
  function submit(event){event.preventDefault();setPage(1);setApplied({...filters});}
  const summary=data?.summary||{},totalPages=Math.max(1,Math.ceil(Number(summary.questions||0)/Number(data?.pageSize||50)));
  const maxDaily=Math.max(1,...(data?.daily||[]).map(item=>Number(item.questions||0)));
  return <section className="tags_destination_questions">
    <header><div><h3>Qué le preguntan a Muchi</h3><p>Consultas anónimas agrupadas por intención, tema y localidad. No se guardan coordenadas ni identidad del usuario.</p></div><button type="button" onClick={load} disabled={loading}>Actualizar</button></header>
    <form onSubmit={submit} className="tags_destination_questions_filters"><label>Modo<select value={filters.mode} onChange={event=>setFilters(current=>({...current,mode:event.target.value}))}><option value="">Todos</option><option value="tourist">Turista</option><option value="resident">Residente</option><option value="unselected">Sin seleccionar</option></select></label><label>Resultado<select value={filters.status} onChange={event=>setFilters(current=>({...current,status:event.target.value}))}><option value="">Todos</option><option value="answered">Respondidas</option><option value="no_results">Sin resultados</option><option value="clarification">Pidieron precisión</option><option value="error">Con error</option><option value="blocked">Bloqueadas por límite</option></select></label><label className="search">Buscar<input type="search" value={filters.search} onChange={event=>setFilters(current=>({...current,search:event.target.value}))} placeholder="Producto, servicio, localidad o pregunta"/></label><button type="submit">Aplicar</button></form>
    {loading&&<div className="tags_destination_questions_loading"><TagsSpinner/></div>}
    {!loading&&error&&<div className="tags_destination_questions_error"><strong>No se pudieron abrir las consultas</strong><span>{error}</span></div>}
    {!loading&&data&&<>
      <div className="tags_destination_questions_summary"><article><b>{number(summary.questions)}</b><span>Preguntas</span></article><article><b>{number(summary.conversations)}</b><span>Conversaciones</span></article><article><b>{number(summary.no_results)}</b><span>Sin resultados</span></article><article><b>{number(summary.clarifications)}</b><span>Pidieron precisión</span></article><article><b>{number(summary.recommendations)}</b><span>Recomendaciones</span></article><article><b>{money(summary.estimated_cost_usd)}</b><span>Costo asociado</span></article></div>
      <article className="tags_destination_questions_timeline"><h4>Evolución diaria</h4>{data.daily.length?<div>{data.daily.map(item=><span key={item.day} title={`${item.day}: ${item.questions} preguntas`}><i style={{height:`${Math.max(5,Number(item.questions)*100/maxDaily)}%`}}/><small>{String(item.day).slice(5,10)}</small></span>)}</div>:<p>Sin consultas en este período.</p>}</article>
      <div className="tags_destination_questions_grid">
        <StatsList title="Intenciones" rows={data.intents.map(item=>({label:INTENT_LABELS[item.intent_type]||item.intent_type,value:item.questions,detail:item.no_results?`${number(item.no_results)} sin resultados`:""}))}/>
        <StatsList title="Localidades solicitadas" rows={data.localities.map(item=>({label:item.locality,value:item.questions,detail:item.no_results?`${number(item.no_results)} sin resultados`:""}))}/>
        <StatsList title="Opciones recomendadas" rows={data.recommendations.map(item=>({label:item.candidate_name,value:item.recommendations,detail:item.locality||""}))}/>
      </div>
      <DataTable title="Temas más consultados" headers={["Tema agrupado","Intención","Localidad","Preguntas","Sin resultados","Última consulta"]} rows={data.clusters.map(item=>[item.cluster_label,INTENT_LABELS[item.intent_type]||item.intent_type,item.locality,number(item.questions),number(item.no_results),new Date(item.last_question_at).toLocaleString("es-AR")])} empty="Todavía no hay temas registrados en este período."/>
      <DataTable title="Preguntas recientes" headers={["Fecha","Pregunta anonimizada","Tema","Modo","Estado","Resultados","Recomendados","Tokens","Costo"]} rows={data.recent.map(item=>[new Date(item.created_at).toLocaleString("es-AR"),item.question_text,item.cluster_label,MODE_LABELS[item.mode]||item.mode,STATUS_LABELS[item.answer_status]||item.answer_status,number(item.result_count),number(item.recommended_count),number(item.total_tokens),money(item.estimated_cost_usd)])} empty="Todavía no hay preguntas registradas en este período."/>
      {totalPages>1&&<nav className="tags_destination_questions_pagination"><button type="button" disabled={page<=1||loading} onClick={()=>setPage(current=>Math.max(1,current-1))}>Anterior</button><span>Página {page} de {totalPages}</span><button type="button" disabled={page>=totalPages||loading} onClick={()=>setPage(current=>Math.min(totalPages,current+1))}>Siguiente</button></nav>}
    </>}
  </section>;
}

function StatsList({title,rows}){return <article className="tags_destination_questions_list"><h4>{title}</h4>{rows.length?<ol>{rows.slice(0,12).map((item,index)=><li key={`${item.label}-${index}`}><div><strong>{item.label}</strong>{item.detail&&<small>{item.detail}</small>}</div><b>{number(item.value)}</b></li>)}</ol>:<p>Sin datos para estos filtros.</p>}</article>}
function DataTable({title,headers,rows,empty}){return <article className="tags_destination_questions_table"><h4>{title}</h4><div><table><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex}>{cell}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={headers.length}>{empty}</td></tr>}</tbody></table></div></article>}
