"use client";

import { useState } from "react";
import { FaArrowLeft, FaCheck, FaClock, FaGift, FaQrcode, FaStore, FaXmark } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import { directoryBenefitLabel } from "@/app/modules/directory/lib/directoryBenefitFormatting";
import "./LoyaltyBenefitBrowser.css";

const dateLabel = value => value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR")
    : "Sin fecha";

function modeLabel(mode) {
    if (mode === "merchant") return "Validación mediante QR o código";
    if (mode === "display") return "Presentación directa en el comercio";
    return "Validación visual en el comercio";
}

async function read(response) {
    const text = await response.text();
    try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

export default function LoyaltyBenefitBrowser({ items = [], compact = false }) {
    const [selected, setSelected] = useState(null);
    const [coupon, setCoupon] = useState(null);
    const [busy, setBusy] = useState(false);

    async function open(item) {
        setSelected(item);
        setCoupon(null);
        if ((item.validation_mode || "visual") === "display") return;
        try {
            const response = await fetch(`/api/loyalty/member/benefit-coupons?benefit_id=${item.id}`, { cache: "no-store" });
            const payload = await read(response);
            if (response.ok) setCoupon(payload.coupon || null);
        } catch { /* El cupón se emitirá recién cuando el usuario lo solicite. */ }
    }

    async function issue() {
        setBusy(true);
        try {
            const response = await fetch("/api/loyalty/member/benefit-coupons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ benefit_id: selected.id })
            });
            const payload = await read(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo preparar el beneficio.");
            setCoupon(payload.coupon || null);
            return payload.coupon || null;
        } catch (error) {
            await showAlert({ title: "No se pudo preparar", text: error.message, icon: "error" });
            return null;
        } finally { setBusy(false); }
    }

    async function useVisual() {
        const ok = await showAlert({
            title: "¿Estás frente al comercio?",
            text: "Activá el beneficio únicamente al momento de utilizarlo. Una vez activado quedará registrado como consumido.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, usar ahora",
            cancelButtonText: "Cancelar"
        });
        if (!ok) return;
        let current = coupon;
        if (!current || current.status !== "issued") current = await issue();
        if (!current || current.status !== "issued") return;
        setBusy(true);
        try {
            const response = await fetch("/api/loyalty/member/benefit-coupons", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coupon_id: current.id })
            });
            const payload = await read(response);
            if (!response.ok) throw new Error(payload.error || "No se pudo activar el beneficio.");
            setCoupon(payload.coupon);
        } catch (error) {
            await showAlert({ title: "No se pudo utilizar", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }

    return <>
        <div className={compact ? "tags_loyalty_benefit_browser is_compact" : "tags_loyalty_benefit_browser"}>
            {items.map(item => <button type="button" key={item.id} className="tags_loyalty_benefit_item" onClick={() => open(item)}>
                {item.image_url ? <img src={item.image_url} alt="" /> : <i><FaGift /></i>}
                <span><strong>{item.name}</strong><small>{item.display_name}</small></span>
                <b>{directoryBenefitLabel(item)}</b>
            </button>)}
        </div>
        {selected && <div className="tags_loyalty_benefit_modal" role="dialog" aria-modal="true">
            <article>
                <button type="button" className="tags_loyalty_benefit_close" onClick={() => setSelected(null)} aria-label="Cerrar"><FaXmark /></button>
                {selected.image_url && <img className="tags_loyalty_benefit_cover" src={selected.image_url} alt="" />}
                <div className="tags_loyalty_benefit_content">
                    <small className="tags_loyalty_benefit_eyebrow"><FaStore /> {selected.display_name}</small>
                    <h2>{selected.name}</h2>
                    <strong className="tags_loyalty_benefit_value">{directoryBenefitLabel(selected)}</strong>
                    {selected.description && <p>{selected.description}</p>}
                    <dl>
                        <div><dt>Vigencia</dt><dd>{dateLabel(selected.valid_from)} al {dateLabel(selected.valid_until)}</dd></div>
                        <div><dt>Uso</dt><dd>{modeLabel(selected.validation_mode)}</dd></div>
                    </dl>
                    {selected.validation_mode === "display" && <div className="tags_loyalty_benefit_display"><FaGift /><span><strong>Presentá esta pantalla</strong><small>El comercio aplicará el beneficio según las condiciones publicadas.</small></span></div>}
                    {(selected.validation_mode || "visual") === "visual" && coupon?.status === "redeemed" && <div className="tags_loyalty_benefit_proof"><FaCheck /><span><strong>BENEFICIO ACTIVADO</strong><b>{new Date(coupon.redeemedAt).toLocaleString("es-AR")}</b><small>Código {coupon.code}</small></span></div>}
                    {selected.validation_mode === "merchant" && coupon && <div className="tags_loyalty_benefit_coupon"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(coupon.qrPayload)}`} alt="QR del beneficio" /><strong>{coupon.code}</strong><small>{coupon.status === "redeemed" ? "Beneficio ya utilizado" : "El comercio puede escanear el QR o ingresar el código"}</small></div>}
                    <footer>
                        <button type="button" className="secondary" onClick={() => setSelected(null)}><FaArrowLeft /> Volver</button>
                        {(selected.validation_mode || "visual") === "visual" && coupon?.status !== "redeemed" && <button type="button" onClick={useVisual} disabled={busy}><FaClock /> {busy ? "Preparando..." : "Usar ahora"}</button>}
                        {selected.validation_mode === "merchant" && !coupon && <button type="button" onClick={issue} disabled={busy}><FaQrcode /> {busy ? "Generando..." : "Generar QR para usar"}</button>}
                    </footer>
                </div>
            </article>
        </div>}
    </>;
}
