"use client";

import { useEffect, useState } from "react";
import { FaArrowLeft, FaAward, FaClockRotateLeft, FaGift, FaStore } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import "@/app/fidelizacion/loyalty-user.css";

const balance = (program, account) => program.mechanic === "points" ? `${Number(account?.points_balance || 0).toLocaleString("es-AR")} puntos` : program.mechanic === "stamps" ? `${Number(account?.stamps_balance || 0)} sellos` : `${Number(account?.visits_balance || 0)} visitas`;
const requirement = reward => reward.required_points ? `${reward.required_points} puntos` : reward.required_stamps ? `${reward.required_stamps} sellos` : reward.required_visits ? `${reward.required_visits} visitas` : "Consultar condiciones";

export default function LoyaltyProgramPageClient({ programId, channel }) {
    const primary = channel?.brandConfig?.primaryColor || "#0fb957";
    const [state, setState] = useState(null), [loading, setLoading] = useState(true), [joining, setJoining] = useState(false);
    const load = () => fetch(`/api/loyalty/member/program?program_id=${programId}`).then(response => response.json()).then(result => { if (!result.success) throw new Error(result.error || "No se pudo cargar el programa"); setState(result); });
    useEffect(() => { load().catch(error => showAlert({ title: "No se pudo cargar", text: error.message, icon: "error" })).finally(() => setLoading(false)); }, [programId]);
    async function join() { setJoining(true); try { const response = await fetch("/api/loyalty/member/program", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ program_id: programId }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo completar la adhesión"); await load(); await showAlert({ title: "Ya participás del programa", icon: "success" }); } catch (error) { await showAlert({ title: "No se pudo completar", text: error.message, icon: "error" }); } finally { setJoining(false); } }
    if (loading) return <main className="tags_loyalty_page"><div className="tags_loyalty_loading">Cargando programa...</div></main>;
    if (!state?.program) return null;
    const { program, joined, account, movements = [] } = state;
    return <main className="tags_loyalty_page" style={{ "--tags-loyalty-primary": primary }}>
        <header className="tags_loyalty_detail_header"><a href="/fidelizacion"><FaArrowLeft /> Volver</a><div><i>{program.business_logo ? <img src={program.business_logo} alt="" /> : <FaStore />}</i><span><small>PROGRAMA DE FIDELIZACIÓN</small><h1>{program.name}</h1><p>{program.business_name}</p></span></div></header>
        <section className="tags_loyalty_program_detail"><h2>{program.description || "Beneficios y recompensas para clientes del negocio."}</h2>{joined ? <strong className="tags_loyalty_balance">Tu saldo: {balance(program, account)}</strong> : <button type="button" onClick={join} disabled={joining}><FaGift /> {joining ? "Adhiriendo..." : "Quiero participar"}</button>}</section>
        <section className="tags_loyalty_section"><header><div><i><FaAward /></i><span><small>DISPONIBLES</small><h2>Recompensas</h2></span></div><em>{program.rewards.length}</em></header><div className="tags_loyalty_preview">{program.rewards.length ? program.rewards.map(reward => <article key={reward.id}><i><FaAward /></i><div><strong>{reward.name}</strong><span>{reward.description || "Recompensa del programa"}</span></div><b>{requirement(reward)}</b></article>) : <p>No hay recompensas publicadas por el momento.</p>}</div></section>
        {joined && <section className="tags_loyalty_section"><header><div><i><FaClockRotateLeft /></i><span><small>ACTIVIDAD</small><h2>Últimos movimientos</h2></span></div><em>{movements.length}</em></header><div className="tags_loyalty_preview">{movements.length ? movements.map(item => <article key={item.id}><i><FaClockRotateLeft /></i><div><strong>{item.description || item.transaction_type}</strong><span>{new Date(item.created_at).toLocaleString("es-AR")}</span></div></article>) : <p>Todavía no tenés movimientos en este programa.</p>}</div></section>}
    </main>;
}
