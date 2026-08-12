"use client";import{useEffect,useState}from"react";import TagsSpinner from"@/app/components/TagsSpinner";import showAlert from"@/app/components/showAlert";import"./GuestExperienceAccountPanel.css";const EMPTY={amount:"",concept:"Seña de reserva",paymentMethod:"cash",reference:""};export default function GuestExperienceAccountPanel({businessId,guestAppId,stayId,onChanged}){const[data,setData]=useState(null),[form,setForm]=useState(EMPTY),[busy,setBusy]=useState(false);async function load(){const r=await fetch(`/api/guest-experience/admin/account?businessId=${businessId}&guestAppId=${guestAppId}&stayId=${stayId}`,{cache:"no-store"}),p=await r.json();if(r.ok)setData(p)}useEffect(()=>{load()},[stayId]);async function save(e){e.preventDefault();setBusy(true);try{const r=await fetch("/api/guest-experience/admin/account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId,guestAppId,stayId,...form})}),p=await r.json();if(!r.ok)return showAlert({title:"No se pudo registrar",text:p.error,icon:"error"});setForm(EMPTY);await load();await onChanged?.();await showAlert({title:"Pago registrado",text:"La cuenta fue actualizada.",icon:"success",timer:1500})}finally{setBusy(false)}}if(!data)return <p>Cargando cuenta…</p>;return <section className="tags_guest_account_panel">
<div className="tags_guest_account_summary">
<span>Total alojamiento<strong>${Number(data.account.lodging_total||0).toLocaleString("es-AR")}</strong>
</span>
<span>Seña requerida<strong>${Number(data.account.deposit_required_amount||0).toLocaleString("es-AR")}</strong>
</span>
<span>Pagado<strong>${Number(data.summary.paid||0).toLocaleString("es-AR")}</strong>
</span>
<span>Saldo<strong>${Number(data.summary.balance||0).toLocaleString("es-AR")}</strong>
</span>
</div>
<form onSubmit={save}>
<label>Monto<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
</label>
<label>Concepto<input required value={form.concept} onChange={e=>setForm({...form,concept:e.target.value})}/>
</label>
<label>Medio<select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}>
<option value="cash">Efectivo</option>
<option value="transfer">Transferencia</option>
<option value="debit">Débito</option>
<option value="credit">Crédito</option>
<option value="other">Otro</option>
</select>
</label>
<label>Referencia<input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/>
</label>
<button disabled={busy}>Imputar pago</button>
</form>
<div className="tags_guest_account_entries">{data.entries.map(item=>
<div key={item.id}>
<span>{item.description}</span>
<strong className={Number(item.total_amount)<0?"payment":""}>${Number(item.total_amount).toLocaleString("es-AR")}</strong>
</div>)}</div><details className="tags_guest_communications_report"><summary>Historial de comunicaciones ({data.communications.length})</summary><div>{data.communications.map(item=><article key={item.id}><span>{item.event_code==="arrival_reminder"?"Recordatorio de ingreso":"Acceso a Mi Estadía"} · {item.channel}</span><strong>{item.status}</strong><small>{new Date(item.created_at).toLocaleString("es-AR")} · {item.recipient||"Sin destinatario"}</small>{item.last_error&&<em>{item.last_error}</em>}</article>)}</div></details>{busy&&<TagsSpinner size={100} logoSize={52} borderSize={4} background="rgba(255,255,255,.72)"/>}</section>}

