"use client";

import { useEffect,useMemo,useState } from "react";
import { FaBell,FaCalendarDays,FaDoorOpen,FaEnvelope,FaPen, FaLink, FaPlus, FaTrash, FaUserSlash, FaWhatsapp, FaXmark } from "react-icons/fa6";
import GuestExperienceOccupancyGrid from "./GuestExperienceOccupancyGrid";
import GuestExperienceAccountPanel from "./GuestExperienceAccountPanel";
import showAlert from "@/app/components/showAlert";
import { normalizeArgentinaWhatsapp } from "@/app/modules/qr-page/lib/normalizeContactFields";
import "./GuestExperienceReservationsPanel.css";
import "./GuestExperienceReservationsCalendar.css";
import "./GuestExperienceReservationActions.css";
import "./GuestExperienceReservationEditActions.css";
import "./GuestExperienceReminderActions.css";
import "./GuestExperienceCommunicationsReport.css";
import "./GuestExperienceNoShow.css";

const EMPTY = { firstName: "", lastName: "", documentNumber: "", email: "", phone: "", unitId: "", startsAt: "", endsAt: "", adults: 1, children: 0, nightlyRate: 0, depositPercentage: 0, expectedArrivalText: "", arrivalNotes: "", internalNotes: "" };
const plusDay = value => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); };
const localDay = value => new Date(`${String(value||"").slice(0,10)}T12:00:00`);
const communicationName = code => code==="arrival_reminder_24h" ? "Recordatorio de ingreso · 24 horas" : code==="arrival_reminder" ? "Recordatorio de ingreso · 48 horas" : code==="access_link" ? "Acceso a Mi Estadía" : code==="no_show_rebooking"||code==="no_show" ? "Aviso de reprogramación" : code;
const money = (value,currency="ARS") => new Intl.NumberFormat("es-AR",{style:"currency",currency,maximumFractionDigits:2}).format(Number(value||0));
const NO_SHOW_EMPTY={reason:"",financialAction:"credit",creditExpiresAt:"",totalAmount:0,paidAmount:0,pendingAmount:0,notifyGuest:true,subject:"",message:""};

export default function GuestExperienceReservationsPanel({ data, busy, onCreate, onUpdate, onDelete, onNoShow, onInvite, onDeleteCommunication, onCheckout, onDataChanged, overlayOnly=false, rebookingsOnly=false, stayId=0, onClose, canManage=true, canCheckin=true }) {
    const [form, setForm] = useState(EMPTY), [open, setOpen] = useState(false), [selected, setSelected] = useState(null), [editingId,setEditingId]=useState(null), [visibleRange,setVisibleRange]=useState(null),[stayFilter,setStayFilter]=useState("all"),[noShowStay,setNoShowStay]=useState(null),[noShowForm,setNoShowForm]=useState(NO_SHOW_EMPTY);
    function changeStart(value) { setForm(current => ({ ...current, startsAt: value, endsAt: !current.endsAt || current.endsAt <= value ? plusDay(value) : current.endsAt })); }
    const defaultDeposit=Number(data.app.settings?.depositPercentage||0);
    function startFromGrid(unit, date) { setEditingId(null);setForm({ ...EMPTY, depositPercentage:defaultDeposit,unitId: String(unit.id), startsAt: date, endsAt: plusDay(date) }); setOpen(true); }
    function newReservation(){setEditingId(null);setForm({...EMPTY,depositPercentage:defaultDeposit});setOpen(true)}
    async function submit(event) { event.preventDefault(); const done=editingId?await onUpdate({...form,stayId:editingId}):await onCreate(form);if(done){setForm(EMPTY);setEditingId(null);setOpen(false);if(overlayOnly)onClose?.()} }
    function editReservation(item){const parts=String(item.guest_name||"").split(" ");setForm({...EMPTY,firstName:parts.shift()||"",lastName:parts.join(" "),documentNumber:item.document_number||"",email:item.guest_email||"",phone:item.guest_phone||"",unitId:String(item.unit_id),startsAt:String(item.starts_at).slice(0,10),endsAt:String(item.ends_at).slice(0,10),adults:item.adults||1,children:item.children||0,nightlyRate:item.nightly_rate||0,depositPercentage:item.deposit_percentage||0,expectedArrivalText:item.expected_arrival_text||"",arrivalNotes:item.arrival_notes||"",internalNotes:item.internal_notes||""});setEditingId(item.id);setSelected(null);setOpen(true)}
    useEffect(()=>{const id=Number(sessionStorage.getItem("tags_guest_edit_stay")||0);if(!id)return;sessionStorage.removeItem("tags_guest_edit_stay");const item=data.stays.find(stay=>Number(stay.id)===id);if(item)editReservation(item)},[]);
    useEffect(()=>{const id=Number(sessionStorage.getItem("tags_guest_open_stay")||0);if(!id)return;sessionStorage.removeItem("tags_guest_open_stay");const item=data.stays.find(stay=>Number(stay.id)===id);if(item)setSelected(item)},[]);
    useEffect(()=>{if(!overlayOnly||!stayId)return;const item=data.stays.find(stay=>Number(stay.id)===Number(stayId));if(item)setSelected(item)},[overlayOnly,stayId,data.stays]);
    async function deleteReservation(item){const ok=await showAlert({title:"¿Eliminar esta reserva?",text:`${item.stay_code} · ${item.guest_name}`,icon:"warning",showCancelButton:true,confirmButtonText:"Eliminar reserva",cancelButtonText:"Cancelar"});if(ok&&await onDelete(item.id)){setSelected(null);if(overlayOnly)onClose?.()}}
    function reminderReady(item){const hours=(new Date(item.starts_at).getTime()-Date.now())/3600000;return hours>=0&&hours<=48}
    const listedStays=useMemo(()=>{if(!visibleRange||stayFilter==="rebooking")return[];const rangeStart=localDay(visibleRange.start),rangeEnd=localDay(visibleRange.end);const unitOrder=new Map(data.units.map((unit,index)=>[Number(unit.id),Number(unit.sort_order??index)]));return data.stays.filter(item=>!["cancelled","no_show_rebooking"].includes(item.status)&&(stayFilter==="all"||(stayFilter==="active"?item.status==="active":["reserved","upcoming"].includes(item.status)))&&localDay(item.starts_at)<rangeEnd&&localDay(item.ends_at)>rangeStart).sort((a,b)=>String(a.starts_at).localeCompare(String(b.starts_at))||(unitOrder.get(Number(a.unit_id))??9999)-(unitOrder.get(Number(b.unit_id))??9999)||String(a.unit_name||"").localeCompare(String(b.unit_name||""),"es",{numeric:true}))},[data.stays,data.units,visibleRange,stayFilter]);
    const pendingRebooking=useMemo(()=>data.stays.filter(item=>item.status==="no_show_rebooking").sort((a,b)=>String(b.no_show_at||b.updated_at).localeCompare(String(a.no_show_at||a.updated_at))),[data.stays]);
    function openNoShow(item){const total=Number(item.lodging_total||0),paid=Number(item.paid_total||0),pending=Math.max(0,Number(item.account_balance??total-paid));setNoShowStay(item);setNoShowForm({reason:"El huésped no se presentó en la fecha prevista.",financialAction:"credit",creditExpiresAt:"",totalAmount:total,paidAmount:paid,pendingAmount:pending,notifyGuest:true,subject:`Reserva pendiente de reprogramación · ${data.app.name}`,message:"Registramos que no pudiste presentarte en las fechas previstas. Tu reserva quedó pendiente de reprogramación. Contactanos para coordinar una nueva fecha."})}
    async function submitNoShow(event){event.preventDefault();if(await onNoShow?.({...noShowForm,stayId:noShowStay.id})){setNoShowStay(null);setSelected(null);await onDataChanged?.()}}
    function changeNoShowAmount(key,value){const amount=Math.max(0,Number(value||0));setNoShowForm(current=>key==="pendingAmount"?{...current,pendingAmount:amount,totalAmount:Number((Number(current.paidAmount||0)+amount).toFixed(2))}:key==="paidAmount"?{...current,paidAmount:amount,pendingAmount:Math.max(0,Number((Number(current.totalAmount||0)-amount).toFixed(2)))}:{...current,totalAmount:amount,pendingAmount:Math.max(0,Number((amount-Number(current.paidAmount||0)).toFixed(2)))})}
    function closeDetail(){setSelected(null);onClose?.()}
    function renderRebookings(){return <section className={`tags_guest_no_show_pending ${rebookingsOnly?"is_standalone":""}`}><header><div><span>REPROGRAMACIONES</span><h3>Pendientes de nueva fecha</h3></div><strong>{pendingRebooking.length}</strong></header>{pendingRebooking.map(item=><article key={item.id}><div className="tags_guest_no_show_pending_info"><b>{item.guest_name}</b><span>{item.stay_code} · Fechas originales: {new Date(item.starts_at).toLocaleDateString("es-AR")} al {new Date(item.ends_at).toLocaleDateString("es-AR")}</span><small>{item.guest_phone||"Sin teléfono"} · {item.guest_email||"Sin email"}</small><small>Abonado {money(item.no_show_paid_amount??item.paid_total,item.currency)} · Saldo {money(item.no_show_pending_amount??item.account_balance,item.currency)}</small></div><div className="tags_guest_no_show_pending_actions">{canManage&&<><button type="button" title="Enviar acceso por email" onClick={()=>onInvite(item,"email")}><FaEnvelope/><span>Email</span></button><button type="button" title="Abrir WhatsApp" onClick={()=>onInvite(item,"whatsapp")}><FaWhatsapp/><span>WhatsApp</span></button><button type="button" title="Modificar reserva y asignar nueva fecha" onClick={()=>editReservation(item)}><FaCalendarDays/><span>Reprogramar</span></button></>}<button type="button" title="Ver reserva" onClick={()=>setSelected(item)}><FaPen/><span>Ver detalle</span></button></div></article>)}{!pendingRebooking.length&&<p className="tags_guest_reservations_empty">No hay reservas pendientes de reprogramación.</p>}</section>}
    return <section className={`tags_guest_reservations ${overlayOnly?"is_overlay_only":""}`}>
        {!rebookingsOnly&&<><header>
<div>
<span>OCUPACIÓN</span>
<h2>Reservas del alojamiento</h2>
<p>La reserva nace con su titular y ocupa la unidad hasta el check-out o la cancelación.</p>
</div>
{canManage&&<button type="button" onClick={newReservation}>
<FaPlus /> Nueva reserva</button>}
        </header>
        <GuestExperienceOccupancyGrid units={data.units.filter(item => Number(item.is_active) === 1)} stays={data.stays} settings={data.app.settings||{}} onReservationClick={setSelected} onAvailableClick={canManage?startFromGrid:undefined} onRangeChange={setVisibleRange} />
        <div className="tags_guest_stay_filter"><label>Mostrar estadías<select value={stayFilter} onChange={event=>setStayFilter(event.target.value)}><option value="all">Todas las estadías</option><option value="pending">Pendientes de ingreso</option><option value="active">En curso</option><option value="rebooking">Pendientes de reprogramación</option></select></label></div>
        {!!pendingRebooking.length&&["all","rebooking"].includes(stayFilter)&&renderRebookings()}
        <div className="tags_guest_reservations_list">{listedStays.map(item => <article key={item.id}>
<div>
<strong>{item.guest_name}</strong>
{item.status==="active"&&<span className="tags_guest_stay_in_progress">Estadía en curso</span>}
{item.status==="checked_out"&&<span className="tags_guest_stay_completed">Estadía concluida</span>}
<span>{item.unit_name} · {new Date(item.starts_at).toLocaleDateString("es-AR")} al {new Date(item.ends_at).toLocaleDateString("es-AR")}</span>
<small>DNI {item.document_number || "sin informar"} · {item.guest_phone} · {item.guest_email} · {item.stay_code}</small>
{Number(item.account_balance||0)>0.009&&<div className="tags_guest_reservation_balance"><span>Abonado <strong>{money(item.paid_total,item.currency)}</strong></span><span>Saldo pendiente <strong>{money(item.account_balance,item.currency)}</strong></span><button type="button" onClick={()=>setSelected(item)}>Ver detalle</button></div>}
</div>
<div className="tags_guest_reservation_list_actions">
{canManage&&<><button title="Enviar acceso por email" onClick={() => onInvite(item, "email")}>
<FaEnvelope />
</button>
<button title="Abrir WhatsApp" onClick={() => onInvite(item, "whatsapp")}>WA</button>
<button title="Copiar acceso" onClick={() => onInvite(item, "manual")}>
<FaLink />
</button>
<button className={reminderReady(item)?"is_reminder_ready":""} disabled={!reminderReady(item)} title={reminderReady(item)?"Enviar recordatorio":"Se habilita 48 horas antes"} onClick={()=>onInvite(item,"reminder")}><FaBell/></button></>}
<button title="Ver reserva" onClick={()=>setSelected(item)}><FaPen/></button>
{canCheckin&&<button className="tags_guest_reservation_checkout_icon" title={item.status === "active" ? "Confirmar checkout" : "Se habilita después del check-in"} disabled={item.status !== "active"} onClick={() => onCheckout?.(item)}><FaDoorOpen /></button>}
</div>
<details className="tags_guest_reservation_communications"><summary>Comunicaciones enviadas ({item.communications?.length||0})</summary><div>{item.communications?.map(record=><div key={record.id}><strong>{communicationName(record.event_code)}</strong><span>{record.channel} · {record.status} · {new Date(record.created_at).toLocaleString("es-AR")}</span><small>{record.recipient||"Sin destinatario"}{record.subject?` · ${record.subject}`:""}</small>{record.last_error&&<em>{record.last_error}</em>}{canManage&&<button type="button" className="tags_guest_communication_delete" title="Eliminar comunicación" onClick={() => onDeleteCommunication?.(record, item)}><FaTrash /> Eliminar</button>}</div>)}{!item.communications?.length&&<p>No hay comunicaciones registradas.</p>}</div></details>
</article>)}{stayFilter!=="rebooking"&&!listedStays.length&&<p className="tags_guest_reservations_empty">No hay estadías para el filtro y período seleccionados.</p>}</div></>}
        {rebookingsOnly&&renderRebookings()}
        {open && <div className="tags_guest_reservations_backdrop" onMouseDown={() => !busy && setOpen(false)}>
<section className="tags_guest_reservations_modal" onMouseDown={event => event.stopPropagation()}>
<header>
<div>
<span>{editingId?"EDITAR RESERVA":"NUEVA RESERVA"}</span>
<h2>Datos del titular y ocupación</h2>
</div>
<button type="button" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button>
</header>
<form onSubmit={submit}>
<fieldset>
<legend>Titular de la reserva</legend>{[["firstName","Nombre","text"],["lastName","Apellido","text"],["documentNumber","DNI","text"],["phone","Teléfono","tel"],["email","Email","email"]].map(([key,label,type]) => <label key={key}>{label}<input required type={type} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} />
</label>)}</fieldset>
<fieldset>
<legend>Ocupación</legend>
<label>Unidad<select required value={form.unitId} onChange={event => setForm({ ...form, unitId: event.target.value })}>
<option value="">Seleccionar unidad</option>{data.units.filter(item => Number(item.is_active) === 1).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
</label>
<label>Check-in<input required type="date" value={form.startsAt} onChange={event => changeStart(event.target.value)} />
</label>
<label>Check-out<input required type="date" min={form.startsAt ? plusDay(form.startsAt) : undefined} value={form.endsAt} onChange={event => setForm({ ...form, endsAt: event.target.value })} />
</label>
<label>Adultos<input required type="number" min="1" value={form.adults} onChange={event => setForm({ ...form, adults: event.target.value })} />
</label>
<label>Niños<input type="number" min="0" value={form.children} onChange={event => setForm({ ...form, children: event.target.value })} />
</label>
<label>Precio por noche<input type="number" min="0" step="0.01" value={form.nightlyRate} onChange={event => setForm({ ...form, nightlyRate: event.target.value })} />
</label>
<label>Porcentaje de seña<input type="number" min="0" max="100" step="0.01" value={form.depositPercentage} onChange={event => setForm({ ...form, depositPercentage: event.target.value })} />
</label>
<label>Horario estimado de llegada<input type="text" placeholder="Ej. entre las 18 y las 19" value={form.expectedArrivalText} onChange={event => setForm({ ...form, expectedArrivalText: event.target.value })} />
</label>
<label>Observaciones del huésped<input type="text" placeholder="Pedido especial, indicación importante…" value={form.arrivalNotes} onChange={event => setForm({ ...form, arrivalNotes: event.target.value })} />
</label>
</fieldset>
<div className="tags_guest_reservations_actions">
<button type="button" onClick={() => setOpen(false)}>Cancelar</button>
<button disabled={busy} type="submit">{editingId?"Guardar modificaciones":"Crear reserva"}</button>
</div>
</form>
</section>
</div>}
        {selected && <div className="tags_guest_reservations_backdrop" onMouseDown={closeDetail}>
<section className="tags_guest_reservations_modal tags_guest_reservation_detail" onMouseDown={event => event.stopPropagation()}>
<header>
<div>
<span>RESERVA {selected.stay_code}</span>
<h2>{selected.guest_name}</h2>
{selected.status==="active"&&<span className="tags_guest_stay_in_progress">Estadía en curso</span>}
{selected.status==="checked_out"&&<span className="tags_guest_stay_completed">Estadía concluida</span>}
{selected.status==="no_show_rebooking"&&<span className="tags_guest_no_show_badge">Pendiente de reprogramación</span>}
</div>
<button type="button" aria-label="Cerrar" onClick={closeDetail}>
<FaXmark />
</button>
</header>
<dl>
<div>
<dt>Unidad</dt>
<dd>{selected.unit_name}</dd>
</div>
<div>
<dt>Período</dt>
<dd>{new Date(selected.starts_at).toLocaleDateString("es-AR")} al {new Date(selected.ends_at).toLocaleDateString("es-AR")}</dd>
</div>
<div>
<dt>Noches</dt>
<dd>{Math.round((new Date(selected.ends_at)-new Date(selected.starts_at))/86400000)}</dd>
</div>
<div>
<dt>Pasajeros previstos</dt>
<dd>{selected.adults} adultos · {selected.children} niños</dd>
</div>
<div>
<dt>DNI titular</dt>
<dd>{selected.document_number}</dd>
</div>
<div>
<dt>Email</dt>
<dd>{selected.guest_email}</dd>
</div>
<div>
<dt>Teléfono</dt>
<dd>{selected.guest_phone}</dd>
</div>
<div>
<dt>Pasajeros cargados</dt>
<dd>{selected.passenger_details?.split("||").map((person,index)=>{const[name,document]=person.split("~~");return <span className="tags_guest_reservation_passenger" key={`${name}-${index}`}>{name}{document?` · DNI ${document}`:""}</span>}) || selected.guest_name}</dd>
</div>
<div>
<dt>Vehículo</dt>
<dd>{[selected.vehicle_make_model,selected.vehicle_color,selected.vehicle_plate].filter(Boolean).join(" · ") || "No informado"}</dd>
</div>
</dl>
<a className="tags_guest_reservation_whatsapp" href={`https://wa.me/${normalizeArgentinaWhatsapp(selected.guest_phone)}`} target="_blank" rel="noreferrer">
<FaWhatsapp /> Contactar por WhatsApp</a>
{canCheckin&&<button className="tags_guest_reservation_checkout" type="button" disabled={selected.status !== "active"} title={selected.status === "active" ? "Confirmar checkout" : "Se habilita después del check-in confirmado"} onClick={() => onCheckout?.(selected)}><FaDoorOpen /> {selected.status === "active" ? "Confirmar checkout" : "Checkout disponible después del check-in"}</button>}
{canCheckin&&!["active","checked_out","no_show_rebooking"].includes(selected.status)&&<button className="tags_guest_reservation_checkin" type="button" onClick={()=>{sessionStorage.setItem("tags_guest_checkin_stay",String(selected.id));window.dispatchEvent(new CustomEvent("tags-guest-open-checkin",{detail:selected.id}));setSelected(null)}}>Hacer / confirmar check-in</button>}
{canManage&&!["active","checked_out","no_show_rebooking"].includes(selected.status)&&<button className={`tags_guest_reservation_reminder ${reminderReady(selected)?"is_ready":""}`} disabled={!reminderReady(selected)} type="button" onClick={()=>onInvite(selected,"reminder")}><FaBell/> {selected.last_reminder_sent_at?`Último recordatorio: ${new Date(selected.last_reminder_sent_at).toLocaleString("es-AR")}`:"Enviar recordatorio de ingreso"}</button>}
{canManage&&selected.status==="no_show_rebooking"&&<button className="tags_guest_reservation_edit" type="button" onClick={()=>editReservation(selected)}><FaCalendarDays/> Asignar nueva fecha</button>}
{canManage&&!["active","checked_out","no_show_rebooking"].includes(selected.status)&&<button className="tags_guest_no_show_open" type="button" onClick={()=>openNoShow(selected)}><FaUserSlash/> No se presentó</button>}
{canManage&&!["active","checked_out","no_show_rebooking"].includes(selected.status)&&<button className="tags_guest_reservation_edit" type="button" onClick={()=>editReservation(selected)}>Modificar reserva</button>}{canManage&&!['active','checked_out'].includes(selected.status)&&<button className="tags_guest_reservation_delete" type="button" onClick={()=>deleteReservation(selected)}>Eliminar reserva</button>}
<GuestExperienceAccountPanel businessId={data.app.business_id} guestAppId={data.app.id} stayId={selected.id} onChanged={onDataChanged}/>
</section>
</div>}
        {noShowStay&&<div className="tags_guest_reservations_backdrop" onMouseDown={()=>!busy&&setNoShowStay(null)}><section className="tags_guest_reservations_modal tags_guest_no_show_modal" onMouseDown={event=>event.stopPropagation()}><header><div><span>NO PRESENTADO</span><h2>Dejar reserva pendiente de reprogramación</h2></div><button type="button" aria-label="Cerrar" onClick={()=>setNoShowStay(null)}><FaXmark/></button></header><form onSubmit={submitNoShow}><p>Se liberará la unidad de las fechas originales. La estadía, el acceso, el pre-check-in, los pagos y el historial se conservarán.</p><fieldset><legend>Situación</legend><label>Motivo<textarea required value={noShowForm.reason} onChange={event=>setNoShowForm({...noShowForm,reason:event.target.value})}/></label><label>Tratamiento de la seña<select value={noShowForm.financialAction} onChange={event=>setNoShowForm({...noShowForm,financialAction:event.target.value})}><option value="credit">Conservar como crédito</option><option value="retained">Retener por no presentación</option><option value="refund">Reintegrar al huésped</option></select></label>{noShowForm.financialAction==="credit"&&<label>Vencimiento del crédito (opcional)<input type="date" value={noShowForm.creditExpiresAt} onChange={event=>setNoShowForm({...noShowForm,creditExpiresAt:event.target.value})}/></label>}</fieldset><fieldset><legend>Importes existentes</legend><label>Total de la estadía<input type="number" min="0" step="0.01" value={noShowForm.totalAmount} onChange={event=>changeNoShowAmount("totalAmount",event.target.value)}/></label><label>Importe abonado<input type="number" min="0" step="0.01" value={noShowForm.paidAmount} onChange={event=>changeNoShowAmount("paidAmount",event.target.value)}/></label><label>Saldo pendiente<input type="number" min="0" step="0.01" value={noShowForm.pendingAmount} onChange={event=>changeNoShowAmount("pendingAmount",event.target.value)}/></label></fieldset><fieldset className="tags_guest_no_show_notification"><legend>Comunicación al huésped</legend><label className="tags_guest_no_show_check"><input type="checkbox" checked={noShowForm.notifyGuest} onChange={event=>setNoShowForm({...noShowForm,notifyGuest:event.target.checked})}/> Notificar al huésped por email</label>{noShowForm.notifyGuest&&<><label>Asunto<input required value={noShowForm.subject} onChange={event=>setNoShowForm({...noShowForm,subject:event.target.value})}/></label><label>Mensaje<textarea required value={noShowForm.message} onChange={event=>setNoShowForm({...noShowForm,message:event.target.value})}/></label><div className="tags_guest_no_show_preview"><small>VISTA PREVIA</small><strong>{noShowForm.subject}</strong><p>Hola {noShowStay.guest_name}.</p><p>{noShowForm.message}</p><span>Fechas originales: {new Date(noShowStay.starts_at).toLocaleDateString("es-AR")} al {new Date(noShowStay.ends_at).toLocaleDateString("es-AR")}</span><span>Total {money(noShowForm.totalAmount,noShowStay.currency)} · Abonado {money(noShowForm.paidAmount,noShowStay.currency)} · Saldo {money(noShowForm.pendingAmount,noShowStay.currency)}</span></div></>}</fieldset><div className="tags_guest_reservations_actions"><button type="button" onClick={()=>setNoShowStay(null)}>Cancelar</button><button disabled={busy} type="submit">Confirmar y liberar unidad</button></div></form></section></div>}
    </section>;
}

