"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaCircleCheck, FaCopy, FaDownload, FaEye, FaLink, FaMobileScreenButton, FaPause, FaPen, FaPlay, FaPlus, FaQrcode, FaTriangleExclamation, FaTrash, FaXmark } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./QrAgencyQrs.css";
import "./QrAgencyQrsUrls.css";

const EMPTY = { assignmentId: 0, customerId: "", label: "", finalUrl: "", status: "paused", stopMessage: "Este código QR está temporalmente fuera de servicio.", browserGeolocationEnabled: false };
async function resultOf(response) { const text = await response.text(); if (!text) return {}; try { return JSON.parse(text); } catch { return {}; } }

export default function QrAgencyQrs({ businessId, onChanged }) {
    const [data, setData] = useState({ qrs: [], customers: [], usage: {} });
    const [busy, setBusy] = useState(false);
    const [modal, setModal] = useState(false);
    const [preview, setPreview] = useState(null);
    const [nfcModal, setNfcModal] = useState(null);
    const nfcAbortRef = useRef(null);
    const [form, setForm] = useState(EMPTY);
    const [customerFilter, setCustomerFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    async function load() {
        setBusy(true);
        try {
            const response = await fetch(`/api/qr-agency/admin/qrs?businessId=${businessId}`, { cache: "no-store" });
            const payload = await resultOf(response);
            if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los QRs");
            setData(payload);
        } catch (error) { await showAlert({ title: "No se pudieron cargar los QRs", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }
    useEffect(() => { load(); }, [businessId]);
    const filtered = useMemo(() => data.qrs.filter(item => (!customerFilter || String(item.customer_id) === customerFilter) && (!statusFilter || (statusFilter === "unassigned" ? !item.customer_id : item.assignment_status === statusFilter))), [data.qrs, customerFilter, statusFilter]);
    function open(item = null) {
        setForm(item ? { assignmentId: item.assignment_id, customerId: item.customer_id ? String(item.customer_id) : "", label: item.label || "", finalUrl: item.final_url || "", status: item.assignment_status, stopMessage: item.stop_message || EMPTY.stopMessage, browserGeolocationEnabled: Number(item.browser_geolocation_enabled) === 1 } : { ...EMPTY });
        setModal(true);
    }
    async function save(event) {
        event.preventDefault(); setBusy(true);
        try {
            const response = await fetch("/api/qr-agency/admin/qrs", { method: form.assignmentId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, ...form }) });
            const payload = await resultOf(response);
            if (!response.ok) throw new Error([payload.error, payload.detail].filter(Boolean).join(" · ") || "No se pudo guardar el QR");
            setModal(false); await load(); await onChanged?.(); await showAlert({ title: form.assignmentId ? "QR actualizado" : "QR creado", icon: "success", timer: 1300 });
        } catch (error) { await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }
    function writeNfc(url) {
        setNfcModal({ url, status: "ready", error: "" });
    }
    async function startNfcWrite() {
        if (!nfcModal) return;
        if (typeof window === "undefined" || !("NDEFReader" in window)) {
            setNfcModal(current => ({ ...current, status: "error", error: "NFC no está disponible. Usá Android Chrome con HTTPS y un tag NFC compatible." }));
            return;
        }
        setNfcModal(current => ({ ...current, status: "writing", error: "" }));
        const controller = new AbortController();
        nfcAbortRef.current = controller;
        try {
            const ndef = new window.NDEFReader();
            await ndef.write({ records: [{ recordType: "url", data: nfcModal.url }] }, { signal: controller.signal });
            setNfcModal(current => ({ ...current, status: "success" }));
        } catch (error) {
            if (error?.name === "AbortError") setNfcModal(current => ({ ...current, status: "cancelled" }));
            else setNfcModal(current => ({ ...current, status: "error", error: error?.message || "No se pudo grabar el tag NFC." }));
        } finally {
            nfcAbortRef.current = null;
        }
    }
    function cancelNfcWrite() { nfcAbortRef.current?.abort(); setNfcModal(current => current ? ({ ...current, status: "cancelled" }) : current); }
    async function copyUrl(url) { try { await navigator.clipboard.writeText(url); await showAlert({ title: "URL copiada", icon: "success", timer: 1000 }); } catch { await showAlert({ title: "No se pudo copiar", text: "Copiá la URL manualmente.", icon: "error" }); } }
    function changeStatus(item) { setForm({ assignmentId: item.assignment_id, customerId: String(item.customer_id), label: item.label, finalUrl: item.final_url, status: item.assignment_status === "active" ? "paused" : "active", stopMessage: item.stop_message || EMPTY.stopMessage, browserGeolocationEnabled: Number(item.browser_geolocation_enabled) === 1 }); setModal(true); }
    async function archive(item) {
        const confirmed = await showAlert({ title: "Eliminar este QR definitivamente", text: "Se eliminarán el QR, sus registros de escaneo, estadísticas, historial de QR Agency y datos asociados. Esta acción no se puede deshacer.", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar definitivamente", cancelButtonText: "Cancelar" });
        if (!confirmed) return;
        if (false) {
        const ok = await showAlert({ title: "¿Archivar este QR?", text: "Dejará de funcionar y liberará un lugar del cupo.", icon: "warning", showCancelButton: true, confirmButtonText: "Archivar", cancelButtonText: "Cancelar" });
        if (!ok) return;
        }
        setBusy(true);
        try { const response = await fetch("/api/qr-agency/admin/qrs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, assignmentId: item.assignment_id }) }); const payload = await resultOf(response); if (!response.ok) throw new Error(payload.error || "No se pudo eliminar"); await load(); await onChanged?.(); await showAlert({ title: "QR eliminado", text: `${Number(payload.deletedScans || 0)} registros de escaneo eliminados.`, icon: "success", timer: 1600 }); }
        catch (error) { await showAlert({ title: "No se pudo eliminar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }
    return <section className="tags_qra_qrs">
        {busy && <TagsSpinner size={110} logoSize={56} borderSize={4} background="rgba(247,250,248,.82)" />}
        <header><div><FaQrcode /><span><h2>Códigos QR</h2><p>Creá, asigná y administrá los destinos de tus clientes.</p></span></div><button onClick={() => open()} disabled={Number(data.usage.used) >= Number(data.usage.limit)}><FaPlus /> Nuevo QR</button></header>
        <div className="tags_qra_qrs_tools"><strong>{Number(data.usage.used || 0)} de {Number(data.usage.limit || 0)} utilizados</strong><label>Cliente<select value={customerFilter} onChange={event => setCustomerFilter(event.target.value)}><option value="">Todos</option>{data.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label>Estado<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Todos</option><option value="unassigned">Sin asignar</option><option value="active">Activos</option><option value="paused">Pausados</option></select></label></div>
        {!filtered.length ? <p className="tags_qra_qrs_empty">Todavía no hay QRs para mostrar.</p> : <div className="tags_qra_qrs_grid">{filtered.map(item => { const url = `https://www.tags.com.ar/t/${item.code}`; return <article key={item.assignment_id}><div className="tags_qra_qrs_identity"><img src={`/api/qr/download/${item.code}?format=svg&preview=1`} alt={`QR ${item.code}`} /><span><b>{item.label}</b><code>{item.code}</code></span><em className={item.assignment_status}>{!item.customer_id ? "Sin asignar" : item.assignment_status === "active" ? "Activo" : "Pausado"}</em></div><p><strong>{item.customer_name || "Sin cliente asignado"}</strong><small>{item.customer_email || "Asigná el cliente al entregar el cartel"}</small></p><div className="tags_qra_qrs_urls"><span>URL QR/NFC</span><div className="tags_qra_qrs_copy_line"><code>{url}</code><button type="button" title="Copiar URL QR/NFC" onClick={() => copyUrl(url)}><FaCopy /></button><button type="button" title="Grabar en tag NFC desde Android Chrome" onClick={() => writeNfc(url)}><FaMobileScreenButton /></button></div><span>URL Pública</span>{item.final_url ? <a href={item.final_url} target="_blank" rel="noreferrer"><FaLink /> {item.final_url}</a> : <small>Se carga al asignar el cliente</small>}</div><div className="tags_qra_qrs_stats"><span><b>{Number(item.total_clicks || 0)}</b> escaneos</span><span>Último: {item.last_click_at ? new Date(item.last_click_at).toLocaleString("es-AR") : "sin actividad"}</span></div><footer><button title="Vista previa" onClick={() => setPreview(item)}><FaEye /></button><a title="Descargar SVG" href={`/api/qr/download/${item.code}?format=svg`}><FaDownload /></a><button title="Editar" onClick={() => open(item)}><FaPen /></button>{item.customer_id && <button title={item.assignment_status === "active" ? "Pausar" : "Reactivar"} onClick={() => changeStatus(item)}>{item.assignment_status === "active" ? <FaPause /> : <FaPlay />}</button>}<button className="danger" title="Archivar" onClick={() => archive(item)}><FaTrash /></button></footer></article>; })}</div>}
        {modal && <div className="tags_qra_qrs_overlay"><form className="tags_qra_qrs_modal" onSubmit={save}><header><div><FaQrcode /><span><h3>{form.assignmentId ? "Editar QR" : "Nuevo QR"}</h3><p>El código impreso no cambia al modificar el destino.</p></span></div><button type="button" onClick={() => setModal(false)}><FaXmark /></button></header><label>Cliente<select value={form.customerId} onChange={event => setForm({ ...form, customerId: event.target.value, status: event.target.value && form.finalUrl ? "active" : "paused" })}><option value="">Sin asignar todavía</option>{data.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}</select></label><label>Nombre del QR<input required value={form.label} onChange={event => setForm({ ...form, label: event.target.value })} placeholder="Ej.: Cartel de mesa 1" /></label><label>Destino final<input required={Boolean(form.customerId)} type="url" value={form.finalUrl} onChange={event => setForm({ ...form, finalUrl: event.target.value, status: form.customerId && event.target.value ? "active" : "paused" })} placeholder="Se carga al asignar el cliente" /></label><label className="tags_qra_qrs_checkbox"><input type="checkbox" checked={Boolean(form.browserGeolocationEnabled)} onChange={event => setForm({ ...form, browserGeolocationEnabled: event.target.checked })} /> Pedir ubicación del navegador al escanear<div>Si está activo, se mostrará una pantalla intermedia para solicitar el permiso y guardar provincia y ciudad.</div></label>{form.assignmentId > 0 && form.customerId && <label>Estado<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="active">Activo</option><option value="paused">Pausado</option></select></label>}{form.status === "paused" && form.customerId && <label>Mensaje de pausa<textarea required value={form.stopMessage} onChange={event => setForm({ ...form, stopMessage: event.target.value })} /></label>}<footer><button type="button" onClick={() => setModal(false)}>Cancelar</button><button type="submit">Guardar</button></footer></form></div>}
        {preview && <div className="tags_qra_qrs_overlay"><section className="tags_qra_qrs_preview"><button onClick={() => setPreview(null)}><FaXmark /></button><img src={`/api/qr/download/${preview.code}?format=svg&preview=1`} alt={`QR ${preview.code}`} /><h3>{preview.label}</h3><code>{preview.code}</code><a href={`/api/qr/download/${preview.code}?format=png`}><FaDownload /> Descargar PNG</a></section></div>}
        {nfcModal && <div className="tags_qra_qrs_overlay"><section className="tags_qra_qrs_nfc_modal"><button type="button" className="tags_qra_qrs_nfc_close" onClick={() => nfcModal.status === "writing" ? cancelNfcWrite() : setNfcModal(null)}><FaXmark /></button><FaMobileScreenButton className="tags_qra_qrs_nfc_icon" /><h3>Grabar tag NFC</h3><p>Se escribirá esta URL en el tag:</p><code>{nfcModal.url}</code>{nfcModal.status === "ready" && <><p className="tags_qra_qrs_nfc_hint">Acercá el tag NFC a la parte posterior del teléfono y presioná Grabar.</p><footer><button type="button" onClick={() => setNfcModal(null)}>Cancelar</button><button type="button" onClick={startNfcWrite}>Grabar tag</button></footer></>}{nfcModal.status === "writing" && <div className="tags_qra_qrs_nfc_state"><span className="tags_qra_qrs_nfc_spinner" /><strong>Esperando el tag NFC…</strong><small>Mantenelo cerca del teléfono hasta que termine la grabación.</small><button type="button" onClick={cancelNfcWrite}>Cancelar grabación</button></div>}{nfcModal.status === "cancelled" && <div className="tags_qra_qrs_nfc_state"><FaTriangleExclamation /><strong>Grabación cancelada</strong><small>El teléfono dejó de esperar el tag NFC.</small><footer><button type="button" onClick={() => setNfcModal(null)}>Cerrar</button><button type="button" onClick={startNfcWrite}>Reintentar</button></footer></div>}{nfcModal.status === "success" && <div className="tags_qra_qrs_nfc_state success"><FaCircleCheck /><strong>Tag NFC grabado correctamente</strong><small>La URL quedó almacenada en el tag.</small><button type="button" onClick={() => setNfcModal(null)}>Cerrar</button></div>}{nfcModal.status === "error" && <div className="tags_qra_qrs_nfc_state error"><FaTriangleExclamation /><strong>No se pudo grabar el tag</strong><small>{nfcModal.error}</small><footer><button type="button" onClick={() => setNfcModal(null)}>Cerrar</button><button type="button" onClick={startNfcWrite}>Reintentar</button></footer></div>}</section></div>}
    </section>;
}
