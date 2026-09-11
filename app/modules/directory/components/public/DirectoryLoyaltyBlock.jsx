"use client";

import { useEffect, useState } from "react";
import { FaArrowRight, FaAward, FaCheck, FaGift } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import "./DirectoryLoyaltyBlock.css";

const requirement = reward => reward.required_points ? `${reward.required_points} puntos` : reward.required_stamps ? `${reward.required_stamps} sellos` : reward.required_visits ? `${reward.required_visits} visitas` : "Consultar condiciones";

export default function DirectoryLoyaltyBlock({ program, content = {}, styles = {} }) {
    const [membership, setMembership] = useState({ authenticated: false, joined: false });
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        fetch(`/api/loyalty/member/program?program_id=${program.id}`).then(response => response.json()).then(result => {
            if (result.success) setMembership({ authenticated: result.authenticated, joined: result.joined });
        }).catch(() => {});
    }, [program.id]);
    async function participate() {
        if (!membership.authenticated) {
            const returnTo = window.location.pathname + window.location.search;
            window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
            return;
        }
        if (membership.joined) {
            window.location.href = `/mi-cuenta/fidelizacion/programa/${program.id}`;
            return;
        }
        setBusy(true);
        try {
            const response = await fetch("/api/loyalty/member/program", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ program_id: program.id }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "No se pudo completar la adhesión");
            setMembership({ authenticated: true, joined: true });
            await showAlert({ title: "Ya participás del programa", text: "Podés consultar tu saldo y recompensas desde Mi cuenta.", icon: "success" });
        } catch (error) {
            await showAlert({ title: "No se pudo completar", text: error.message, icon: "error" });
        } finally { setBusy(false); }
    }
    const rewards = (program.rewards || []).slice(0, Math.max(1, Number(content.rewardLimit || 3)));
    return <div className="tags_directory_loyalty" style={{ textAlign: styles.alignment || "left" }}>
        <div className="tags_directory_loyalty_intro"><span><FaGift /> {content.eyebrow || "PROGRAMA DE FIDELIZACIÓN"}</span><h2>{content.title || program.name}</h2><p>{content.subtitle || program.description || "Sumate y accedé a recompensas por elegirnos."}</p><button type="button" onClick={participate} disabled={busy}>{membership.joined ? <><FaCheck /> {content.memberLabel || "Ver mi progreso"}</> : <>{content.joinLabel || "Quiero participar"} <FaArrowRight /></>}</button></div>
        {rewards.length > 0 && <div className="tags_directory_loyalty_rewards">{rewards.map(reward => <article key={reward.id}><i><FaAward /></i><div><strong>{reward.name}</strong><p>{reward.description || "Recompensa del programa"}</p><small>{requirement(reward)}</small></div></article>)}</div>}
    </div>;
}
