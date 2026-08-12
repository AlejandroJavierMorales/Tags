"use client";

import { useState } from "react";
import Image from "next/image";
import "../../styles/tags-login.css";
import "./resto-login.css";

export default function RestoLoginClient() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function submit() {
        setError("");
        if (!email.trim()) return setError("Ingresá un email válido");
        setLoading(true);
        try {
            const response = await fetch("/api/resto/auth/send-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) return setError(data.error || "No se pudo enviar el enlace");
            setSent(true);
        } catch {
            setError("Error de conexión");
        } finally {
            setLoading(false);
        }
    }

    return <main className="resto_login_page tags_login_page">
        <div className="tags_login_topbar">Tags Resto · Acceso operativo</div>
        <div className="tags_login_wrapper">
            <div className="resto_login_card tags_login_card">
                <Image src="/logo_tags_transparente.webp" alt="Tags" width={130} height={100} priority />
                <div className="tags_login_badge">Personal de restaurante</div>
                <h1 className="tags_login_title">Ingresá a Tags Resto</h1>
                <p className="tags_login_subtitle">Usá el email con el que te registró el owner del negocio.</p>
                {sent ? <><h2>Revisá tu email</h2><p className="tags_login_success_text">Te enviamos un enlace de acceso válido por 15 minutos.</p><button className="tags_login_btn" onClick={() => setSent(false)}>Enviar nuevamente</button></> : <><label className="resto_login_label">Email del personal</label><input className="tags_login_input" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@email.com" /><button className="tags_login_btn" disabled={loading} onClick={submit}>{loading ? "Enviando..." : "Enviar enlace"}</button>{error && <p className="resto_login_error">{error}</p>}</>}
            </div>
        </div>
    </main>;
}
