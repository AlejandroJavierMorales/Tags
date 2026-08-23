"use client";

import { useState } from "react";
import "./QrAgencyLoginForm.css";

export default function QrAgencyLoginForm({ agencySlug }) {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    async function submit(event) {
        event.preventDefault(); setBusy(true); setMessage(""); setError("");
        try {
            const response = await fetch(`/agency/${agencySlug}/api/request-access`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "No se pudo solicitar el acceso");
            setMessage(result.message || "Revisá tu email para continuar.");
        } catch (requestError) { setError(requestError.message); }
        finally { setBusy(false); }
    }
    return <form className="tags_qr_agency_login_form" onSubmit={submit}><label>Email del cliente<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" /></label><button disabled={busy}>{busy ? "Enviando..." : "Solicitar nuevo enlace"}</button>{message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}</form>;
}
