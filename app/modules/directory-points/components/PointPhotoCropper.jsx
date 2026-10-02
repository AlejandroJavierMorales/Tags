"use client";

import { useEffect, useRef, useState } from "react";
import { FaArrowsUpDownLeftRight, FaCamera, FaCheck, FaImage } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";
import "./PointPhotoCropper.css";

const clamp = value => Math.max(0,Math.min(100,value));

export default function PointPhotoCropper({ value, entityId = "draft", onChange }) {
  const [source,setSource]=useState("");const [natural,setNatural]=useState({width:0,height:0});const [focus,setFocus]=useState({x:50,y:50});const [zoom,setZoom]=useState(1);const [uploading,setUploading]=useState(false);const imageRef=useRef(null);const dragRef=useRef(null);
  useEffect(()=>()=>{if(source)URL.revokeObjectURL(source);},[source]);

  function choose(event){const file=event.target.files?.[0];event.target.value="";if(!file)return;if(!["image/jpeg","image/png","image/webp","image/avif"].includes(file.type))return showAlert({title:"Imagen no válida",text:"Usá una fotografía JPG, PNG, WEBP o AVIF.",icon:"warning"});if(file.size>12*1024*1024)return showAlert({title:"Imagen demasiado pesada",text:"El archivo original no puede superar 12 MB.",icon:"warning"});if(source)URL.revokeObjectURL(source);setSource(URL.createObjectURL(file));setFocus({x:50,y:50});setZoom(1);}
  function pointerDown(event){event.currentTarget.setPointerCapture(event.pointerId);dragRef.current={clientX:event.clientX,clientY:event.clientY,focus};}
  function pointerMove(event){if(!dragRef.current||!natural.width)return;const rect=event.currentTarget.getBoundingClientRect(),dx=event.clientX-dragRef.current.clientX,dy=event.clientY-dragRef.current.clientY;setFocus({x:clamp(dragRef.current.focus.x-dx/rect.width*100),y:clamp(dragRef.current.focus.y-dy/rect.height*100)});}
  function pointerUp(){dragRef.current=null;}
  const ratio=natural.width&&natural.height?natural.width/natural.height:1,baseWidth=ratio>=1?ratio*100:100,baseHeight=ratio>=1?100:100/ratio,previewWidth=baseWidth*zoom,previewHeight=baseHeight*zoom,previewLeft=(100-previewWidth)*(focus.x/100),previewTop=(100-previewHeight)*(focus.y/100);

  async function upload(){if(!imageRef.current||!natural.width)return;setUploading(true);try{const size=1200,canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;const scale=Math.max(size/natural.width,size/natural.height)*zoom,drawWidth=natural.width*scale,drawHeight=natural.height*scale,x=(size-drawWidth)*(focus.x/100),y=(size-drawHeight)*(focus.y/100);canvas.getContext("2d",{alpha:false}).drawImage(imageRef.current,x,y,drawWidth,drawHeight);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",.9));if(!blob)throw new Error("No se pudo preparar la fotografía");const form=new FormData();form.append("businessId","platform");form.append("module","directory");form.append("variant","directory_point");form.append("entityId",String(entityId||"draft"));form.append("fileName","point");form.append("file",new File([blob],`punto-${Date.now()}.webp`,{type:"image/webp"}));const response=await fetch("/api/qr-page/media/upload",{method:"POST",body:form}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"No se pudo subir la fotografía");onChange?.(data.media);setSource("");await showAlert({title:"Fotografía preparada",text:"Se guardó cuadrada y optimizada en WebP.",icon:"success",timer:1600});}catch(error){await showAlert({title:"No se pudo cargar",text:error.message,icon:"error"});}finally{setUploading(false);}}

  return <section className="tags_point_photo_cropper">
    <header><div><FaCamera/><span><strong>Fotografía del punto *</strong><small>Mové la imagen para elegir qué queda dentro del cuadrado.</small></span></div><div className="tags_point_photo_actions"><label><FaCamera/> Tomar foto<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment" onChange={choose}/></label><label><FaImage/> Elegir archivo<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={choose}/></label></div></header>
    {source?<div className="tags_point_photo_editor">
      <div className="tags_point_photo_viewport" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}><img ref={imageRef} src={source} alt="Encuadre" draggable="false" onLoad={event=>setNatural({width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight})} style={{width:`${previewWidth}%`,height:`${previewHeight}%`,left:`${previewLeft}%`,top:`${previewTop}%`}}/><span><FaArrowsUpDownLeftRight/> Arrastrá para encuadrar</span></div>
      <label>Acercar imagen<input type="range" min="1" max="2.5" step="0.01" value={zoom} onChange={event=>setZoom(Number(event.target.value))}/></label>
      <button type="button" onClick={upload} disabled={uploading||!natural.width}>{uploading?<><TagsSpinner/> Optimizando...</>:<><FaCheck/> Usar esta fotografía</>}</button>
    </div>:value?<div className="tags_point_photo_current"><img src={value.url||value} alt="Fotografía actual del punto"/><span>1200 × 1200 px · WebP</span></div>:<p className="tags_point_photo_empty">Todavía falta la fotografía obligatoria del lugar donde está instalado el cartel.</p>}
  </section>;
}
