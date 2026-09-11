"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FaCalendarCheck, FaChartLine, FaGift, FaGlobe, FaGoogle, FaHotel, FaQrcode, FaRobot, FaStar, FaStore, FaUtensils } from "react-icons/fa6";
import "./BusinessToolsNav.css";

const ICONS = { panel: FaChartLine, guest_experience: FaHotel, store: FaStore, resto: FaUtensils, turnos: FaCalendarCheck, client_reviews: FaStar, qr_agency: FaQrcode, ai_chatbot: FaRobot, google_business_profile: FaGoogle, loyalty: FaGift, directory: FaGlobe, portal_public: FaGlobe };
const LABELS = { panel: "Panel", guest_experience: "Mi Estadía", store: "Tienda", resto: "Resto", turnos: "Turnos", client_reviews: "Reseñas", qr_agency: "QR Agency", ai_chatbot: "ChatBot", loyalty: "Beneficios", directory: "Web", portal_public: "Portal" };

export default function BusinessToolsNav({ businessId }) {
    const pathname = usePathname();
    const router = useRouter();
    const [payload, setPayload] = useState(null);
    useEffect(() => {
        let active = true;
        const isPanelPath = pathname === `/dashboard/businesses/${businessId}` || pathname === `/dashboard/businesses/${businessId}/`;
        if (!isPanelPath) document.body.classList.add("tags_has_business_tools_nav");
        fetch(`/api/business/panel-entry?businessId=${encodeURIComponent(businessId)}`).then(response => response.json()).then(value => { if (active && value?.ok) setPayload(value); }).catch(() => {});
        return () => { active = false; document.body.classList.remove("tags_has_business_tools_nav"); };
    }, [businessId, pathname]);
    const options = useMemo(() => { const list = payload?.options || []; const selected = payload?.selected || "panel"; return [...list].sort((a, b) => a.key === selected ? -1 : b.key === selected ? 1 : 0); }, [payload]);
    const isPanel = pathname === `/dashboard/businesses/${businessId}` || pathname === `/dashboard/businesses/${businessId}/`;
    if (isPanel || !options.length) return null;
    return <nav className="tags_business_tools_nav" aria-label="Navegación entre herramientas">{options.map(option => { const Icon = ICONS[option.key] || FaGlobe; const isActive = pathname === option.path || pathname.startsWith(`${option.path}/`); const label = LABELS[option.key] || option.label; return <button type="button" key={option.key} className={isActive ? "is_active" : ""} onClick={() => router.push(option.path)} title={`Abrir ${label}`}><Icon aria-hidden="true" /><span>{label}</span></button>; })}</nav>;
}
