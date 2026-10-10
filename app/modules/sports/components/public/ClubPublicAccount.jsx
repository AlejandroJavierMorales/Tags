"use client";

import { useEffect, useState } from "react";
import TagsSpinner from "@/app/components/TagsSpinner";
import "./ClubPublicAccount.css";

export default function ClubPublicAccount({ slug, returnUrl = "" }) {
    const [data, setData] = useState(null);
    const [email, setEmail] = useState("");
    const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", privacyConsent: false });
    const [busy, setBusy] = useState(true);
    const [message, setMessage] = useState("");
    const publicPage = returnUrl || `/p/${slug}`;

    async function load() {
        setBusy(true);
        const response = await fetch(`/api/sports/public/community?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        setData(payload); setEmail(payload.email || ""); setBusy(false);
    }
    useEffect(() => { load(); }, [slug]);

    async function requestLink(event) {
        event.preventDefault(); setBusy(true);
        const separator = publicPage.includes("?") ? "&" : "?";
        const response = await fetch("/api/turnos/public/customer/request-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, email, purpose: "club", returnTo: returnUrl ? `${publicPage}${separator}club=1` : `/p/${slug}/mi-club` }) });
        const payload = await response.json().catch(() => ({}));
        setMessage(response.ok ? "Te enviamos un enlace privado. Revisá tu correo." : payload.error || "No pudimos enviar el enlace."); setBusy(false);
    }
    async function register(event) {
        event.preventDefault(); setBusy(true);
        const response = await fetch("/api/sports/public/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, ...form }) });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) await load(); else { setMessage(payload.error || "No pudimos completar el registro."); setBusy(false); }
    }

    return <main className="tags_club_account"><section className="tags_club_account_card"><a href={publicPage}>← Volver al club</a><header>{data?.club?.logoUrl && <img src={data.club.logoUrl} alt=""/>}<div><span>MI CLUB</span><h1>{data?.club?.name || "Comunidad deportiva"}</h1></div></header>
        {!data?.authenticated ? <form onSubmit={requestLink}><p>Ingresá tu email para acceder o registrarte como jugador.</p><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@email.com"/><button disabled={busy}>Enviar enlace de acceso</button></form>
        : !data?.registered ? data?.registrationMode === "disabled" ? <p>El registro público no está habilitado. Consultá con el club.</p> : <form onSubmit={register}><p>Completá tu perfil de jugador.</p><input required value={form.firstName} onChange={event => setForm({...form, firstName:event.target.value})} placeholder="Nombre"/><input required value={form.lastName} onChange={event => setForm({...form, lastName:event.target.value})} placeholder="Apellido"/><input value={form.phone} onChange={event => setForm({...form, phone:event.target.value})} placeholder="Teléfono"/><label><input type="checkbox" checked={form.privacyConsent} onChange={event => setForm({...form, privacyConsent:event.target.checked})}/> Acepto el tratamiento de mis datos para gestionar mi perfil y reservas.</label><button disabled={busy}>Crear mi perfil</button></form>
        : <div className="tags_club_account_profile"><span className={`is_${data.player.status}`}>{data.player.status === "active" ? "Jugador activo" : "Pendiente de aprobación"}</span><h2>{data.player.displayName || `${data.player.firstName} ${data.player.lastName}`}</h2><p>{data.isActiveMember ? `Socio activo${data.player.memberNumber ? ` · N.º ${data.player.memberNumber}` : ""}` : "Jugador registrado · sin membresía activa"}</p>{data.categories?.length > 0 && <ul>{data.categories.map((item, index) => <li key={`${item.discipline}-${item.category}-${index}`}>{item.discipline}: {item.category}</li>)}</ul>}<div><a href={`${publicPage}${publicPage.includes("?") ? "&" : "?"}reservas=1`}>Hacer una reserva</a></div></div>}
        {message && <p className="tags_club_account_message">{message}</p>}
    </section>{busy && <TagsSpinner size={110} logoSize={58} borderSize={4} background="rgba(255,255,255,.75)"/>}</main>;
}
