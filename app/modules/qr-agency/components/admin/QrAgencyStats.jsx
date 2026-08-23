"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaChartLine, FaDownload } from "react-icons/fa";
import { toPng } from "html-to-image";
import TimelineChart from "@/app/components/stats/TimeLineChart";
import QrsClicks from "@/app/components/stats/QrsClicks";
import DeviceChart from "@/app/components/stats/DeviceChart";
import CityChart from "@/app/components/stats/CityChart";
import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";

const EMPTY = { ok: true, customers: [], qrs: [], stats: { summary: {}, timeline: [], qrStats: [], geo: { countries: [], provinces: [], cities: [] }, devices: [], movements: [] } };

export default function QrAgencyStats({ businessId }) {
    const [data, setData] = useState(EMPTY);
    const [customerId, setCustomerId] = useState("all");
    const [qrId, setQrId] = useState("all");
    const [days, setDays] = useState("30");
    const [busy, setBusy] = useState(false);
    const timelineRef = useRef(null);
    const qrsRef = useRef(null);
    const deviceRef = useRef(null);
    const cityRef = useRef(null);

    const visibleQrs = useMemo(() => data.qrs.filter((qr) => customerId === "all" || String(qr.customer_id) === customerId), [data.qrs, customerId]);

    async function load() {
        setBusy(true);
        try {
            const params = new URLSearchParams({ businessId, days });
            if (customerId !== "all") params.set("customerId", customerId);
            if (qrId !== "all") params.set("qrId", qrId);
            const response = await fetch(`/api/qr-agency/admin/stats?${params}`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "No se pudieron cargar las estadísticas");
            setData(result);
        } catch (error) {
            await showAlert({ title: "No se pudo cargar", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    useEffect(() => { load(); }, [businessId, customerId, qrId, days]);
    useEffect(() => { setQrId("all"); }, [customerId]);

    async function chartImage(ref) {
        if (!ref.current) return null;
        return toPng(ref.current, {
            cacheBust: true,
            backgroundColor: "#fff",
            pixelRatio: 2,
            filter: (node) => {
                const tag = node?.tagName?.toLowerCase();
                const classes = typeof node?.className === "string" ? node.className : "";
                return tag !== "table" && !classes.includes("table-responsive");
            }
        });
    }

    async function exportPdf() {
        setBusy(true);
        try {
            const params = new URLSearchParams({ businessId, days });
            if (customerId !== "all") params.set("customerId", customerId);
            if (qrId !== "all") params.set("qrId", qrId);
            const response = await fetch(`/api/qr-agency/admin/stats/pdf?${params}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ charts: { timeline: await chartImage(timelineRef), qrsClicks: await chartImage(qrsRef), city: await chartImage(cityRef), device: await chartImage(deviceRef) } }) });
            if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "No se pudo generar el PDF");
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a"); link.href = url; link.download = `qr-agency-stats-${businessId}.pdf`; link.click(); URL.revokeObjectURL(url);
        } catch (error) { await showAlert({ title: "No se pudo generar", text: error.message, icon: "error" }); }
        finally { setBusy(false); }
    }

    const stats = data.stats || EMPTY.stats;
    return <section className="tags_qr_agency_stats">
        {busy && <TagsSpinner size={110} logoSize={58} borderSize={5} background="rgba(247,250,248,.82)" />}
        <header className="tags_qr_agency_stats_header"><div><FaChartLine /><span><h2>Estadísticas</h2><p>Consultá el rendimiento de todos tus clientes y códigos QR.</p></span></div><button type="button" onClick={exportPdf}><FaDownload /> Exportar PDF</button></header>
        <div className="tags_qr_agency_stats_filters"><label>Cliente<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="all">Todos los clientes</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}</select></label><label>QR<select value={qrId} onChange={(event) => setQrId(event.target.value)}><option value="all">Todos los QRs del cliente</option>{visibleQrs.map((qr) => <option key={qr.id} value={qr.id}>{qr.code} · {qr.label || "Sin nombre"}</option>)}</select></label><label>Período<select value={days} onChange={(event) => setDays(event.target.value)}><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="365">Últimos 365 días</option></select></label></div>
        <div className="tags_qr_agency_stats_kpis"><article><span>Clicks</span><strong>{Number(stats.summary?.totalClicks || 0)}</strong></article><article><span>Usuarios únicos</span><strong>{Number(stats.summary?.uniqueClicks || 0)}</strong></article><article><span>QRs incluidos</span><strong>{stats.qrStats?.length || 0}</strong></article></div>
        <div className="tags_qr_agency_stats_grid"><div className="tags_qr_agency_stats_card" ref={timelineRef}><TimelineChart data={stats.timeline || []} /></div><div className="tags_qr_agency_stats_card" ref={qrsRef}><QrsClicks data={stats.qrStats || []} /></div><div className="tags_qr_agency_stats_card" ref={cityRef}><CityChart data={stats.geo?.cities || []} /></div><div className="tags_qr_agency_stats_card" ref={deviceRef}><DeviceChart data={stats.devices || []} /></div></div>
        <div className="tags_qr_agency_stats_card tags_qr_agency_stats_movements"><h3>Movimientos recientes</h3><div className="table-responsive"><table><thead><tr><th>Fecha</th><th>QR</th><th>Cliente</th><th>País</th><th>Provincia</th><th>Ciudad</th><th>Dispositivo</th></tr></thead><tbody>{(stats.movements || []).map((item, index) => <tr key={`${item.created_at}-${index}`}><td>{new Date(item.created_at).toLocaleString("es-AR")}</td><td>{item.code}</td><td>{data.qrs.find((qr) => qr.id === item.qr_code_id)?.customer_name || "-"}</td><td>{item.country || "-"}</td><td>{item.region || "-"}</td><td>{item.city || "-"}</td><td>{item.device_type || "-"}</td></tr>)}</tbody></table></div></div>
    </section>;
}
