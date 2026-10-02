"use client";

import { useEffect, useState } from "react";
import { FaArrowLeft, FaAward, FaClockRotateLeft, FaGift, FaStore } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import LoyaltyPushButton from "@/app/modules/loyalty/components/LoyaltyPushButton";
import "@/app/fidelizacion/loyalty-user.css";

const balance = (program, account) => program.mechanic === "points" ? `${Number(account?.points_balance || 0).toLocaleString("es-AR")} puntos` : program.mechanic === "stamps" ? `${Number(account?.stamps_balance || 0)} sellos` : `${Number(account?.visits_balance || 0)} visitas`;
const requirement = reward => reward.required_points ? `${reward.required_points} puntos` : reward.required_stamps ? `${reward.required_stamps} sellos` : reward.required_visits ? `${reward.required_visits} visitas` : "Consultar condiciones";

function StampProgressCard({ program, account }) {
    const reward = program.rewards.find(item => Number(item.required_stamps) > 0);
    const target = Number(reward?.required_stamps || 0);
    const completed = Number(account?.stamps_balance || 0);
    if (!target) return null;
    const filled = Math.min(completed, target);
    return <section className="tags_loyalty_stamp_card"><div><small>TARJETA DE SELLOS</small><h2>{filled} de {target} sellos</h2><p>{target - filled ? `Te faltan ${target - filled} sellos para ${reward.name}.` : `Ya completaste los sellos para ${reward.name}.`}</p></div><div className="tags_loyalty_stamp_grid">{Array.from({ length: target }, (_, index) => { const done = index < filled; return <span key={index} className={done ? "is_complete" : "is_missing"}>{program.stamp_asset_url ? <img src={program.stamp_asset_url} alt="" /> : <i />}</span>; })}</div></section>;
}

export default function LoyaltyProgramPageClient({ programId, channel, directoryShell = false }) {
    const primary = channel?.brandConfig?.primaryColor || "#0fb957";
    const [state, setState] = useState(null), [loading, setLoading] = useState(true), [joining, setJoining] = useState(false), [redeeming, setRedeeming] = useState(false);
    const load = () => fetch(`/api/loyalty/member/program?program_id=${programId}`, { cache: "no-store" }).then(response => response.json()).then(result => { if (!result.success) throw new Error(result.error || "No se pudo cargar el programa"); setState(result); });
    useEffect(() => { load().catch(error => showAlert({ title: "No se pudo cargar", text: error.message, icon: "error" })).finally(() => setLoading(false)); }, [programId]);
    async function join() { setJoining(true); try { const response = await fetch("/api/loyalty/member/program", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ program_id: programId }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo completar la adhesión"); await load(); await showAlert({ title: "Ya participás del programa", icon: "success" }); } catch (error) { await showAlert({ title: "No se pudo completar", text: error.message, icon: "error" }); } finally { setJoining(false); } }
    async function requestRedemption(reward) { setRedeeming(true); try { const response = await fetch("/api/loyalty/member/program/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ program_id: programId, reward_id: reward.id }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo solicitar el canje"); await showAlert({ title: "Solicitud enviada", text: "El comercio debe confirmarla o rechazarla.", icon: "success" }); } catch (error) { await showAlert({ title: "No se pudo solicitar", text: error.message, icon: "error" }); } finally { setRedeeming(false); } }
    useEffect(() => { const refresh = () => load().catch(() => {}); const interval = window.setInterval(refresh, 10000); window.addEventListener("focus", refresh); return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); }; }, [programId]);
    if (loading) return <main className="tags_loyalty_page"><div className="tags_loyalty_loading">Cargando programa...</div></main>;
    if (!state?.program) return null;
    const { program, joined, account, movements = [], redemptions = [] } = state;
    return <main className="tags_loyalty_page" style={{ "--tags-loyalty-primary": primary }}>
        {directoryShell && <section className="tags_loyalty_business_identity"><div className="tags_loyalty_business_logo">{program.business_logo ? <img src={program.business_logo} alt={program.business_name} /> : <FaStore />}</div><div><small>COMERCIO</small><h1>{program.business_name}</h1><p>{program.phone || program.email || "Comercio adherido al directorio"}</p><LoyaltyPushButton businessId={program.business_id} /></div></section>}
        {!directoryShell && <header className="tags_loyalty_detail_header"><a href="/fidelizacion"><FaArrowLeft /> Volver</a><div><i>{program.business_logo ? <img src={program.business_logo} alt="" /> : <FaStore />}</i><span><small>PROGRAMA DE FIDELIZACIÓN</small><h1>{program.name}</h1><p>{program.business_name}</p></span></div></header>}
        <section className="tags_loyalty_program_detail"><h2>{program.description || "Beneficios y recompensas para clientes del negocio."}</h2>{joined ? <strong className="tags_loyalty_balance">Tu saldo: {balance(program, account)}</strong> : <button type="button" onClick={join} disabled={joining}><FaGift /> {joining ? "Adhiriendo..." : "Quiero participar"}</button>}</section>
        <section className="tags_loyalty_section"><header><div><i><FaAward /></i><span><small>DISPONIBLES</small><h2>Recompensas</h2></span></div><em>{program.rewards.length}</em></header><div className="tags_loyalty_preview">{program.rewards.length ? program.rewards.map(reward => <article key={reward.id}><i><FaAward /></i><div><strong>{reward.name}</strong><span>{reward.description || "Recompensa del programa"}</span></div><b>{requirement(reward)}</b></article>) : <p>No hay recompensas publicadas por el momento.</p>}</div></section>
        {joined && <section className="tags_loyalty_section"><header><div><i><FaClockRotateLeft /></i><span><small>ACTIVIDAD</small><h2>Últimos movimientos</h2></span></div><em>{movements.length}</em></header><div className="tags_loyalty_preview">{movements.length ? movements.map(item => <article key={item.id}><i><FaClockRotateLeft /></i><div><strong>{item.description || item.transaction_type}</strong><span>{new Date(item.created_at).toLocaleString("es-AR")}</span></div></article>) : <p>Todavía no tenés movimientos en este programa.</p>}</div></section>}
        {joined && program.mechanic === "stamps" && <StampProgressCard program={program} account={account} />}
        {joined && <section className="tags_loyalty_redeem_panel"><small>CANJEAR RECOMPENSA</small><h2>Ya podés usar tu progreso</h2>{program.rewards.map(reward => { const eligible = Number(account?.points_balance || 0) >= Number(reward.required_points || 0) && Number(account?.stamps_balance || 0) >= Number(reward.required_stamps || 0) && Number(account?.visits_balance || 0) >= Number(reward.required_visits || 0); return eligible ? <div key={reward.id}><span><strong>{reward.name}</strong><small>{requirement(reward)}</small></span><button type="button" disabled={redeeming} onClick={() => requestRedemption(reward)}>{redeeming ? "Enviando..." : "Solicitar canje"}</button></div> : null; })}</section>}
        {joined && <section className="tags_loyalty_section"><header><div><i><FaGift /></i><span><small>HISTORIAL</small><h2>Canjes realizados</h2></span></div><em>{redemptions.length}</em></header><div className="tags_loyalty_preview">{redemptions.length ? redemptions.map(item => <article key={item.id}><i><FaGift /></i><div><strong>{item.reward_name}</strong><span>{new Date(item.redeemed_at || item.created_at).toLocaleString("es-AR")}</span></div><b>{item.status === "confirmed" ? "Confirmado" : item.status}</b></article>) : <p>Todavía no hay canjes confirmados en este programa.</p>}</div></section>}
        {!directoryShell && <div className="tags_loyalty_push_inline"><LoyaltyPushButton businessId={program.business_id} /></div>}
    </main>;
}
