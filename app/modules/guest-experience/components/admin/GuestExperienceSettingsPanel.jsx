"use client";
import { useEffect, useState } from "react";
import { FaLink, FaXmark } from "react-icons/fa6";
import MediaUploader from "@/app/components/MediaUploader";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import GuestExperienceWifiManager from "./GuestExperienceWifiManager";
import "./GuestExperienceSettingsPanel.css";
import "./GuestExperienceSettingsOperations.css";
import "./GuestExperienceSettingsThemesCompact.css";
import "@/app/styles/qr-page.css";

export default function GuestExperienceSettingsPanel({ businessId, data, onSaved }) {
 const current=data.app.settings||{};
 const [form,setForm]=useState({name:data.app.name||"",welcomeMessage:data.app.welcome_message||"",logoUrl:data.app.logo_url||"",coverUrl:data.app.cover_url||"",themeOverride:Boolean(current.themeOverride),themeId:current.themeId||"",reservationCodeBase:current.reservationCodeBase||"R000",checkinTime:current.checkinTime||"15:00",checkoutTime:current.checkoutTime||"10:00",depositPercentage:current.depositPercentage||0,occupancyFixedPeriod:Boolean(current.occupancyFixedPeriod),occupancyStartDate:current.occupancyStartDate||"",occupancyDays:Math.min(120,Math.max(7,Number(current.occupancyDays||30))),receptionPhone:current.receptionPhone||"",receptionEmail:current.receptionEmail||"",arrivalInstructions:current.arrivalInstructions||"",departureInstructions:current.departureInstructions||"",houseRules:current.houseRules||""});
 const [slugOpen,setSlugOpen]=useState(false),[slug,setSlug]=useState(data.app.slug||""),[busy,setBusy]=useState(false);
 useEffect(()=>setSlug(data.app.slug||""),[data.app.slug]);
 async function save(e){e.preventDefault();setBusy(true);try{const r=await fetch("/api/guest-experience/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,guestAppId:data.app.id,...form})}),p=await r.json();if(!r.ok)return showAlert({title:"No se pudo guardar",text:p.error||"Revisá la configuración.",icon:"error"});await onSaved?.();await showAlert({title:"Configuración guardada",text:"La identidad y apariencia pública fueron actualizadas.",icon:"success",timer:1600});}finally{setBusy(false)}}
 async function changeSlug(e){e.preventDefault();const ok=await showAlert({title:"¿Cambiar la ruta pública?",text:`Mi Estadía pasará a usar /p/${slug}/mi-estadia. Los enlaces anteriores dejarán de funcionar.`,icon:"warning",showCancelButton:true,confirmButtonText:"Cambiar ruta",cancelButtonText:"Cancelar"});if(!ok)return;setBusy(true);try{const r=await fetch("/api/guest-experience/admin/slug",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,guestAppId:data.app.id,slug})}),p=await r.json();if(!r.ok)return showAlert({title:"No se pudo cambiar",text:p.error||"Revisá la ruta.",icon:"error"});setSlugOpen(false);await onSaved?.();await showAlert({title:"Ruta actualizada",text:`/p/${p.slug}/mi-estadia`,icon:"success",timer:1800});}finally{setBusy(false)}}
 const selected=form.themeOverride?String(form.themeId):"inherit";
 return <section className="tags_guest_settings">
<header>
<div>
<span>CONFIGURACIÓN</span>
<h2>Identidad y apariencia</h2>
<p>Estos elementos se aplican exclusivamente a la experiencia pública del huésped.</p>
</div>
<button type="button" onClick={()=>setSlugOpen(true)}>
<FaLink/> Cambiar ruta</button>
</header>
<form onSubmit={save}>
<section className="tags_guest_settings_group"><h3>Identidad de la experiencia</h3><p>Nombre y bienvenida que verá el huésped.</p><div><label>Nombre de la experiencia<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Mensaje de bienvenida<input value={form.welcomeMessage} onChange={e=>setForm({...form,welcomeMessage:e.target.value})}/></label></div></section>
<section className="tags_guest_settings_group"><h3>Reservas e ingresos</h3><p>Numeración, horarios habituales y seña del alojamiento.</p><div><label>Base del código de reservas<input required placeholder="Temp26-27:E000" value={form.reservationCodeBase} onChange={e=>setForm({...form,reservationCodeBase:e.target.value})}/><small>Próximo número actual: {Number(current.reservationCodeCounter||0)+1}</small></label><label>Horario habitual de check-in<input type="time" required value={form.checkinTime} onChange={e=>setForm({...form,checkinTime:e.target.value})}/></label><label>Horario habitual de check-out<input type="time" required value={form.checkoutTime} onChange={e=>setForm({...form,checkoutTime:e.target.value})}/></label><label>Porcentaje habitual de seña<input type="number" min="0" max="100" step="0.01" value={form.depositPercentage} onChange={e=>setForm({...form,depositPercentage:e.target.value})}/></label></div></section>
<section className="tags_guest_settings_group tags_guest_settings_period"><h3>Período inicial de la grilla hotelera</h3><p>Define cómo se abre la grilla de Reservas. El operador puede cambiar la vista temporalmente.</p><div><label className="tags_guest_settings_fixed_period"><span><input type="checkbox" checked={form.occupancyFixedPeriod} onChange={e=>setForm({...form,occupancyFixedPeriod:e.target.checked})}/> Fijar período</span><small>Desmarcado: comienza en la fecha actual.</small></label><label>Fecha de inicio<input type="date" required={form.occupancyFixedPeriod} disabled={!form.occupancyFixedPeriod} value={form.occupancyStartDate} onChange={e=>setForm({...form,occupancyStartDate:e.target.value})}/></label><label>Período visible<select value={form.occupancyDays} onChange={e=>setForm({...form,occupancyDays:Number(e.target.value)})}>{[7,15,30,45,60,90,120].map(value=><option value={value} key={value}>{value} días</option>)}</select></label></div></section>
<section className="tags_guest_settings_group"><h3>Contacto e información para el huésped</h3><p>Datos operativos e indicaciones de la estadía.</p><div><label>Teléfono de recepción<input type="tel" value={form.receptionPhone} onChange={e=>setForm({...form,receptionPhone:e.target.value})}/></label><label>Email de recepción<input type="email" value={form.receptionEmail} onChange={e=>setForm({...form,receptionEmail:e.target.value})}/></label><label>Instrucciones de ingreso<textarea value={form.arrivalInstructions} onChange={e=>setForm({...form,arrivalInstructions:e.target.value})}/></label><label>Instrucciones de salida<textarea value={form.departureInstructions} onChange={e=>setForm({...form,departureInstructions:e.target.value})}/></label><label>Reglas del alojamiento<textarea value={form.houseRules} onChange={e=>setForm({...form,houseRules:e.target.value})}/></label></div></section>
<div className="tags_guest_settings_media">
<strong>Logo</strong>
<MediaUploader businessId={businessId} value={form.logoUrl} module="guest-experience" variant="logo" entityId={data.app.id} fileName="logo" replace previousUrl={form.logoUrl} label="Subir logo" onChange={media=>setForm({...form,logoUrl:media?.url||""})}/>
</div>
<div className="tags_guest_settings_media">
<strong>Imagen de portada</strong>
<MediaUploader businessId={businessId} value={form.coverUrl} module="guest-experience" variant="cover" entityId={data.app.id} fileName="cover" replace previousUrl={form.coverUrl} label="Subir portada" onChange={media=>setForm({...form,coverUrl:media?.url||""})}/>
</div>
<section className="tags_guest_settings_themes">
<h3>Tema de la página pública</h3>
<p>Elegí visualmente la apariencia que verá el huésped.</p>
<div>
<button type="button" className={selected==="inherit"?"is_active":""} onClick={()=>setForm({...form,themeOverride:false})}>
<i className="tags_guest_settings_portal_swatch"/>
<strong>Heredar de Portal</strong>
<small>{data.portalThemeCode||"Tags por defecto"}</small>
</button>{data.themes.map(theme=>{const t=theme.css_tokens||{};return <button type="button" key={theme.id} className={selected===String(theme.id)?"is_active":""} onClick={()=>setForm({...form,themeOverride:true,themeId:theme.id})}>
<i style={{background:`linear-gradient(135deg,${t["--qr-primary"]||"#22a35a"} 0 50%,${t["--qr-background"]||"#f5f5f5"} 50%)`}}/>
<strong>{theme.name}</strong>
<small>Seleccionar</small>
</button>})}</div>
</section>
<button disabled={busy}>Guardar configuración</button>
</form><GuestExperienceWifiManager businessId={businessId} data={data} onSaved={onSaved}/>{slugOpen&&<div className="tags_guest_settings_backdrop" onMouseDown={()=>!busy&&setSlugOpen(false)}>
<section className="tags_guest_settings_modal" onMouseDown={e=>e.stopPropagation()}>
<button className="tags_guest_settings_close" type="button" onClick={()=>setSlugOpen(false)}>
<FaXmark/>
</button>
<h2>Cambiar ruta pública</h2>
<p>Esta operación es excepcional porque invalida los enlaces anteriores.</p>
<form onSubmit={changeSlug}>
<label>Nuevo slug<input required value={slug} onChange={e=>setSlug(e.target.value)}/>
</label>
<small>/p/{slug||"slug"}/mi-estadia</small>
<button disabled={busy}>Confirmar cambio</button>
</form>
</section>
</div>}{busy&&<TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)"/>}</section>
}

