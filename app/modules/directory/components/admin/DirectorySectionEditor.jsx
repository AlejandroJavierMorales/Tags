"use client";

import { useState } from "react";
import { FaArrowDown, FaArrowUp, FaTrash, FaXmark } from "react-icons/fa6";
import MediaUploader from "@/app/components/MediaUploader";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./DirectorySectionEditor.css";

function kindOf(section) {
  const type = section?.blocks?.[0]?.type;
  return section?.settings_json?.directoryBaseSlot || (type === "gallery" ? "gallery" : type === "contact_info" ? "contact" : type === "catalog" || section?.type === "catalog" ? "catalog" : "web");
}

async function payload(response) { const text = await response.text(); try { return text ? JSON.parse(text) : {}; } catch { return {}; } }

export default function DirectorySectionEditor({ businessId, pageId, section, onClose, onSaved }) {
  const block = section.blocks?.[0];
  const kind = kindOf(section);
  const maxImages = kind === "gallery" ? 8 : 10;
  const [title, setTitle] = useState(section.title || "");
  const [content, setContent] = useState(block?.content_json || {});
  const [styles, setStyles] = useState(block?.styles_json || {});
  const [busy, setBusy] = useState(false);
  const images = Array.isArray(content.images) ? content.images.slice(0,maxImages) : [];
  const update = (field,value) => setContent(current=>({...current,[field]:value}));
  const updateTypography = (part,field,value) => setStyles(current=>({...current,typography:{...(current.typography||{}),[part]:{...(current.typography?.[part]||{}),[field]:value}}}));
  const moveImage = (index,direction) => { const next=[...images],target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];update("images",next); };

  async function save(closeAfter) {
    if (!block?.id) return;
    setBusy(true);
    try {
      const sectionResponse = await fetch("/api/qr-page/sections/update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,pageId,sectionId:section.id,type:section.type,title:title.trim()||section.title,is_visible:section.is_visible,settings_json:section.settings_json||{},styles_json:section.styles_json||{}})});
      const sectionPayload=await payload(sectionResponse);if(!sectionResponse.ok)throw new Error(sectionPayload.error||"No se pudo guardar la sección");
      const blockResponse = await fetch("/api/qr-page/blocks/update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,pageId,sectionId:section.id,blockId:block.id,type:block.type,is_visible:block.is_visible,content_json:{...content,images:images.slice(0,maxImages),...(kind==="gallery"?{maxImages:8}:{})},styles_json:styles})});
      const blockPayload=await payload(blockResponse);if(!blockResponse.ok)throw new Error(blockPayload.error||"No se pudo guardar el bloque");
      await onSaved();
      await showAlert({title:"Cambios guardados",icon:"success",timer:1200});
      if(closeAfter)onClose();
    } catch(error){await showAlert({title:"No se pudo guardar",text:error.message,icon:"error"});} finally{setBusy(false);}
  }

  return <div className="tags_directory_section_editor_overlay" role="dialog" aria-modal="true">
    <div className="tags_directory_section_editor">
      {busy&&<div className="tags_directory_section_editor_busy"><TagsSpinner /></div>}
      <header><div><small>EDITOR DE BLOQUE</small><h2>{kind==="presentation"?"Presentación":kind==="gallery"?"Galería":kind==="catalog"?"Catálogo":kind==="contact"?"Contacto":"Sección web"}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><FaXmark /></button></header>
      <div className="tags_directory_section_editor_body">
        <section><h3>Contenido</h3><div className="tags_directory_section_editor_grid">
          <label>Nombre interno<input value={title} onChange={event=>setTitle(event.target.value)} /></label>
          <label>Texto superior<input value={content.eyebrow||""} onChange={event=>update("eyebrow",event.target.value)} placeholder={kind==="catalog"?"CATÁLOGO":kind==="gallery"?"GALERÍA":""} /></label>
          <label>Título visible<input value={content.title||""} onChange={event=>update("title",event.target.value)} /></label>
          <label>Subtítulo<input value={content.subtitle||""} onChange={event=>update("subtitle",event.target.value)} /></label>
          {["web","presentation","catalog"].includes(kind)&&<><label className="wide">Texto destacado<textarea value={content.highlightedText||""} onChange={event=>update("highlightedText",event.target.value)} /></label><label className="wide">Párrafos <small>Separalos con una línea vacía.</small><textarea value={(Array.isArray(content.paragraphs)?content.paragraphs:[]).join("\n\n")} onChange={event=>update("paragraphs",event.target.value.split(/\n\s*\n/))} /></label></>}
          {kind==="catalog"&&<><label>Texto del buscador<input value={content.searchPlaceholder||""} onChange={event=>update("searchPlaceholder",event.target.value)} placeholder="Buscar por producto o categoría" /></label><label>Opción todas las categorías<input value={content.allCategoriesLabel||""} onChange={event=>update("allCategoriesLabel",event.target.value)} placeholder="Todos" /></label></>}
          {kind==="contact"&&<><label>Etiqueta WhatsApp<input value={content.whatsappLabel||""} onChange={event=>update("whatsappLabel",event.target.value)} /></label><label>Mensaje inicial de WhatsApp<input value={content.whatsappMessage||""} onChange={event=>update("whatsappMessage",event.target.value)} /></label><label>Etiqueta teléfono<input value={content.phoneLabel||""} onChange={event=>update("phoneLabel",event.target.value)} /></label><label>Etiqueta email<input value={content.emailLabel||""} onChange={event=>update("emailLabel",event.target.value)} /></label><label>Etiqueta dirección<input value={content.addressLabel||""} onChange={event=>update("addressLabel",event.target.value)} /></label><label>Texto Cómo llegar<input value={content.directionsAction||""} onChange={event=>update("directionsAction",event.target.value)} /></label><div className="wide tags_directory_section_editor_checks">{[["showWhatsapp","WhatsApp"],["showPhone","Teléfono"],["showEmail","Email"],["showAddress","Dirección"],["showWebsite","Sitio web"]].map(([field,label])=><label key={field}><input type="checkbox" checked={content[field]!==false} onChange={event=>update(field,event.target.checked)} />{label}</label>)}</div></>}
        </div></section>
        {["web","presentation","gallery"].includes(kind)&&<section><div className="tags_directory_section_editor_section_heading"><div><h3>Imágenes</h3><p>{images.length} de {maxImages}</p></div>{images.length<maxImages&&<MediaUploader businessId={businessId} value="" module="directory" variant="gallery" entityId={block.id} accept="image/*" label="Agregar imagen" onChange={media=>{if(media?.url)update("images",[...images,{url:media.url,alt:"",storagePath:media.storagePath||""}].slice(0,maxImages));}} />}</div><label>Presentación<select value={content.imageLayout==="carousel"?"carousel":"grid"} onChange={event=>update("imageLayout",event.target.value)}><option value="grid">Grilla</option><option value="carousel">Carrusel ancho completo</option></select></label><div className="tags_directory_section_editor_images">{images.map((image,index)=><article key={`${image.url}-${index}`}><img src={image.url} alt={image.alt||""} /><input value={image.alt||""} placeholder="Texto alternativo" onChange={event=>update("images",images.map((item,itemIndex)=>itemIndex===index?{...item,alt:event.target.value}:item))} /><div><button type="button" onClick={()=>moveImage(index,-1)} disabled={index===0}><FaArrowUp /></button><button type="button" onClick={()=>moveImage(index,1)} disabled={index===images.length-1}><FaArrowDown /></button><button type="button" className="danger" onClick={()=>update("images",images.filter((_,itemIndex)=>itemIndex!==index))}><FaTrash /></button></div></article>)}</div></section>}
        <section><h3>Diseño del bloque</h3><div className="tags_directory_section_editor_grid"><label>Alineación<select value={styles.alignment||"left"} onChange={event=>setStyles(current=>({...current,alignment:event.target.value}))}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label></div><div className="tags_directory_section_typography">{[["title","Título"],["subtitle","Subtítulo"],["highlight","Texto destacado"],["text","Párrafos"]].map(([part,label])=><div key={part}><strong>{label}</strong><label>Tamaño<select value={styles.typography?.[part]?.fontSize||""} onChange={event=>updateTypography(part,"fontSize",event.target.value)}><option value="">Tema</option><option value="14px">14 px</option><option value="16px">16 px</option><option value="18px">18 px</option><option value="24px">24 px</option><option value="32px">32 px</option><option value="40px">40 px</option><option value="48px">48 px</option></select></label><label>Peso<select value={styles.typography?.[part]?.fontWeight||""} onChange={event=>updateTypography(part,"fontWeight",event.target.value)}><option value="">Tema</option><option value="400">Normal</option><option value="500">Medio</option><option value="700">Negrita</option><option value="900">Extra negrita</option></select></label><label>Color<input type="color" value={styles.typography?.[part]?.color||"#173a2d"} onChange={event=>updateTypography(part,"color",event.target.value)} /></label></div>)}</div></section>
      </div>
      <footer><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button type="button" onClick={()=>save(false)}>Guardar</button><button type="button" onClick={()=>save(true)}>Guardar y salir</button></footer>
    </div>
  </div>;
}
