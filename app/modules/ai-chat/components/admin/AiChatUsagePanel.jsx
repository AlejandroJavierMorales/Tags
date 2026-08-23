"use client";

import { useEffect, useState } from "react";
import "./AiChatUsagePanel.css";

function money(value) {
    return `USD ${Number(value || 0).toFixed(4)}`;
}

export default function AiChatUsagePanel({ businessId, global = false }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    useEffect(() => {
        const params = new URLSearchParams({ period });
        if (businessId) params.set("businessId", businessId);
        setLoading(true);
        fetch(`/api/ai/admin/usage?${params}`, { cache: "no-store" })
            .then(response => response.json().then(payload => ({ response, payload })))
            .then(({ response, payload }) => {
                if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo cargar el consumo");
                setData(payload);
            })
            .catch(() => setData({ summary: {}, businesses: [], daily: [] }))
            .finally(() => setLoading(false));
    }, [businessId, period]);

    const summary = data?.summary || {};
    return <section className={`tags_ai_usage_panel${global ? " tags_ai_usage_panel_global" : ""}`}>
        <header>
            <div><h2>Consumo del asistente</h2><p>{global ? "Costo técnico y uso de todos los clientes." : "Respuestas utilizadas durante el período actual."}</p></div>
            <label>Período<input type="month" value={period} onChange={event => setPeriod(event.target.value)} /></label>
        </header>
        {loading ? <p>Cargando consumo...</p> : <>
            <div className="tags_ai_usage_kpis">
                <article><span>Respuestas</span><strong>{Number(summary.responses || 0).toLocaleString("es-AR")}</strong></article>
                <article><span>Tokens</span><strong>{Number(summary.totalTokens || 0).toLocaleString("es-AR")}</strong></article>
                <article><span>{global ? "Costo técnico" : "Cupo mensual"}</span><strong>{global ? money(summary.estimatedCostUsd) : (Number(data?.plan?.monthlyResponseLimit || 0) > 0 ? `${Number(summary.responses || 0)} / ${Number(data.plan.monthlyResponseLimit).toLocaleString("es-AR")}` : "Sin límite")}</strong></article>
            </div>
            {!global && Number(data?.plan?.monthlyResponseLimit || 0) > 0 && <p>Respuestas disponibles este mes: <strong>{Number(data.remaining || 0).toLocaleString("es-AR")}</strong>.</p>}
            {global ? <div className="tags_ai_usage_table"><table><thead><tr><th>Cliente</th><th>Respuestas</th><th>Tokens</th><th>Costo técnico</th></tr></thead><tbody>{(data?.businesses || []).map(item => <tr key={item.business_id}><td><strong>{item.business_name || "Cliente sin nombre"}</strong><small>{item.email || ""}</small></td><td>{item.responses}</td><td>{Number(item.total_tokens || 0).toLocaleString("es-AR")}</td><td>{money(item.estimated_cost_usd)}</td></tr>)}</tbody></table></div> : null}
        </>}
    </section>;
}
