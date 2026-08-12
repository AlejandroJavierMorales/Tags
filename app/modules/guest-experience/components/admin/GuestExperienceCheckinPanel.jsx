"use client";
import { useEffect,useMemo,useState } from "react";
import { FaCar,FaPlus,FaUserCheck,FaXmark } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import "./GuestExperienceCheckinPanel.css";
import "./GuestExperienceCheckinFilters.css";
const EMPTY={firstName:"",lastName:"",documentNumber:""};
export default function GuestExperienceCheckinPanel({businessId,data,busy,onSaved}){
 const [selected,setSelected]=useState(null),[form,setForm]=useState({companions:[],vehiclePlate:"",vehicleMakeModel:"",vehicleColor:"",expectedArrivalText:"",guestNotes:"",internalNotes:""}),[loading,setLoading]=useState(false),[search,setSearch]=useState(""),[filter,setFilter]=useState("all");
 const reservations=useMemo(()=>{const term=search.trim().toLowerCase(),unitOrder=new Map(data.units.map((unit,index)=>[Number(unit.id),Number(unit.sort_order??index)]));return data.stays.filter(item=>!["active","checked_out","cancelled"].includes(item.status)).filter(item=>!term||[item.stay_code,item.document_number,item.guest_name].some(value=>String(value||"").toLowerCase().includes(term))).filter(item=>filter==="all"||(filter==="ready"&&["reviewed","submitted"].includes(item.precheckin_status))||(filter==="pending"&&!["reviewed","submitted"].includes(item.precheckin_status))).sort((a,b)=>String(a.starts_at).localeCompare(String(b.starts_at))||(unitOrder.get(Number(a.unit_id))??9999)-(unitOrder.get(Number(b.unit_id))??9999)||String(a.unit_name||"").localeCompare(String(b.unit_name||""),"es",{numeric:true}))},[data.stays,data.units,search,filter]);
 async function open(item){setLoading(true);try{const r=await fetch(`/api/guest-experience/admin/checkin?businessId=${businessId}&guestAppId=${data.app.id}&stayId=${item.id}`,{cache:"no-store"}),p=await r.json();if(!r.ok)return showAlert({title:"No se pudo abrir",text:p.error,icon:"error"});setSelected(p.reservation);setForm({companions:p.passengers.filter(x=>x.role==="companion").map(x=>{const parts=x.name.split(" ");return{firstName:parts.shift()||"",lastName:parts.join(" "),documentNumber:x.document_number||""}}),vehiclePlate:p.reservation.vehicle_plate||"",vehicleMakeModel:p.reservation.vehicle_make_model||"",vehicleColor:p.reservation.vehicle_color||"",expectedArrivalText:p.reservation.expected_arrival_text||"",guestNotes:p.reservation.guest_notes||"",internalNotes:p.reservation.internal_notes||""})}finally{setLoading(false)}}
 useEffect(()=>{const id=Number(sessionStorage.getItem("tags_guest_checkin_stay")||0);if(!id)return;sessionStorage.removeItem("tags_guest_checkin_stay");const item=data.stays.find(stay=>Number(stay.id)===id);if(item)open(item)},[]);
 function updateCompanion(index,key,value){setForm(current=>({...current,companions:current.companions.map((p,i)=>i===index?{...p,[key]:value}:p)}))}
 async function save(complete=false){if(complete){const reservationDate=String(selected.starts_at||"").slice(0,10),today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());if(reservationDate>today){await showAlert({title:"Todavía no se puede confirmar el check-in",text:`La fecha de Check-in es ${new Date(`${reservationDate}T12:00:00`).toLocaleDateString("es-AR")} desde ${data.app.settings?.checkinTime||"el horario definido"} hs.`,icon:"warning"});return}const ok=await showAlert({title:"¿Confirmar el check-in?",text:"La reserva pasará a ser una estadía en curso.",icon:"warning",showCancelButton:true,confirmButtonText:"Confirmar ingreso",cancelButtonText:"Cancelar"});if(!ok)return}const ok=await onSaved({stayId:selected.id,...form,complete},complete?"Check-in confirmado. La estadía está en curso.":"Datos de pre-check-in guardados.");if(ok)setSelected(null)}
 return <section className="tags_guest_checkin">
<header>
<div>
<span>RECEPCIÓN</span>
<h2>Checkin</h2>
<p>Completá pasajeros y vehículo antes de confirmar el ingreso.</p>
</div>
</header><div className="tags_guest_checkin_filters"><label>Buscar reserva<input type="search" placeholder="Código, DNI o nombre" value={search} onChange={event=>setSearch(event.target.value)}/></label><label>Estado<select value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Todas</option><option value="ready">Con pre-check-in</option><option value="pending">Pre-check-in pendiente</option></select></label></div>
<div className="tags_guest_checkin_list">{reservations.map(item=>
<article key={item.id}>
<div>
<strong>{item.stay_code} · {item.guest_name}</strong>
<span>{item.unit_name} · {new Date(item.starts_at).toLocaleDateString("es-AR")}</span>
</div>
<span className={`tags_guest_checkin_badge ${["reviewed","submitted"].includes(item.precheckin_status)?"is_ready":"is_pending"}`}>{["reviewed","submitted"].includes(item.precheckin_status)?"Pre-check-in realizado":"Pre-check-in pendiente"}</span>
<button type="button" onClick={()=>open(item)}>
<FaUserCheck/> Gestionar check-in</button>
</article>)}{!reservations.length&&<p>No hay reservas pendientes de check-in.</p>}</div>{selected&&<div className="tags_guest_checkin_backdrop">
<section className="tags_guest_checkin_modal">
<header>
<div>
<span>RESERVA {selected.stay_code}</span>
<h2>{selected.guest_name}</h2>
<p>DNI {selected.document_number} · {selected.guest_email} · {selected.guest_phone}</p>
<span className={`tags_guest_checkin_badge ${["reviewed","submitted"].includes(selected.precheckin_status)?"is_ready":"is_pending"}`}>{["reviewed","submitted"].includes(selected.precheckin_status)?"Pre-check-in realizado":"Pre-check-in pendiente"}</span>
</div>
<button type="button" onClick={()=>setSelected(null)}>
<FaXmark/>
</button>
</header>
<fieldset>
<legend>Acompañantes</legend>{form.companions.map((person,index)=>
<div className="tags_guest_checkin_person" key={index}>
<input required placeholder="Nombre" value={person.firstName} onChange={e=>updateCompanion(index,"firstName",e.target.value)}/>
<input required placeholder="Apellido" value={person.lastName} onChange={e=>updateCompanion(index,"lastName",e.target.value)}/>
<input required placeholder="DNI" value={person.documentNumber} onChange={e=>updateCompanion(index,"documentNumber",e.target.value)}/>
<button type="button" onClick={()=>setForm({...form,companions:form.companions.filter((_,i)=>i!==index)})}>
<FaXmark/>
</button>
</div>)}<button type="button" onClick={()=>setForm({...form,companions:[...form.companions,{...EMPTY}]})}>
<FaPlus/> Agregar acompañante</button>
</fieldset>
<fieldset>
<legend>
<FaCar/> Vehículo</legend>
<label>Patente<input value={form.vehiclePlate} onChange={e=>setForm({...form,vehiclePlate:e.target.value.toUpperCase()})}/>
</label>
<label>Marca y modelo<input value={form.vehicleMakeModel} onChange={e=>setForm({...form,vehicleMakeModel:e.target.value})}/>
</label>
<label>Color<input value={form.vehicleColor} onChange={e=>setForm({...form,vehicleColor:e.target.value})}/>
</label>
<label>Llegada estimada<input type="text" placeholder="Ej. entre las 18 y las 19" value={form.expectedArrivalText} onChange={e=>setForm({...form,expectedArrivalText:e.target.value})}/>
</label>
</fieldset>
<div className="tags_guest_checkin_actions">
<button disabled={busy} type="button" onClick={()=>save(false)}>Guardar sin confirmar</button>
<button disabled={busy} type="button" onClick={()=>save(true)}>Confirmar check-in</button>
</div>
</section>
</div>}{loading&&<p>Cargando datos…</p>}</section>
}

