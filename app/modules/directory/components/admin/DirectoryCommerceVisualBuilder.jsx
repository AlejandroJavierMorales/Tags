"use client";

import { useEffect, useMemo, useState } from "react";
import { FaCalendarDays, FaCommentDots, FaEye, FaEyeSlash, FaPen, FaRobot, FaStar, FaStore, FaUtensils } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import StoreBlockEditor from "@/app/modules/store/components/admin/builder/StoreBlockEditor";
import { getStoreModuleDefinition } from "@/app/modules/store/lib/storeModuleDefinitions";
import { RESTO_BUILDER_DEFINITIONS } from "@/app/modules/resto/lib/restoBuilderDefinitions";
import { getDirectoryModuleSettings } from "../../lib/directoryModuleSettings";
import DirectoryReviewsModuleEditor from "./DirectoryReviewsModuleEditor";
import DirectoryEventsModuleEditor from "./DirectoryEventsModuleEditor";
import DirectoryTurnosModuleEditor from "./DirectoryTurnosModuleEditor";
import "./DirectoryCommerceVisualBuilder.css";

const ALLOWED = {
  store: new Set(["store_topbar","store_header","store_hero","store_product_grid","store_trust_bar","store_featured_products"]),
  resto: new Set(["resto_topbar","resto_header","resto_hero","resto_service_info","resto_categories","resto_featured_products","resto_product_grid","resto_order_status","resto_service_actions","resto_trust_bar"])
};

const MODULE_META = {
  store: [FaStore, "Tienda", "Store embebido"],
  resto: [FaUtensils, "Gastronomía", "Resto embebido"],
  turnos: [FaCalendarDays, "Reservas", "Turnos dentro de la Web"],
  events: [FaCalendarDays, "Eventos", "Inscripciones y próximos eventos"],
  chatbot: [FaRobot, "Chatbot IA", "Asistente dentro de la Web"],
  reviewsInvitation: [FaCommentDots, "Invitar a reseñar", "Formulario de experiencia"],
  reviewsSlider: [FaStar, "Reseñas públicas", "Slider de opiniones visibles"]
};

async function payload(response){const text=await response.text();try{return text?JSON.parse(text):{};}catch{return {};}}

export default function DirectoryCommerceVisualBuilder({businessId,pageId,web,onReload,initialEditor=null,onEditorOpened}){
  const availableStore=web?.embeddedStore?.store||null;
  const availableResto=web?.embeddedResto?.store||null;
  const availableReviews=web?.embeddedReviews?.form||null;
  const availableTurnos=Boolean(web?.embeddedTurnos?.length);
  const availableEvents=Boolean(web?.availableModules?.events || web?.embeddedEvents?.length);
  const availableChatbot=Boolean(web?.aiChatConfig);
  const [active,setActive]=useState(availableStore?"store":"resto");
  const [data,setData]=useState({store:null,resto:null});
  const [selected,setSelected]=useState(null);
  const [reviewEditor,setReviewEditor]=useState(null);
  const [turnosEditor,setTurnosEditor]=useState(false);
  const [eventsEditor,setEventsEditor]=useState(false);
  const [busy,setBusy]=useState(false);
  const settings=getDirectoryModuleSettings(web?.page?.global_styles||{});
  const available={store:Boolean(availableStore),resto:Boolean(availableResto),turnos:availableTurnos,events:availableEvents,chatbot:availableChatbot,reviewsInvitation:Boolean(availableReviews),reviewsSlider:Boolean(availableReviews)};
  const orderedCodes=Object.keys(MODULE_META).filter(code=>available[code]).sort((a,b)=>Number(settings[a]?.sortOrder||0)-Number(settings[b]?.sortOrder||0));

  async function loadBuilders(){
    const tasks=[];
    if(availableStore)tasks.push(fetch(`/api/store/admin/builder/get?storeId=${availableStore.id}`,{cache:"no-store"}).then(async r=>["store",r,await payload(r)]));
    if(availableResto)tasks.push(fetch(`/api/resto/admin/builder/get?businessId=${businessId}`,{cache:"no-store"}).then(async r=>["resto",r,await payload(r)]));
    const results=await Promise.all(tasks),next={store:null,resto:null};
    for(const [code,response,result] of results){if(response.ok)next[code]=result;}
    setData(next);
  }

  useEffect(()=>{loadBuilders();},[businessId,availableStore?.id,availableResto?.id]);

  useEffect(()=>{
    if(active==="store"&&!availableStore&&availableResto)setActive("resto");
    if(active==="resto"&&!availableResto&&availableStore)setActive("store");
  },[active,availableStore,availableResto]);

  useEffect(()=>{
    if(initialEditor==="events"&&availableEvents){setEventsEditor(true);onEditorOpened?.();}
    if(initialEditor==="turnos"&&availableTurnos){setTurnosEditor(true);onEditorOpened?.();}
  },[initialEditor,availableEvents,availableTurnos,onEditorOpened]);

  const blocks=useMemo(()=>{
    const source=data[active];
    return (source?.blocks||[]).filter(block=>ALLOWED[active]?.has(block.block_type)).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
  },[data,active]);

  async function saveModules(next){
    setBusy(true);
    try{
      const response=await fetch("/api/directory/client/modules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,pageId,modules:next})});
      const result=await payload(response);if(!response.ok)throw new Error(result.error||"No se pudo guardar");
      await onReload();await showAlert({title:"Módulos actualizados",icon:"success",timer:1000});
    }catch(error){await showAlert({title:"No se pudo guardar",text:error.message,icon:"error"});}finally{setBusy(false);}
  }

  function toggleModule(code){saveModules({...settings,[code]:{...settings[code],enabled:!settings[code].enabled}});}
  function saveReviewContent(code,content){setReviewEditor(null);saveModules({...settings,[code]:{...settings[code],content}});}

  async function toggleBlock(block){
    setBusy(true);
    try{
      const endpoint=active==="store"?"/api/store/admin/builder/blocks/update":"/api/resto/admin/builder/blocks/update";
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,sectionId:block.section_id,blockId:block.id,block_type:block.block_type,title:block.title,content_json:block.content_json||{},styles_json:block.styles_json||{},animation_json:block.animation_json||{},is_visible:!Number(block.is_visible)})});
      const result=await payload(response);if(!response.ok)throw new Error(result.error||"No se pudo actualizar el bloque");
      await loadBuilders();await onReload();
    }catch(error){await showAlert({title:"No se pudo actualizar",text:error.message,icon:"error"});}finally{setBusy(false);}
  }

  if(!available.store&&!available.resto&&!available.turnos&&!available.events&&!available.chatbot&&!available.reviewsInvitation)return <div className="tags_directory_commerce_empty"><h2>Módulos visuales</h2><p>Cuando el negocio active una funcionalidad pública, aparecerá aquí para incorporarla a su Web.</p></div>;
  const source=data[active];
  return <div className="tags_directory_commerce_builder">
    {busy&&<div className="tags_directory_commerce_busy"><TagsSpinner /></div>}
    <header><div><h2>Módulos incorporados</h2><p>Configurá la presentación dentro de la Web. Su posición se ordena junto con las demás secciones desde Contenido.</p></div></header>
    <div className="tags_directory_commerce_cards">
      {orderedCodes.map(code=>{const [Icon,title,subtitle]=MODULE_META[code];return <article className={settings[code].enabled?"is_enabled":""} key={code}>
        <Icon /><div><strong>{title}</strong><small>{subtitle}</small></div>
        <div className="tags_directory_module_order">{code==="turnos"&&<button type="button" onClick={()=>setTurnosEditor(true)} title="Editar Reservas"><FaPen /></button>}{code==="events"&&<button type="button" onClick={()=>setEventsEditor(true)} title="Editar Eventos"><FaPen /></button>}{code.startsWith("reviews")&&<button type="button" onClick={()=>setReviewEditor(code)} title="Editar textos"><FaPen /></button>}</div>
        <label><input type="checkbox" checked={settings[code].enabled} onChange={()=>toggleModule(code)} />Mostrar en la Web</label>
      </article>})}
    </div>
    {(available.store||available.resto)&&<>
      <nav className="tags_directory_commerce_tabs">
        {available.store&&<button type="button" className={active==="store"?"active":""} onClick={()=>setActive("store")}><FaStore /> Tienda</button>}
        {available.resto&&<button type="button" className={active==="resto"?"active":""} onClick={()=>setActive("resto")}><FaUtensils /> Gastronomía</button>}
      </nav>
      {!source?<div className="tags_directory_commerce_loading"><TagsSpinner /></div>:<div className="tags_directory_commerce_blocks">{blocks.map(block=><article className={Number(block.is_visible)?"":"is_hidden"} key={`${active}-${block.id}`}><div><small>{block.block_type}</small><strong>{block.title||"Bloque visual"}</strong></div><nav><button type="button" onClick={()=>toggleBlock(block)}>{Number(block.is_visible)?<FaEye />:<FaEyeSlash />}{Number(block.is_visible)?"Visible":"Oculto"}</button><button type="button" onClick={()=>setSelected({module:active,block})}><FaPen /> Editar diseño</button></nav></article>)}</div>}
    </>}
    {selected&&<StoreBlockEditor businessId={businessId} entity={{name:(selected.module==="store"?availableStore:availableResto)?.name||"Negocio",description:(selected.module==="store"?availableStore:availableResto)?.description||"",categories:data[selected.module]?.categories||[],products:data[selected.module]?.products||[]}} section={(data[selected.module]?.sections||[]).find(section=>Number(section.id)===Number(selected.block.section_id))} block={selected.block} moduleDefinition={selected.module==="store"?getStoreModuleDefinition(selected.block.block_type):(()=>{const module=(data.resto?.modules||[]).find(item=>item.type===selected.block.block_type)||{};return {...module,name:module.name||module.label,editor:RESTO_BUILDER_DEFINITIONS[selected.block.block_type]};})()} updateEndpoint={selected.module==="store"?"/api/store/admin/builder/blocks/update":"/api/resto/admin/builder/blocks/update"} onClose={()=>setSelected(null)} onBlockUpdated={async updated=>{setSelected(current=>current?{...current,block:{...current.block,...updated}}:current);await loadBuilders();await onReload();}} />}
    {reviewEditor&&<DirectoryReviewsModuleEditor code={reviewEditor} value={settings[reviewEditor]} onClose={()=>setReviewEditor(null)} onSave={content=>saveReviewContent(reviewEditor,content)} />}
    {turnosEditor&&<DirectoryTurnosModuleEditor value={settings.turnos} apps={web?.embeddedTurnos||[]} onClose={()=>setTurnosEditor(false)} onSave={content=>{setTurnosEditor(false);saveReviewContent("turnos",content);}} />}
    {eventsEditor&&<DirectoryEventsModuleEditor value={settings.events} onClose={()=>setEventsEditor(false)} onSave={content=>{setEventsEditor(false);saveReviewContent("events",content);}} />}
  </div>;
}
