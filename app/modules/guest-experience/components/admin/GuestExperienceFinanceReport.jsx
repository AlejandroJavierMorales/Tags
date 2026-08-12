"use client";import{useEffect,useState}from"react";import{FaArrowLeft,FaEye,FaPen,FaXmark}from"react-icons/fa6";import TagsSpinner from"@/app/components/TagsSpinner";import showAlert from"@/app/components/showAlert";import GuestExperienceStayPreviewModal from"./GuestExperienceStayPreviewModal";import"./GuestExperienceFinanceReport.css";import"./GuestExperienceFinanceReportActions.css";
const iso=date=>date.toISOString().slice(0,10),money=value=>`$ ${Number(value||0).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const stayState=status=>status==="active"?"En curso":status==="checked_out"?"Concluida":"Pendiente";
const checkinState=item=>["active","checked_out"].includes(item.status)?{label:"Confirmado",kind:"confirmed"}:["submitted","reviewed"].includes(item.precheckin_status)?{label:"Pre-Check-in recibido",kind:"received"}:{label:"Pre-Check-in pendiente",kind:"pending"};
export default function GuestExperienceFinanceReport({businessId,data,onBack,onManage}){const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),1),last=new Date(now.getFullYear(),now.getMonth()+1,0),[from,setFrom]=useState(iso(first)),[to,setTo]=useState(iso(last)),[search,setSearch]=useState(""),[report,setReport]=useState(null),[busy,setBusy]=useState(false),[selected,setSelected]=useState(null),[previewId,setPreviewId]=useState(null);async function load(){setBusy(true);try{const r=await fetch(`/api/guest-experience/admin/finance-report?businessId=${businessId}&guestAppId=${data.app.id}&from=${from}&to=${to}&search=${encodeURIComponent(search.trim())}`,{cache:"no-store"}),p=await r.json();if(!r.ok)return showAlert({title:"No se pudo cargar",text:p.error,icon:"error"});setReport(p)}finally{setBusy(false)}}useEffect(()=>{load()},[]);useEffect(()=>{if(!report&&!search)return;const timer=setTimeout(()=>load(),350);return()=>clearTimeout(timer)},[search]);return <section className="tags_guest_finance">
<header>
<div>
<span>ADMINISTRACIÓN</span>
<h2>Estadías y pagos</h2>
<p>Ventas, cobros y saldos según la fecha de ingreso.</p>
</div>
<button type="button" onClick={onBack}>
<FaArrowLeft/> Volver</button>
</header>
<form className="tags_guest_finance_filters" onSubmit={event=>{event.preventDefault();load()}}>
<label>Ingresos desde<input type="date" required value={from} onChange={event=>setFrom(event.target.value)}/>
</label>
<label>Ingresos hasta<input type="date" required value={to} onChange={event=>setTo(event.target.value)}/>
</label>
<label>Buscar<input type="search" placeholder="Código, cliente o DNI" value={search} onChange={event=>setSearch(event.target.value)}/></label>
<button disabled={busy}>Aplicar filtros</button>
</form>{report&&<>
<div className="tags_guest_finance_kpis">
<article>
<span>Total vendido</span>
<strong>{money(report.kpis.sold)}</strong>
</article>
<article>
<span>Total cobrado</span>
<strong>{money(report.kpis.paid)}</strong>
</article>
<article className="due">
<span>Pendiente de pago</span>
<strong>{money(report.kpis.due)}</strong>
</article>
</div>
<div className="tags_guest_finance_table_wrap">
<table>
<thead>
<tr>
<th>Código</th>
<th>Cliente</th>
<th>Ingreso</th>
<th>Egreso</th>
<th>Pasajeros</th>
<th>Noches</th>
<th>Precio/noche</th>
<th>Total</th>
<th>Pagado</th>
<th>Adeudado</th>
<th>Checkin</th>
<th>Estado</th>
<th>Acciones</th>
</tr>
</thead>
<tbody>{report.items.map(item=>
<tr key={item.id}>
<td>
<strong>{item.stay_code}</strong>
</td>
<td>{item.guest_name}</td>
<td>{new Date(item.starts_at).toLocaleDateString("es-AR")}</td>
<td>{new Date(item.ends_at).toLocaleDateString("es-AR")}</td>
<td>{item.passengers}</td>
<td>{item.nights}</td>
<td className="number">{money(item.nightly_rate)}</td>
<td className="number">{money(item.lodging_total)}</td>
<td className="number">
<button type="button" className="tags_guest_finance_paid" onClick={()=>setSelected(item)}>{money(item.paid_total)}</button>
</td>
<td className="number due">{money(item.due_total)}</td>
<td><span className={`tags_guest_finance_checkin is_${checkinState(item).kind}`}>{checkinState(item).label}</span></td>
<td><span className={`tags_guest_finance_stay_status status_${item.status}`}>{stayState(item.status)}</span></td>
<td><div className="tags_guest_finance_actions"><button type="button" title="Gestionar reserva, pagos y check-in" onClick={()=>onManage(item.id)}><FaPen/></button><button type="button" title="Ver Mi Estadía" onClick={()=>setPreviewId(item.id)}><FaEye/></button></div></td>
</tr>)}{!report.items.length&&<tr>
<td colSpan="13" className="empty">No hay estadías en el período.</td>
</tr>}</tbody>
</table>
</div>
</>}{selected&&<div className="tags_guest_finance_backdrop" onMouseDown={()=>setSelected(null)}>
<section className="tags_guest_finance_modal" onMouseDown={event=>event.stopPropagation()}>
<header>
<div>
<span>COBROS DE {selected.stay_code}</span>
<h3>{selected.guest_name}</h3>
</div>
<button type="button" onClick={()=>setSelected(null)}>
<FaXmark/>
</button>
</header>
<div>{selected.payments.map(payment=>
<article key={payment.id}>
<div>
<strong>{money(payment.amount)}</strong>
<span>{payment.description}</span>
</div>
<dl>
<div>
<dt>Medio</dt>
<dd>{payment.payment_method}</dd>
</div>
<div>
<dt>Referencia</dt>
<dd>{payment.reference||"Sin referencia"}</dd>
</div>
<div>
<dt>Fecha</dt>
<dd>{new Date(payment.received_at).toLocaleString("es-AR")}</dd>
</div>
</dl>
</article>)}{!selected.payments.length&&<p>No hay cobros imputados.</p>}</div>
<footer>
<span>Total pagado</span>
<strong>{money(selected.paid_total)}</strong>
</footer>
</section>
</div>}{previewId&&<GuestExperienceStayPreviewModal businessId={businessId} guestAppId={data.app.id} stayId={previewId} onClose={()=>setPreviewId(null)}/>} {busy&&<TagsSpinner size={110} logoSize={58} borderSize={5} background="rgba(255,255,255,.72)"/>}</section>}

