"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaChartLine, FaKey, FaLink, FaQrcode, FaUsers } from "react-icons/fa";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import QrAgencyCustomers from "./QrAgencyCustomers";
import QrAgencyQrs from "./QrAgencyQrs";
import "./QrAgencyAdminPage.css";
import "./QrAgencyAdminTier.css";

async function payload(response) {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return {}; }
}

export default function QrAgencyAdminPage({ businessId }) {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [slug, setSlug] = useState("");
    const [tierCode, setTierCode] = useState("agency25");

    async function load() {
        setBusy(true);
        try {
            const response = await fetch(`/api/qr-agency/admin/settings?businessId=${businessId}`, { cache: "no-store" });
            const result = await payload(response);
            if (!response.ok) throw new Error(result.error || "No se pudo cargar QR Agency");
            setData(result);
            setSlug(result.agency?.slug || "");
            if (!result.agency && result.tiers?.length) setTierCode(result.tiers[0].code);
        } catch (error) {
            await showAlert({ title: "No se pudo cargar", text: error.message, icon: "error" });
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => { load(); }, [businessId]);

    async function activate() {
        const confirmed = await showAlert({
            title: "¿Activar Tags QR Agency?",
            text: `Se habilitará el cupo correspondiente al plan ${data?.business?.plan_name || "Agencia"}.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Activar",
            cancelButtonText: "Cancelar"
        });
        if (!confirmed) return;
        setBusy(true);
        try {
            const response = await fetch("/api/workspace/apps/qr-agency/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, tierCode })
            });
            const result = await payload(response);
            if (!response.ok) throw new Error(result.error || "No se pudo activar QR Agency");
            await load();
            await showAlert({ title: "QR Agency activado", icon: "success", timer: 1400 });
        } catch (error) {
            await showAlert({ title: "No se pudo activar", text: error.message, icon: "error" });
        } finally {
            setBusy(false);
        }
    }

    async function saveSlug(event) {
        event.preventDefault();
        const confirmed = await showAlert({
            title: "¿Cambiar la ruta de acceso?",
            text: "Los enlaces enviados anteriormente con la ruta anterior dejarán de funcionar.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Cambiar ruta",
            cancelButtonText: "Cancelar"
        });
        if (!confirmed) return;
        setBusy(true);
        try {
            const response = await fetch("/api/qr-agency/admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, slug })
            });
            const result = await payload(response);
            if (!response.ok) throw new Error(result.error || "No se pudo cambiar la ruta");
            await load();
            await showAlert({ title: "Ruta actualizada", icon: "success", timer: 1400 });
        } catch (error) {
            await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
        } finally {
            setBusy(false);
        }
    }

    const agency = data?.agency;
    const used = Number(agency?.used_qrs || 0);
    const limit = Number(agency?.qr_limit || data?.business?.hard_limit_qrs || 0);
    const available = Math.max(0, limit - used);

    return <main className="tags_qr_agency_admin">
        {busy && <TagsSpinner size={120} logoSize={64} borderSize={5} background="rgba(247,250,248,.82)" />}
        <header className="tags_qr_agency_admin_header">
            <div className="tags_qr_agency_admin_identity"><span><FaQrcode /></span><div><small>MÓDULO DEL NEGOCIO</small><h1>Tags QR Agency</h1><p>Clientes y códigos QR dinámicos administrados por tu agencia.</p></div></div>
            <button type="button" onClick={() => router.push(`/dashboard/businesses/${businessId}`)}><FaArrowLeft /> Volver al negocio</button>
        </header>

        {!data?.addonActive && <section className="tags_qr_agency_admin_notice"><h2>Addon no asignado</h2><p>La plataforma debe asignar Tags QR Agency antes de poder activarlo.</p></section>}

        {data?.addonActive && !agency && <section className="tags_qr_agency_admin_activation"><FaKey /><div><h2>Activá el panel de tu agencia</h2><p>Plan principal: <strong>{data.business.plan_name || "Sin definir"}</strong>. QR Agency se cobrará como addon independiente.</p><label>Modalidad de QR Agency<select value={tierCode} onChange={(event) => setTierCode(event.target.value)}>{(data.tiers || []).map((tier) => <option key={tier.code} value={tier.code}>{tier.name} · hasta {tier.hard_limit_qrs} QR · ${Number(tier.base_price).toLocaleString("es-AR")}</option>)}</select></label></div><button type="button" disabled={busy || !tierCode} onClick={activate}>Activar QR Agency</button></section>}

        {agency && <>
            <section className="tags_qr_agency_admin_kpis">
                <article><FaQrcode /><span>QR utilizados</span><strong>{used} / {limit}</strong></article>
                <article><FaQrcode /><span>QR disponibles</span><strong>{available}</strong></article>
                <article><FaUsers /><span>Clientes activos</span><strong>{Number(agency.customer_count || 0)}</strong></article>
                <article><FaChartLine /><span>Modalidad contratada</span><strong>{agency.tier_name}</strong></article>
            </section>

            <section className="tags_qr_agency_admin_settings">
                <header><FaLink /><div><h2>Acceso de tus clientes</h2><p>Esta será la dirección desde la que solicitarán su enlace privado.</p></div></header>
                <form onSubmit={saveSlug}><label>Ruta de la agencia<div><span>/agency/</span><input required value={slug} onChange={(event) => setSlug(event.target.value)} /></div></label><button disabled={busy || slug === agency.slug}>Guardar ruta</button></form>
                <code>{typeof window !== "undefined" ? window.location.origin : ""}/agency/{agency.slug}/login</code>
            </section>

            <QrAgencyCustomers businessId={businessId} onChanged={load} />

            <QrAgencyQrs businessId={businessId} onChanged={load} />

            <section className="tags_qr_agency_admin_next"><header><h2>Próxima etapa</h2><p>La gestión de clientes ya está disponible. A continuación incorporaremos sus códigos y métricas.</p></header><div><article><FaQrcode /><strong>Códigos QR</strong><span>Creación, destino, asignación y pausa.</span></article><article><FaChartLine /><strong>Estadísticas</strong><span>Escaneos por cliente y QR.</span></article></div></section>
        </>}
    </main>;
}
