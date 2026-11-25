"use client";
import { useEffect, useState } from "react";
import { FaGear, FaLink, FaXmark } from "react-icons/fa6";
import MediaUploader from "@/app/components/MediaUploader";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import GuestExperienceWifiManager from "./GuestExperienceWifiManager";
import AiChatSurfaceSettings from "@/app/modules/ai-chat/components/admin/AiChatSurfaceSettings";
import PushNotificationButton from "@/app/modules/notifications/components/PushNotificationButton";
import LodgingPolicySettingsFields from "./LodgingPolicySettingsFields";
import GuestExperienceQuoteSettings from "./GuestExperienceQuoteSettings";
import "./GuestExperienceSettingsPanel.css";
import "./GuestExperienceSettingsOperations.css";
import "./GuestExperienceSettingsThemesCompact.css";
import "@/app/styles/qr-page.css";

const PUBLIC_SECTIONS = [
 ["pre-checkin", "Pre-Check-in"],
 ["wifi", "WiFi e información"],
 ["beneficios", "Beneficios"],
 ["actividades", "Reservar servicios"],
 ["tienda", "Tienda"],
 ["gastronomia", "Gastronomía"],
 ["mensajes", "Mensajes"],
 ["cerca", "Lugares cercanos"],
 ["cuenta", "Cuenta de la estadía"],
 ["resena", "Calificar experiencia"]
];

const DEFAULT_LODGING_POLICY = {
 capacityMode:"total_occupancy",childFreeAge:0,askBedOccupancy:true,minimumNights:1,maximumNights:90,
 minimumAdvanceDays:0,maximumAdvanceDays:365,gapProtectionMode:"manual_review",minimumGapBefore:0,
 minimumGapAfter:0,automationMode:"quote_whatsapp",holdMinutes:15
};
const SETTINGS_TABS = [["general","General"],["engine","Motor de reservas"],["payments","Confirmación y pagos"],["budget","Presupuesto"],["public","Página pública"],["operations","Grilla y operación"],["stay","Mi Estadía"]];
const LEGACY_QUOTE_TITLES = {presentation:"Presentación",experiences:"Experiencias",lodging:"El alojamiento",services:"Servicios incluidos",location:"Ubicación y alrededores",signature:"Cierre"};
function normalizeQuoteSections(value){
 if(Array.isArray(value))return value.map((section,index)=>({id:String(section?.id||`section-${index+1}`),title:String(section?.title||""),enabled:section?.enabled!==false,content:String(section?.content||"")}));
 if(!value||typeof value!=="object")return [];
 return Object.entries(value).filter(([,section])=>section?.content).map(([key,section],index)=>({id:`legacy-${key}-${index+1}`,title:LEGACY_QUOTE_TITLES[key]||key,enabled:section?.enabled!==false,content:String(section.content||"")}));
}
export default function GuestExperienceSettingsPanel({ businessId, data, onSaved }) {
 const current=data.app.settings||{};
 const [form,setForm]=useState({name:data.app.name||"",welcomeMessage:data.app.welcome_message||"",logoUrl:data.app.logo_url||"",coverUrl:data.app.cover_url||"",bookingShowLogo:current.bookingShowLogo!==false,bookingShowCover:current.bookingShowCover!==false,bookingCoverSource:["business","custom"].includes(current.bookingCoverSource)?current.bookingCoverSource:"business",bookingCoverUrl:current.bookingCoverUrl||"",currency:["ARS","USD"].includes(data.app.currency)?data.app.currency:"ARS",pwaIcon192Url:current.pwaIcon192Url||"",pwaIcon512Url:current.pwaIcon512Url||"",themeOverride:Boolean(current.themeOverride),themeId:current.themeId||"",reservationCodeBase:current.reservationCodeBase||"R000",checkinTime:current.checkinTime||"15:00",checkoutTime:current.checkoutTime||"10:00",depositPercentage:current.depositPercentage||0,reservationPaymentHours:Math.max(1,Number(current.reservationPaymentHours||48)),bankPaymentDetails:current.bankPaymentDetails||"",bookingBudgetDetails:current.bookingBudgetDetails||"",bookingUnitDisplay:["unit","category_unit"].includes(current.bookingUnitDisplay)?current.bookingUnitDisplay:"category",bookingQuoteSections:normalizeQuoteSections(current.bookingQuoteSections),connectBookingToChatbot:current.connectBookingToChatbot!==false,groupBookingEnabled:current.groupBookingEnabled!==false,groupSuggestionMode:current.groupSuggestionMode==="when_no_single_available"?"when_no_single_available":"exceeds_single_capacity",groupMaximumOptions:Math.max(1,Math.min(5,Number(current.groupMaximumOptions||3))),occupancyFixedPeriod:Boolean(current.occupancyFixedPeriod),occupancyStartDate:current.occupancyStartDate||"",occupancyDays:Math.min(120,Math.max(7,Number(current.occupancyDays||30))),receptionPhone:current.receptionPhone||"",receptionEmail:current.receptionEmail||"",arrivalInstructions:current.arrivalInstructions||"",departureInstructions:current.departureInstructions||"",houseRules:current.houseRules||"",lodgingPolicy:{...DEFAULT_LODGING_POLICY,...current.lodgingPolicy,capacityMode:current.lodgingPolicy?.capacityMode||current.lodgingCapacityMode||DEFAULT_LODGING_POLICY.capacityMode},sectionVisibility:Object.fromEntries(PUBLIC_SECTIONS.map(([key])=>[key,current.sectionVisibility?.[key]!==false]))});
 const [slugOpen,setSlugOpen]=useState(false),[slug,setSlug]=useState(data.app.slug||""),[busy,setBusy]=useState(false),[activeSettingsTab,setActiveSettingsTab]=useState("general");
 useEffect(()=>setSlug(data.app.slug||""),[data.app.slug]);
 async function save(e){e.preventDefault();setBusy(true);try{const r=await fetch("/api/guest-experience/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,guestAppId:data.app.id,...form})}),p=await r.json();if(!r.ok)return showAlert({title:"No se pudo guardar",text:p.error||"Revisá la configuración.",icon:"error"});await onSaved?.();await showAlert({title:"Configuración guardada",text:"La identidad y apariencia pública fueron actualizadas.",icon:"success",timer:1600});}finally{setBusy(false)}}
 async function changeSlug(e){e.preventDefault();const ok=await showAlert({title:"¿Cambiar la ruta pública?",text:`Mi Estadía pasará a usar /p/${slug}/mi-estadia. Los enlaces anteriores dejarán de funcionar.`,icon:"warning",showCancelButton:true,confirmButtonText:"Cambiar ruta",cancelButtonText:"Cancelar"});if(!ok)return;setBusy(true);try{const r=await fetch("/api/guest-experience/admin/slug",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,guestAppId:data.app.id,slug})}),p=await r.json();if(!r.ok)return showAlert({title:"No se pudo cambiar",text:p.error||"Revisá la ruta.",icon:"error"});setSlugOpen(false);await onSaved?.();await showAlert({title:"Ruta actualizada",text:`/p/${p.slug}/mi-estadia`,icon:"success",timer:1800});}finally{setBusy(false)}}
 const selected=form.themeOverride?String(form.themeId):"inherit";
 return <section className="tags_guest_settings">
<header>
<div>
<span>CONFIGURACIÓN</span>
<h2>Configuración</h2>
<p>Cada opción se encuentra en una única sección según su función.</p>
</div>
<button type="button" onClick={()=>setSlugOpen(true)}>
<FaLink/> Cambiar ruta</button>
</header>
<nav className="tags_guest_settings_tabs">{SETTINGS_TABS.map(([key,label])=><button type="button" key={key} className={activeSettingsTab===key?"is_active":""} onClick={()=>setActiveSettingsTab(key)}>{label}</button>)}</nav>
<label className="tags_guest_settings_mobile_tab"><span className="tags_guest_settings_mobile_tab_icon"><FaGear/></span><span className="tags_guest_settings_mobile_tab_control"><strong>Sección de configuración</strong><select value={activeSettingsTab} onChange={e=>setActiveSettingsTab(e.target.value)}>{SETTINGS_TABS.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></span></label>
<form onSubmit={save} data-active-tab={activeSettingsTab}>
<div data-settings-tab="engine"><LodgingPolicySettingsFields value={form.lodgingPolicy} onChange={lodgingPolicy=>setForm({...form,lodgingPolicy})}/></div>
<section data-settings-tab="engine" className="tags_guest_settings_group"><h3>Chatbot del alojamiento</h3><p>Esta integración corresponde al asistente privado del negocio. No conecta ni modifica a Muchi.</p><div><label className="tags_lodging_policy_check"><span><input type="checkbox" checked={form.connectBookingToChatbot!==false} onChange={e=>setForm({...form,connectBookingToChatbot:e.target.checked})}/> Conectar Motor de reservas al ChatBot</span><small>El chatbot podrá consultar disponibilidad, precios y restricciones reales. Activado por defecto.</small></label></div></section>
<section data-settings-tab="general" className="tags_guest_settings_group"><h3>Identidad de la experiencia</h3><p>Nombre y bienvenida que verá el huésped.</p><div><label>Nombre de la experiencia<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Mensaje de bienvenida<input value={form.welcomeMessage} onChange={e=>setForm({...form,welcomeMessage:e.target.value})}/></label></div></section>
<section data-settings-tab="engine" className="tags_guest_settings_group"><h3>Reservas e ingresos</h3><p>Numeración, moneda, horarios habituales y seña del alojamiento.</p><div><label>Moneda del motor<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option value="ARS">$ — Pesos argentinos (ARS)</option><option value="USD">U$S — Dólares estadounidenses (USD)</option></select><small>Se aplicará a los precios configurados y a las cotizaciones nuevas.</small></label><label>Base del código de reservas<input required placeholder="Temp26-27:E000" value={form.reservationCodeBase} onChange={e=>setForm({...form,reservationCodeBase:e.target.value})}/><small>Próximo número actual: {Number(current.reservationCodeCounter||0)+1}</small></label><label>Horario habitual de check-in<input type="time" required value={form.checkinTime} onChange={e=>setForm({...form,checkinTime:e.target.value})}/></label><label>Horario habitual de check-out<input type="time" required value={form.checkoutTime} onChange={e=>setForm({...form,checkoutTime:e.target.value})}/></label><label>Porcentaje habitual de seña<input type="number" min="0" max="100" step="0.01" value={form.depositPercentage} onChange={e=>setForm({...form,depositPercentage:e.target.value})}/></label></div></section>
<section data-settings-tab="engine" className="tags_guest_settings_group"><h3>Reservas para grupos</h3><p>Define cuándo el motor puede combinar varias unidades para alojar al grupo solicitado.</p><div><label className="tags_lodging_policy_check"><span><input type="checkbox" checked={form.groupBookingEnabled} onChange={e=>setForm({...form,groupBookingEnabled:e.target.checked})}/> Permitir propuestas con varias unidades</span></label><label>Cuándo ofrecer combinaciones<select value={form.groupSuggestionMode} onChange={e=>setForm({...form,groupSuggestionMode:e.target.value})}><option value="exceeds_single_capacity">Sólo si el grupo supera una unidad</option><option value="when_no_single_available">También si no queda una unidad individual</option></select></label><label>Máximo de combinaciones<input type="number" min="1" max="5" value={form.groupMaximumOptions} onChange={e=>setForm({...form,groupMaximumOptions:e.target.value})}/></label></div></section>
<section data-settings-tab="payments" className="tags_guest_settings_group"><h3>Confirmación y pago de reservas</h3><p>Estos datos se envían recién después de que el alojamiento revisa y acepta la solicitud.</p><div><label>Plazo para pagar<input type="number" min="1" max="720" value={form.reservationPaymentHours} onChange={e=>setForm({...form,reservationPaymentHours:e.target.value})}/><small>Horas desde la aceptación.</small></label><label>Datos bancarios<textarea value={form.bankPaymentDetails} onChange={e=>setForm({...form,bankPaymentDetails:e.target.value})} placeholder="Alias, CBU/CVU, titular e indicaciones"/></label></div></section>
<GuestExperienceQuoteSettings form={form} setForm={setForm} units={data.units || []} currentSettings={current}/>
<section className="tags_guest_settings_group tags_guest_booking_appearance"><h3>Apariencia de la página pública de Reservas</h3><p>Esta configuración es independiente del encabezado de la web del negocio.</p><div><label className="tags_guest_settings_fixed_period"><span><input type="checkbox" checked={form.bookingShowLogo} onChange={e=>setForm({...form,bookingShowLogo:e.target.checked})}/> Mostrar logo del negocio</span><small>Usa el logo compartido del comercio respetando su proporción original.</small></label><label className="tags_guest_settings_fixed_period"><span><input type="checkbox" checked={form.bookingShowCover} onChange={e=>setForm({...form,bookingShowCover:e.target.checked})}/> Mostrar portada en Reservas</span><small>No modifica la portada de la web principal.</small></label><label>Origen de la portada<select disabled={!form.bookingShowCover} value={form.bookingCoverSource} onChange={e=>setForm({...form,bookingCoverSource:e.target.value})}><option value="business">Portada general del negocio</option><option value="custom">Imagen exclusiva para Reservas</option></select></label>{form.bookingShowCover&&form.bookingCoverSource==="custom"&&<div className="tags_guest_booking_cover_upload"><strong>Portada exclusiva de Reservas</strong><MediaUploader businessId={businessId} value={form.bookingCoverUrl} module="guest-experience" variant="cover" entityId={data.app.id} fileName="booking-cover" replace previousUrl={form.bookingCoverUrl} label="Subir portada de Reservas" onChange={media=>setForm({...form,bookingCoverUrl:media?.url||""})}/></div>}</div></section>
<section className="tags_guest_settings_group tags_guest_settings_period"><h3>Período inicial de la grilla hotelera</h3><p>Define cómo se abre la grilla de Reservas. El operador puede cambiar la vista temporalmente.</p><div><label className="tags_guest_settings_fixed_period"><span><input type="checkbox" checked={form.occupancyFixedPeriod} onChange={e=>setForm({...form,occupancyFixedPeriod:e.target.checked})}/> Fijar período</span><small>Desmarcado: comienza en la fecha actual.</small></label><label>Fecha de inicio<input type="date" required={form.occupancyFixedPeriod} disabled={!form.occupancyFixedPeriod} value={form.occupancyStartDate} onChange={e=>setForm({...form,occupancyStartDate:e.target.value})}/></label><label>Período visible<select value={form.occupancyDays} onChange={e=>setForm({...form,occupancyDays:Number(e.target.value)})}>{[7,15,30,45,60,90,120].map(value=><option value={value} key={value}>{value} días</option>)}</select></label></div></section>
<section data-settings-tab="stay" className="tags_guest_settings_group"><h3>Contacto e información para el huésped</h3><p>Datos operativos e indicaciones de la estadía.</p><div><label>Teléfono de recepción<input type="tel" value={form.receptionPhone} onChange={e=>setForm({...form,receptionPhone:e.target.value})}/></label><label>Email de recepción<input type="email" value={form.receptionEmail} onChange={e=>setForm({...form,receptionEmail:e.target.value})}/></label><label>Instrucciones de ingreso<textarea value={form.arrivalInstructions} onChange={e=>setForm({...form,arrivalInstructions:e.target.value})}/></label><label>Instrucciones de salida<textarea value={form.departureInstructions} onChange={e=>setForm({...form,departureInstructions:e.target.value})}/></label><label>Reglas del alojamiento<textarea value={form.houseRules} onChange={e=>setForm({...form,houseRules:e.target.value})}/></label></div></section>
<section className="tags_guest_settings_group tags_guest_settings_visibility"><h3>Tarjetas visibles para el huésped</h3><p>Activá solamente las herramientas que quieras mostrar. Ocultarlas no elimina su configuración ni sus datos.</p><div>{PUBLIC_SECTIONS.map(([key,label])=><label key={key} className={form.sectionVisibility[key]!==false?"is_enabled":""}><span><input type="checkbox" checked={form.sectionVisibility[key]!==false} onChange={e=>setForm({...form,sectionVisibility:{...form.sectionVisibility,[key]:e.target.checked}})}/><strong>{label}</strong></span><small>{form.sectionVisibility[key]!==false?"Visible":"Oculta"}</small></label>)}</div></section>
<div data-settings-tab="public" className="tags_guest_settings_media">
<strong>Logo</strong>
<MediaUploader businessId={businessId} value={form.logoUrl} module="guest-experience" variant="logo" entityId={data.app.id} fileName="logo" replace previousUrl={form.logoUrl} label="Subir logo" onChange={media=>setForm({...form,logoUrl:media?.url||""})}/>
</div>
<div data-settings-tab="public" className="tags_guest_settings_media">
<strong>Imagen de portada</strong>
<MediaUploader businessId={businessId} value={form.coverUrl} module="guest-experience" variant="cover" entityId={data.app.id} fileName="cover" replace previousUrl={form.coverUrl} label="Subir portada" onChange={media=>setForm({...form,coverUrl:media?.url||""})}/>
</div>
<div data-settings-tab="public" className="tags_guest_settings_media">
<strong>Icono de instalación</strong>
<p>Es la imagen que verá el huésped al instalar Mi Estadía. Usá una imagen cuadrada; puede contener un diseño circular y no debe superar los 2 MB.</p>
<MediaUploader businessId={businessId} value={form.pwaIcon512Url} module="guest-experience" variant="pwa-icon" entityId={data.app.id} accept="image/png,image/jpeg,image/webp,image/avif" uploadEndpoint="/api/guest-experience/admin/pwa-icon" label="Subir icono" onChange={media=>setForm({...form,pwaIcon192Url:media?.icon192Url||"",pwaIcon512Url:media?.icon512Url||""})}/>
</div>
<section data-settings-tab="public" className="tags_guest_settings_themes">
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
</form>{activeSettingsTab==="operations"&&<PushNotificationButton businessId={businessId}/>} {activeSettingsTab==="stay"&&<><GuestExperienceWifiManager businessId={businessId} data={data} onSaved={onSaved}/><AiChatSurfaceSettings businessId={businessId} surfaceType="guest_experience" surfaceId={data.app.id} surfaceLabel="Mi Estadía" /></>}{slugOpen&&<div className="tags_guest_settings_backdrop" onMouseDown={()=>!busy&&setSlugOpen(false)}>
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

