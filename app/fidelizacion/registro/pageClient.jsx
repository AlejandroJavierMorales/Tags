"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import showAlert from "@/app/components/showAlert";
import "../../styles/tags-login.css";
import "./registration.css";

export default function UserRegistrationForm({ channel = null }) {
    const router = useRouter();
    const brand = channel?.brandConfig || {};
    const brandName = brand.displayName || channel?.name || "Tags";
    const brandLogo = brand.logoUrl || brand.logo_url || (channel?.code === "calamuchitar" ? "/directory/calamuchitar/LogoCalamuchitar.webp" : "/logo_tags_transparente.webp");
    const platformDescription = brand.slogan || (channel?.code === "calamuchitar" ? "La Plataforma Comercial de Calamuchita" : "Plataforma de Experiencias Digitales Inteligentes");
    const primaryColor = brand.primaryColor || "#0fb957";
    const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", whatsapp: "", accept_terms: false });
    const [saving, setSaving] = useState(false);

    function update(name, value) { setForm(current => ({ ...current, [name]: value })); }

    async function submit(event) {
        event.preventDefault();
        if (!form.accept_terms) {
            await showAlert({ title: "Falta aceptar los términos", text: "Necesitamos tu aceptación para crear la cuenta.", icon: "warning" });
            return;
        }
        setSaving(true);
        try {
            const response = await fetch("/api/users/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            const payload = await response.json().catch(() => ({}));
            if (response.status === 409 && payload.code === "USER_ALREADY_EXISTS") {
                await showAlert({ title: "La cuenta ya existe", text: payload.error, icon: "info", confirmButtonText: "Ir al ingreso" });
                router.push(`/login?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
                return;
            }
            if (!response.ok) throw new Error(payload.error || "No se pudo crear la cuenta");
            await showAlert({ title: "Cuenta creada", text: "Revisá tu email: te enviamos un enlace para ingresar.", icon: "success", confirmButtonText: "Entendido" });
            router.push(`/login?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
        } catch (error) {
            await showAlert({ title: "No se pudo crear la cuenta", text: error.message || "Verificá tu conexión e intentá nuevamente.", icon: "error" });
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="tags_user_registration_page" style={{ "--tags-login-primary": primaryColor }}>
            <div className="tags_login_topbar">{brandName} — {platformDescription}</div>
            <div className="tags_user_registration_wrapper">
                <section className="tags_user_registration_card">
                    <button type="button" className="tags_login_change_account tags_user_registration_back" onClick={() => router.push("/login")}>← Volver al ingreso</button>
                    <div className="tags_user_registration_brand">
                        <Image src={brandLogo} alt={brandName} width={180} height={100} priority />
                        <p>{platformDescription}</p>
                    </div>
                    <h1 className="tags_user_registration_title">Crear cuenta de usuario</h1>
                    <p className="tags_user_registration_intro">Creá tu cuenta personal para acceder a las herramientas y servicios disponibles en la plataforma.</p>
                    <form onSubmit={submit} className="row g-3 tags_user_registration_form">
                        <div className="col-md-6"><label className="form-label">Nombre<input required className="form-control" autoComplete="given-name" value={form.first_name} onChange={event => update("first_name", event.target.value)} /></label></div>
                        <div className="col-md-6"><label className="form-label">Apellido<input required className="form-control" autoComplete="family-name" value={form.last_name} onChange={event => update("last_name", event.target.value)} /></label></div>
                        <div className="col-12"><label className="form-label">Email<input required type="email" className="form-control" autoComplete="email" value={form.email} onChange={event => update("email", event.target.value)} /></label></div>
                        <div className="col-md-6"><label className="form-label">Teléfono (opcional)<input className="form-control" type="tel" autoComplete="tel" value={form.phone} onChange={event => update("phone", event.target.value)} /></label></div>
                        <div className="col-md-6"><label className="form-label">WhatsApp (opcional)<input className="form-control" type="tel" value={form.whatsapp} onChange={event => update("whatsapp", event.target.value)} /></label></div>
                        <div className="col-12"><label className="form-check"><input required className="form-check-input" type="checkbox" checked={form.accept_terms} onChange={event => update("accept_terms", event.target.checked)} /><span className="form-check-label">Acepto los términos y la política de privacidad.</span></label></div>
                        <div className="col-12"><button className="tags_user_registration_submit" disabled={saving}>{saving ? "Creando cuenta..." : "Crear cuenta"}</button></div>
                    </form>
                </section>
            </div>
        </main>
    );
}
