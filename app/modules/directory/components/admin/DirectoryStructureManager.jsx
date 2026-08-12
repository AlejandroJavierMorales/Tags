"use client";

import { useState } from "react";
import { FaArrowDown, FaArrowUp, FaImages, FaLayerGroup, FaPen, FaPlus, FaStore, FaTrash, FaUser, FaAddressBook } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import DirectorySectionEditor from "./DirectorySectionEditor";
import "./DirectoryStructureManager.css";

async function responsePayload(response){const text=await response.text();try{return text?JSON.parse(text):{};}catch{return {};}}
function kindOf(section){const type=section?.blocks?.[0]?.type;return section?.settings_json?.directoryBaseSlot||(type==="gallery"?"gallery":type==="contact_info"?"contact":type==="catalog"||section.type==="catalog"?"catalog":"web");}
const META={presentation:[FaUser,"Presentación","Título, textos destacados, párrafos e imágenes."],gallery:[FaImages,"Galería","Hasta 8 imágenes con ampliación."],catalog:[FaStore,"Catálogo","Productos, categorías, búsqueda y consultas."],contact:[FaAddressBook,"Contacto","Datos compartidos, etiquetas y acciones."],web:[FaLayerGroup,"Sección web","Contenido libre con textos e imágenes."]};

export default function DirectoryStructureManager({businessId,pageId,sections=[],onReload}){
  const [busy,setBusy]=useState(false),[editing,setEditing]=useState(null);
  const ordered=[...sections].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
  async function post(url,body){const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,pageId,...body})});const payload=await responsePayload(response);if(!response.ok)throw new Error(payload.error||"No se pudo completar la operación");return payload;}
  async function run(action,{success}={}){setBusy(true);try{await action();await onReload();if(success)await showAlert({title:success,icon:"success",timer:1100});}catch(error){await showAlert({title:"No se pudo completar",text:error.message,icon:"error"});}finally{setBusy(false);}}
  function move(index,direction){const target=index+direction;if(target<0||target>=ordered.length)return;const next=[...ordered];[next[index],next[target]]=[next[target],next[index]];run(()=>post("/api/qr-page/sections/reorder",{sections:next.map((section,position)=>({id:section.id,sort_order:position+1}))}));}
  async function remove(section){if(kindOf(section)!=="web")return;const confirmed=await showAlert({title:"¿Eliminar esta sección?",text:"Se eliminarán también sus textos e imágenes.",icon:"warning",showCancelButton:true,confirmButtonText:"Eliminar",cancelButtonText:"Cancelar"});if(!confirmed)return;run(()=>post("/api/qr-page/sections/delete",{sectionId:section.id}),{success:"Sección eliminada"});}
  function add(){run(async()=>{const created=await post("/api/qr-page/sections/create",{type:"content",title:"Nueva sección",settings_json:{directoryBaseSlot:"web"},styles_json:{}});await post("/api/qr-page/blocks/create",{sectionId:created.sectionId,type:"web_section",content_json:{eyebrow:"",title:"Nueva sección",subtitle:"",highlightedText:"",paragraphs:["Escribí aquí el contenido de esta sección."],images:[],imageLayout:"grid"},styles_json:{alignment:"left"}});},{success:"Sección creada"});}
  return <div className="tags_directory_structure">
    {busy&&<div className="tags_directory_structure_busy"><TagsSpinner /></div>}
    <header><div><h2>Estructura de la Web</h2><p>Ordená, editá, mostrá u ocultá cada bloque. Los cambios se reflejan en la misma ficha pública.</p></div><button type="button" onClick={add}><FaPlus /> Agregar sección</button></header>
    <div className="tags_directory_structure_list">{ordered.map((section,index)=>{const kind=kindOf(section),[Icon,label,description]=META[kind]||META.web;return <article className={Number(section.is_visible)?"":"is_hidden"} key={section.id}>
      <div className="tags_directory_structure_identity"><span><Icon /></span><div><small>{label}</small><h3>{section.title||label}</h3><p>{description}</p></div></div>
      <div className="tags_directory_structure_actions"><button type="button" onClick={()=>move(index,-1)} disabled={index===0} title="Subir"><FaArrowUp /><span>Subir</span></button><button type="button" onClick={()=>move(index,1)} disabled={index===ordered.length-1} title="Bajar"><FaArrowDown /><span>Bajar</span></button><button type="button" onClick={()=>setEditing(section)}><FaPen /><span>Editar</span></button>{kind==="web"&&<button type="button" className="danger" onClick={()=>remove(section)}><FaTrash /><span>Eliminar</span></button>}</div>
    </article>;})}</div>
    {editing&&<DirectorySectionEditor businessId={businessId} pageId={pageId} section={editing} onClose={()=>setEditing(null)} onSaved={onReload} />}
  </div>;
}
