"use client";

import { useEffect, useState } from "react";
import { FaArrowLeft, FaChartColumn, FaEye, FaFilePdf, FaPen, FaXmark } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import GuestExperienceStayPreviewModal from "./GuestExperienceStayPreviewModal";
import "./GuestExperienceFinanceReport.css";
import "./GuestExperienceFinanceReportActions.css";

const iso = date => date.toISOString().slice(0, 10);
const money = value => `$ ${Number(value || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString("es-AR");
const paymentMethodLabel = value => ({ cash: "Efectivo", transfer: "Transferencia", debit: "Débito", credit: "Crédito", other: "Otro" }[value] || value || "No informado");
const stayState = status => status === "active" ? "En curso" : status === "checked_out" ? "Concluida" : status === "cancelled" ? "Cancelada" : status === "no_show_rebooking" ? "Pendiente de reprogramación" : "Pendiente";
const checkinState = item => ["active", "checked_out"].includes(item.status) ? { label: "Confirmado", kind: "confirmed" } : ["submitted", "reviewed"].includes(item.precheckin_status) ? { label: "Pre-Check-in recibido", kind: "received" } : { label: "Pre-Check-in pendiente", kind: "pending" };

export default function GuestExperienceFinanceReport({ businessId, data, onBack, onManage }) {
    const now = new Date();
    const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
    const [to, setTo] = useState(iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    const [search, setSearch] = useState("");
    const [useDateRange, setUseDateRange] = useState(true);
    const [showStatistics, setShowStatistics] = useState(false);
    const [showFinancialStats, setShowFinancialStats] = useState(true);
    const [report, setReport] = useState(null);
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState(null);
    const [previewId, setPreviewId] = useState(null);

    async function load() {
        setBusy(true);
        try {
            const response = await fetch(`/api/guest-experience/admin/finance-report?businessId=${businessId}&guestAppId=${data.app.id}&from=${from}&to=${to}&useDateRange=${useDateRange}&search=${encodeURIComponent(search.trim())}`, { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) return showAlert({ title: "No se pudo cargar", text: payload.error, icon: "error" });
            setReport(payload);
        } finally { setBusy(false); }
    }

    useEffect(() => { load(); }, []);
    useEffect(() => { if (!report && !search) return; const timer = setTimeout(load, 350); return () => clearTimeout(timer); }, [search]);

    function openPdf() {
        const params = new URLSearchParams({ businessId: String(businessId), guestAppId: String(data.app.id), from, to, useDateRange: String(useDateRange), search: search.trim() });
        window.open(`/api/guest-experience/admin/finance-report/pdf?${params}`, "_blank", "noopener,noreferrer");
    }

    return <section className="tags_guest_finance">
        <header><div><span>ADMINISTRACIÓN</span><h2>Estadías y pagos</h2><p>Ventas, cobros y saldos según la fecha de ingreso.</p></div><button type="button" onClick={onBack}><FaArrowLeft /> Volver</button></header>
        <form className="tags_guest_finance_filters" onSubmit={event => { event.preventDefault(); load(); }}>
            <label className="tags_guest_finance_range_toggle"><input type="checkbox" checked={useDateRange} onChange={event => setUseDateRange(event.target.checked)} /> Tener en cuenta el rango de fechas</label>
            <label>Ingresos desde<input type="date" required={useDateRange} disabled={!useDateRange} value={from} onChange={event => setFrom(event.target.value)} /></label>
            <label>Ingresos hasta<input type="date" required={useDateRange} disabled={!useDateRange} value={to} onChange={event => setTo(event.target.value)} /></label>
            <label>Buscar<input type="search" placeholder="Código, cliente o DNI" value={search} onChange={event => setSearch(event.target.value)} /></label>
            <button disabled={busy}>Aplicar filtros</button><button type="button" className="tags_guest_finance_pdf" onClick={openPdf}><FaFilePdf /> PDF</button>
            {useDateRange && <button type="button" className="tags_guest_finance_stats_button" onClick={() => setShowStatistics(value => !value)}><FaChartColumn /> {showStatistics ? "Ocultar estadísticas" : "Ver estadísticas"}</button>}
        </form>
        {showStatistics && report?.statistics && <div className="tags_guest_statistics_backdrop" onMouseDown={() => setShowStatistics(false)}><section className="tags_guest_statistics" role="dialog" aria-modal="true" aria-label="Informe de ocupación" onMouseDown={event => event.stopPropagation()}>
            <button type="button" className="tags_guest_statistics_close" title="Cerrar" onClick={() => setShowStatistics(false)}><FaXmark /></button>
            <header>{data.app.logo_url && <img src={data.app.logo_url} alt={`Logo de ${data.app.name}`} />}<h3>{data.app.name}</h3><span>INFORME DE OCUPACIÓN</span><p>{dateLabel(report.period.from)} al {dateLabel(report.period.to)}</p></header>
            <div className="tags_guest_statistics_kpis"><article><span>Ocupación</span><strong>{Number(report.statistics.occupancyPercentage).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%</strong><small>{report.statistics.occupiedNights} de {report.statistics.availableNights} noches disponibles</small></article><article><span>Estadía promedio</span><strong>{Number(report.statistics.averageStayNights).toLocaleString("es-AR", { maximumFractionDigits: 1 })}</strong><small>noches dentro del período</small></article>{showFinancialStats && <article><span>Total vendido</span><strong>{money(report.statistics.totalSold)}</strong><small>correspondiente al período</small></article>}</div>
            <div className="tags_guest_statistics_controls"><label><input type="checkbox" checked={showFinancialStats} onChange={event => setShowFinancialStats(event.target.checked)} /> Mostrar tarifa promedio y total vendido</label></div>
            <div className="tags_guest_statistics_units"><h4>Noches por unidad</h4>{report.statistics.units.map(unit => <article key={unit.unitId}><div><strong>{unit.name}</strong><span>{unit.nights} noches</span></div><div className="tags_guest_statistics_bar"><i style={{ width: `${report.statistics.periodDays ? Math.min(100, unit.nights / report.statistics.periodDays * 100) : 0}%` }} /></div>{showFinancialStats && <dl><div><dt>Tarifa promedio</dt><dd>{money(unit.averageRate)}</dd></div><div><dt>Total vendido</dt><dd>{money(unit.sold)}</dd></div></dl>}</article>)}</div>
        </section></div>}
        {report && <><div className="tags_guest_finance_kpis"><article><span>Total vendido</span><strong>{money(report.kpis.sold)}</strong></article><article><span>Total cobrado</span><strong>{money(report.kpis.paid)}</strong></article><article className="due"><span>Pendiente de pago</span><strong>{money(report.kpis.due)}</strong></article></div><div className="tags_guest_finance_table_wrap"><table><thead><tr><th>Código</th><th>Cliente</th><th>Ingreso</th><th>Egreso</th><th>Pasajeros</th><th>Noches</th><th>Precio/noche</th><th>Total</th><th>Pagado</th><th>Adeudado</th><th>Check-in</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{report.items.map(item => { const checkin = checkinState(item); const checkoutEnabled = item.status === "active"; return <tr key={item.id}><td><strong>{item.stay_code}</strong></td><td>{item.guest_name}</td><td>{new Date(item.starts_at).toLocaleDateString("es-AR")}</td><td>{new Date(item.ends_at).toLocaleDateString("es-AR")}</td><td>{item.passengers}</td><td>{item.nights}</td><td className="number">{money(item.nightly_rate)}</td><td className="number">{money(item.lodging_total)}</td><td className="number"><button type="button" className="tags_guest_finance_paid" onClick={() => setSelected(item)}>{money(item.paid_total)}</button></td><td className="number due">{money(item.due_total)}</td><td><span className={`tags_guest_finance_checkin is_${checkin.kind}`}>{checkin.label}</span></td><td><span className={`tags_guest_finance_stay_status status_${item.status}`}>{stayState(item.status)}</span></td><td><div className="tags_guest_finance_actions"><button type="button" title="Gestionar reserva, pagos y check-in" onClick={() => onManage(item.id)}><FaPen /></button><button type="button" title="Ver Mi Estadía" onClick={() => setPreviewId(item.id)}><FaEye /></button><button type="button" className="tags_guest_finance_checkout" disabled={!checkoutEnabled} title={checkoutEnabled ? "Confirmar checkout" : "Se habilita después del check-in"} onClick={() => onManage({ checkout: true, id: item.id, status: item.status })}>↪</button></div></td></tr>; })}{!report.items.length && <tr><td colSpan="13" className="empty">No hay estadías para los filtros seleccionados.</td></tr>}</tbody></table></div></>}
        {selected && <div className="tags_guest_finance_backdrop" onMouseDown={() => setSelected(null)}><section className="tags_guest_finance_modal" onMouseDown={event => event.stopPropagation()}><header><div><span>COBROS DE {selected.stay_code}</span><h3>{selected.guest_name}</h3></div><button type="button" onClick={() => setSelected(null)}><FaXmark /></button></header><div>{selected.payments.map(payment => <article key={payment.id}><div><strong>{money(payment.amount)}</strong><span>{payment.description}</span></div><dl><div><dt>Medio</dt><dd>{paymentMethodLabel(payment.payment_method)}</dd></div><div><dt>Fecha imputada</dt><dd>{new Date(payment.received_at).toLocaleString("es-AR")}</dd></div><div><dt>Referencia</dt><dd>{payment.reference || "Sin referencia"}</dd></div>{payment.notes && <div className="wide"><dt>Detalle / cuenta de destino</dt><dd>{payment.notes}</dd></div>}</dl></article>)}{!selected.payments.length && <p>No hay cobros imputados.</p>}</div><footer><span>Total pagado</span><strong>{money(selected.paid_total)}</strong></footer></section></div>}
        {previewId && <GuestExperienceStayPreviewModal businessId={businessId} guestAppId={data.app.id} stayId={previewId} onClose={() => setPreviewId(null)} />}
        {busy && <TagsSpinner size={110} logoSize={58} borderSize={5} background="rgba(255,255,255,.72)" />}
    </section>;
}
