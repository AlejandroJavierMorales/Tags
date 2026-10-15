"use client";

import { useEffect, useState } from "react";
import { FaArrowDown, FaArrowUp, FaTrash, FaXmark } from "react-icons/fa6";
import MediaUploader from "@/app/components/MediaUploader";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./DirectorySectionEditor.css";

function kindOf(section) {
  const type = section?.blocks?.[0]?.type;
  const sectionType = String(section?.type || "").toLowerCase();
  const sectionTitle = normalizedText(section?.title);
  const configuredSlot = section?.settings_json?.directoryBaseSlot;
  if (configuredSlot) return configuredSlot === "legacy-web-section" ? "web" : configuredSlot;
  return type === "gallery" || sectionType === "gallery" ? "gallery"
      : type === "contact_info" ? "contact"
        : type === "catalog" || sectionType === "catalog" ? "catalog"
          : type === "benefits" ? "benefits"
            : type === "loyalty_program" ? "loyalty"
              : sectionType === "hero" || ["presentacion", "presentación"].includes(sectionTitle) ? "presentation"
                : "web";
}

async function payload(response) { const text = await response.text(); try { return text ? JSON.parse(text) : {}; } catch { return {}; } }

function normalizedText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function contentObject(value) {
  if (value && typeof value === "object") return value;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch {}
  }
  return {};
}

function legacyImage(content) {
  const source = contentObject(content);
  const url = source.url || source.src || source.imageUrl || source.image_url || source.image?.url;
  return url ? { url, alt: source.alt || source.alt_text || source.imageAlt || source.image?.alt || "", storagePath: source.storagePath || "" } : null;
}

function normalizedImage(value) {
  if (typeof value === "string") return value.trim() ? { url: value.trim(), alt: "", storagePath: "" } : null;
  if (!value || typeof value !== "object") return null;
  const url = value.url || value.src || value.imageUrl || value.image_url || value.image?.url;
  return url ? { ...value, url, alt: value.alt || value.alt_text || value.imageAlt || value.image?.alt || "", storagePath: value.storagePath || "" } : null;
}

function editableBlock(section, kind) {
  const blocks = Array.isArray(section?.blocks) ? section.blocks : [];
  const expectedType = kind === "gallery" ? "gallery" : ["web", "presentation"].includes(kind) ? "web_section" : null;
  return blocks.find(item => item.type === expectedType) || blocks[0];
}

function editorContent(section, block, kind, fallback) {
  const blockContent = contentObject(block?.content_json);
  const current = blockContent && typeof blockContent === "object" ? blockContent : {};
  const allBlocks = Array.isArray(section?.blocks) ? section.blocks : [];
  const images = [];
  const imageKeys = new Set();
  const appendImage = image => {
    const normalized = normalizedImage(image);
    if (!normalized?.url || imageKeys.has(normalized.url)) return;
    imageKeys.add(normalized.url);
    images.push(normalized);
  };
  allBlocks.forEach(item => {
    const itemContent = contentObject(item?.content_json);
    (Array.isArray(itemContent.images) ? itemContent.images : []).forEach(appendImage);
    appendImage(legacyImage(itemContent));
  });
  if (kind === "gallery") {
    (Array.isArray(fallback?.images) ? fallback.images : []).forEach(appendImage);
  }

  const paragraphs = (Array.isArray(current.paragraphs) ? current.paragraphs : [])
    .map(item => typeof item === "string" ? item : item?.text)
    .filter(Boolean);
  const knownParagraphs = new Set(paragraphs.map(normalizedText));
  allBlocks.forEach(item => {
    const itemContent = contentObject(item?.content_json);
    const candidates = [itemContent.text, itemContent.description, itemContent.body];
    candidates.forEach(value => {
      const text = String(value || "").trim();
      const key = normalizedText(text);
      if (text && !knownParagraphs.has(key)) {
        knownParagraphs.add(key);
        paragraphs.push(text);
      }
    });
  });

  const migrated = {
    ...current,
    ...(kind === "gallery" ? {
      eyebrow: Object.prototype.hasOwnProperty.call(current, "eyebrow") ? current.eyebrow : "GALERÍA",
      title: Object.prototype.hasOwnProperty.call(current, "title") ? current.title : `Conocé ${fallback?.providerName || "nuestro espacio"}`
    } : {}),
    paragraphs,
    images: images.slice(0, 12)
  };
  if (kind !== "presentation" || current.contentManaged === true) return migrated;
  const owns = field => Object.prototype.hasOwnProperty.call(current, field);
  const highlightedText = owns("highlightedText") ? current.highlightedText || "" : fallback?.highlightedText || "";
  const description = String(fallback?.description || "").trim();
  const known = new Set([highlightedText, ...paragraphs].map(normalizedText).filter(Boolean));
  if (description && !known.has(normalizedText(description))) paragraphs.push(description);
  return {
    ...migrated,
    title: owns("title") ? current.title || "" : fallback?.providerName || "",
    highlightedText,
    paragraphs
  };
}

export default function DirectorySectionEditor({ businessId, pageId, section, contentFallback, onClose, onSaved }) {
  const kind = kindOf(section);
  const [block, setBlock] = useState(() => editableBlock(section, kind));
  const maxImages = 12;
  const [title, setTitle] = useState(section.title || "");
  const [content, setContent] = useState(() => editorContent(section, block, kind, contentFallback));
  const [styles, setStyles] = useState(block?.styles_json || {});
  const [busy, setBusy] = useState(false);
  const [loadingContent, setLoadingContent] = useState(true);
  const images = Array.isArray(content.images) ? content.images.slice(0,maxImages) : [];
  const update = (field,value) => setContent(current=>({...current,[field]:value}));
  const updateTypography = (part,field,value) => setStyles(current=>({...current,typography:{...(current.typography||{}),[part]:{...(current.typography?.[part]||{}),[field]:value}}}));
  const moveImage = (index,direction) => { const next=[...images],target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];update("images",next); };

  useEffect(() => {
    let active = true;
    fetch(`/api/directory/client/modules?businessId=${businessId}&pageId=${pageId}&sectionId=${section.id}`, { cache: "no-store" })
      .then(async response => {
        const result = await payload(response);
        if (!response.ok) throw new Error(result.error || "No se pudo cargar la sección");
        return result;
      })
      .then(result => {
        if (!active || !result?.section) return;
        const freshSection = result.section;
        const freshKind = kindOf(freshSection);
        const freshBlock = editableBlock(freshSection, freshKind);
        const mediaImages = (result.directoryMedia || []).map(item => ({ url: item.url, alt: item.alt_text || "" }));
        setBlock(freshBlock);
        setTitle(freshSection.title || "");
        setContent(editorContent(freshSection, freshBlock, freshKind, { ...contentFallback, images: mediaImages }));
        setStyles(freshBlock?.styles_json || {});
      })
      .catch(error => showAlert({ title: "No se pudo cargar el contenido", text: error.message, icon: "error" }))
      .finally(() => { if (active) setLoadingContent(false); });
    return () => { active = false; };
  }, [businessId, pageId, section.id]);

  async function save(closeAfter) {
    if (!block?.id) return;
    setBusy(true);
    try {
      const canonicalType = kind === "gallery" ? "gallery" : ["web","presentation"].includes(kind) ? "web_section" : block.type;
      const sectionResponse = await fetch("/api/qr-page/sections/update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,pageId,sectionId:section.id,type:section.type,title:title.trim()||section.title,is_visible:section.is_visible,settings_json:{...(section.settings_json||{}),...(["gallery","presentation"].includes(kind)?{directoryBaseSlot:kind}:{})},styles_json:section.styles_json||{}})});
      const sectionPayload=await payload(sectionResponse);if(!sectionResponse.ok)throw new Error(sectionPayload.error||"No se pudo guardar la sección");
      const blockResponse = await fetch("/api/qr-page/blocks/update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,pageId,sectionId:section.id,blockId:block.id,type:canonicalType,is_visible:block.is_visible,content_json:{...content,...(kind==="presentation"?{contentManaged:true}:{}),images:images.slice(0,maxImages),...(kind==="gallery"?{maxImages:12}:{})},styles_json:styles})});
      const blockPayload=await payload(blockResponse);if(!blockResponse.ok)throw new Error(blockPayload.error||"No se pudo guardar el bloque");
      await onSaved();
      await showAlert({title:"Cambios guardados",icon:"success",timer:1200});
      if(closeAfter)onClose();
    } catch(error){await showAlert({title:"No se pudo guardar",text:error.message,icon:"error"});} finally{setBusy(false);}
  }

  return <div className="tags_directory_section_editor_overlay" role="dialog" aria-modal="true">
    <div className="tags_directory_section_editor">
      {(busy||loadingContent)&&<div className="tags_directory_section_editor_busy"><TagsSpinner /></div>}
      <header><div><small>EDITOR DE BLOQUE</small><h2>{kind==="presentation"?"Presentación":kind==="gallery"?"Galería":kind==="catalog"?"Catálogo":kind==="contact"?"Contacto":kind==="benefits"?"Beneficios":kind==="loyalty"?"Fidelización":"Sección web"}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><FaXmark /></button></header>
      <div className="tags_directory_section_editor_body">
        <section><h3>Contenido</h3><div className="tags_directory_section_editor_grid">
          <label>Nombre interno<input value={title} onChange={event=>setTitle(event.target.value)} /></label>
          <label>Texto superior<input value={content.eyebrow||""} onChange={event=>update("eyebrow",event.target.value)} placeholder={kind==="catalog"?"CATÁLOGO":kind==="gallery"?"GALERÍA":""} /></label>
          <label>Título visible<input value={content.title||""} onChange={event=>update("title",event.target.value)} /></label>
          <label>Subtítulo<input value={content.subtitle||""} onChange={event=>update("subtitle",event.target.value)} /></label>
          {["web","presentation","catalog"].includes(kind)&&<><label className="wide">Texto destacado<textarea value={content.highlightedText||""} onChange={event=>update("highlightedText",event.target.value)} /></label><label className="wide">Párrafos <small>Separalos con una línea vacía.</small><textarea value={(Array.isArray(content.paragraphs)?content.paragraphs:[]).join("\n\n")} onChange={event=>update("paragraphs",event.target.value.split(/\n\s*\n/))} /></label></>}
          {kind==="catalog"&&<><label>Texto del buscador<input value={content.searchPlaceholder||""} onChange={event=>update("searchPlaceholder",event.target.value)} placeholder="Buscar por producto o categoría" /></label><label>Opción todas las categorías<input value={content.allCategoriesLabel||""} onChange={event=>update("allCategoriesLabel",event.target.value)} placeholder="Todos" /></label></>}
          {kind==="loyalty"&&<><label>Botón para adherirse<input value={content.joinLabel||""} onChange={event=>update("joinLabel",event.target.value)} placeholder="Quiero participar" /></label><label>Botón para miembros<input value={content.memberLabel||""} onChange={event=>update("memberLabel",event.target.value)} placeholder="Ver mi progreso" /></label><label>Cantidad de recompensas<select value={Number(content.rewardLimit||3)} onChange={event=>update("rewardLimit",Number(event.target.value))}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={6}>6</option></select></label></>}
          {kind==="contact"&&<><label>Etiqueta WhatsApp<input value={content.whatsappLabel||""} onChange={event=>update("whatsappLabel",event.target.value)} /></label><label>Mensaje inicial de WhatsApp<input value={content.whatsappMessage||""} onChange={event=>update("whatsappMessage",event.target.value)} /></label><label>Etiqueta teléfono<input value={content.phoneLabel||""} onChange={event=>update("phoneLabel",event.target.value)} /></label><label>Etiqueta email<input value={content.emailLabel||""} onChange={event=>update("emailLabel",event.target.value)} /></label><label>Etiqueta dirección<input value={content.addressLabel||""} onChange={event=>update("addressLabel",event.target.value)} /></label><label>Texto Cómo llegar<input value={content.directionsAction||""} onChange={event=>update("directionsAction",event.target.value)} /></label><div className="wide tags_directory_section_editor_checks">{[["showWhatsapp","WhatsApp"],["showPhone","Teléfono"],["showEmail","Email"],["showAddress","Dirección"],["showWebsite","Sitio web"]].map(([field,label])=><label key={field}><input type="checkbox" checked={content[field]!==false} onChange={event=>update(field,event.target.checked)} />{label}</label>)}</div></>}
        </div></section>
        {["web","presentation","gallery"].includes(kind)&&<section><div className="tags_directory_section_editor_section_heading"><div><h3>Imágenes</h3><p>{images.length} de {maxImages}</p></div>{images.length<maxImages&&<MediaUploader businessId={businessId} value="" module="directory" variant="gallery" entityId={block.id} accept="image/*" label="Agregar imagen" onChange={media=>{if(media?.url)update("images",[...images,{url:media.url,alt:"",storagePath:media.storagePath||""}].slice(0,maxImages));}} />}</div><label>Presentación<select value={content.imageLayout==="carousel"?"carousel":"grid"} onChange={event=>update("imageLayout",event.target.value)}><option value="grid">Grilla</option><option value="carousel">Carrusel ancho completo</option></select></label><div className="tags_directory_section_editor_images">{images.map((image,index)=><article key={`${image.url}-${index}`}><img src={image.url} alt={image.alt||""} /><input value={image.alt||""} placeholder="Texto alternativo" onChange={event=>update("images",images.map((item,itemIndex)=>itemIndex===index?{...item,alt:event.target.value}:item))} /><div><button type="button" onClick={()=>moveImage(index,-1)} disabled={index===0}><FaArrowUp /></button><button type="button" onClick={()=>moveImage(index,1)} disabled={index===images.length-1}><FaArrowDown /></button><button type="button" className="danger" onClick={()=>update("images",images.filter((_,itemIndex)=>itemIndex!==index))}><FaTrash /></button></div></article>)}</div></section>}
        <section><h3>Diseño del bloque</h3><div className="tags_directory_section_editor_grid"><label>Alineación<select value={styles.alignment||"left"} onChange={event=>setStyles(current=>({...current,alignment:event.target.value}))}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label></div><div className="tags_directory_section_typography">{[["title","Título"],["subtitle","Subtítulo"],["highlight","Texto destacado"],["text","Párrafos"]].map(([part,label])=><div key={part}><strong>{label}</strong><label>Tamaño<select value={styles.typography?.[part]?.fontSize||""} onChange={event=>updateTypography(part,"fontSize",event.target.value)}><option value="">Tema</option><option value="14px">14 px</option><option value="16px">16 px</option><option value="18px">18 px</option><option value="24px">24 px</option><option value="32px">32 px</option><option value="40px">40 px</option><option value="48px">48 px</option></select></label><label>Peso<select value={styles.typography?.[part]?.fontWeight||""} onChange={event=>updateTypography(part,"fontWeight",event.target.value)}><option value="">Tema</option><option value="400">Normal</option><option value="500">Medio</option><option value="700">Negrita</option><option value="900">Extra negrita</option></select></label><label>Color<input type="color" value={styles.typography?.[part]?.color||"#173a2d"} onChange={event=>updateTypography(part,"color",event.target.value)} /></label></div>)}</div></section>
      </div>
      <footer><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button type="button" onClick={()=>save(false)}>Guardar</button><button type="button" onClick={()=>save(true)}>Guardar y salir</button></footer>
    </div>
  </div>;
}
