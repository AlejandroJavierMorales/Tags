"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FaArrowRight, FaAward, FaGift, FaRightToBracket, FaStore } from "react-icons/fa6";
import "@/app/fidelizacion/loyalty-user.css";

const requirement = reward => reward.required_points ? `${reward.required_points} puntos` : reward.required_stamps ? `${reward.required_stamps} sellos` : reward.required_visits ? `${reward.required_visits} visitas` : "Consultar condiciones";

export default function LoyaltyBusinessPublicPage({ programId, business, channel }) {
    const brand = channel?.brandConfig || {};
    const name = business?.display_name || business?.name || "El comercio";
    const logo = business?.logo_url || brand.logoUrl || brand.logo_url || "/logo_tags_transparente.webp";
    const primary = brand.primaryColor || "#0fb957";
    const [state, setState] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`/api/loyalty/member/program?program_id=${encodeURIComponent(programId)}`, { cache: "no-store" })
            .then(async response => { const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.success) throw new Error(payload.error || "No se pudo cargar el programa"); return payload; })
            .then(setState).catch(currentError => setError(currentError.message));
    }, [programId]);

    function goLogin() {
        const next = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/fidelizacion";
        window.location.href = `/login?returnTo=${encodeURIComponent(next)}&choose=1`;
    }

    if (error) return <main className="tags_loyalty_page"><div className="alert alert-danger">{error}</div></main>;
    if (!state?.program) return <main className="tags_loyalty_page"><div className="tags_loyalty_loading">Cargando fidelización...</div></main>;
    const { program, joined, account } = state;
    const currentBalance = program.mechanic === "points" ? `${Number(account?.points_balance || 0).toLocaleString("es-AR")} puntos` : program.mechanic === "stamps" ? `${Number(account?.stamps_balance || 0)} sellos` : `${Number(account?.visits_balance || 0)} visitas`;

    return <main className="tags_loyalty_page" style={{ "--tags-loyalty-primary": primary }}>
        <header className="tags_loyalty_brand"><div><Image src={logo} alt={name} width={150} height={84} priority /></div><button type="button" onClick={goLogin}><FaRightToBracket /> {joined ? "Mi cuenta" : "Ingresar"}</button></header>
        <section className="tags_loyalty_hero"><div><small>PROGRAMA DE {name.toUpperCase()}</small><h1>{program.name}</h1><p>{program.description || "Sumate y accedé a beneficios y recompensas por elegirnos."}</p>{joined ? <strong className="tags_loyalty_balance">Tu saldo: {currentBalance}</strong> : <button type="button" onClick={goLogin}><FaGift /> Ingresar para participar <FaArrowRight /></button>}</div><div className="tags_loyalty_hero_icon"><FaGift /></div></section>
        <section className="tags_loyalty_section"><header><div><i><FaAward /></i><span><small>BENEFICIOS</small><h2>Recompensas disponibles</h2></span></div><em>{program.rewards?.length || 0}</em></header><div className="tags_loyalty_preview">{program.rewards?.length ? program.rewards.map(reward => <article key={reward.id}><i><FaAward /></i><div><strong>{reward.name}</strong><span>{reward.description || "Beneficio para clientes del comercio"}</span></div><b>{requirement(reward)}</b></article>) : <p className="tags_loyalty_empty">Todavía no hay recompensas publicadas.</p>}</div></section>
        <section className="tags_loyalty_section"><p className="tags_loyalty_empty">Para solicitar un canje, presentá tu código personal en el comercio. El establecimiento confirmará la entrega del beneficio.</p></section>
    </main>;
}
