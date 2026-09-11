"use client";

import "../styles/tags-login.css";
import { useState } from "react";
import Image from "next/image";
import showAlert from "@/app/components/showAlert";

export default function LoginForm({ channel = null, initialEmail = "", returnTo = "" }) {
  const brand = channel?.brandConfig || {};
  const brandName = brand.displayName || channel?.name || "Tags";
  const brandLogo = brand.logoUrl || brand.logo_url || (channel?.code === "calamuchitar"
    ? "/directory/calamuchitar/LogoCalamuchitar.webp"
    : "/logo_tags_transparente.webp");
  const platformDescription = brand.slogan || (channel?.code === "calamuchitar"
    ? "La Plataforma Comercial de Calamuchita"
    : "Plataforma de Gestión y Reporting de Códigos QR");
  const primaryColor = brand.primaryColor || "#0fb957";

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [accountChoices, setAccountChoices] = useState(null);

  async function handleLogin(accountType = null) {
    setError("");
    setAccountChoices(null);
    if (!email.trim()) {
      setError("Ingresá un email válido");
      return;
    }

    setLoading(true);
    try {
      let selectedType = accountType;
      if (!selectedType) {
        const optionsResponse = await fetch("/api/auth/account-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const optionsPayload = await optionsResponse.json().catch(() => ({}));
        if (!optionsResponse.ok) {
          setError(optionsPayload.error || "No se pudo verificar la cuenta");
          return;
        }
        const options = optionsPayload.options || [];
        if (options.length > 1) {
          setAccountChoices(options);
          return;
        }
        selectedType = options[0]?.type;
      }

      const endpoint = selectedType === "user" ? "/api/auth/send-user-link" : "/api/auth/send-link";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), returnTo }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 402) {
          await showAlert({ title: "Panel de Control no disponible", text: payload.error, icon: "info", confirmButtonText: "Ver planes" });
        }
        setError(payload.error || "No se pudo enviar el enlace");
        return;
      }
      setSent(true);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="tags_login_page" style={{ "--tags-login-primary": primaryColor }}>
        <div className="tags_login_topbar">{brandName} — {platformDescription}</div>
        <div className="tags_login_wrapper">
          <div className="tags_login_success_card">
            <div className="tags_login_success_icon">📩</div>
            <h2 className="tags_login_success_title">Revisá tu email</h2>
            <p className="tags_login_success_text">
              Te enviamos un enlace para ingresar a tu cuenta.
            </p>
            <button className="tags_login_btn" onClick={() => setSent(false)}>
              Enviar nuevamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tags_login_page" style={{ "--tags-login-primary": primaryColor }}>
      <div className="tags_login_topbar">{brandName} — {platformDescription}</div>
      <div className="tags_login_wrapper">
        <div className="tags_login_layout">
          <div className="tags_login_left">
            <div className="tags_login_brand">
              <div className="tags_login_logo">
                <Image
                  src={brandLogo}
                  alt={brandName}
                  width={180}
                  height={140}
                  className="img-fluid"
                  priority
                />
              </div>
              <div className="tags_login_brand_text">
                <div className="tags_login_badge">{platformDescription}</div>
                <h1 className="tags_login_title">Bienvenido 👋</h1>
                <p className="tags_login_subtitle">
                  Accedé con el mismo email a tu negocio o a tu cuenta personal.
                </p>
              </div>
            </div>

            <div className="tags_login_benefits">
              <div className="tags_login_benefit_card">
                <span>📊</span>
                <div>
                  <strong>Reportes en tiempo real</strong>
                  <p>Visualizá escaneos y rendimiento.</p>
                </div>
              </div>
              <div className="tags_login_benefit_card">
                <span>⚡</span>
                <div>
                  <strong>Acceso rápido</strong>
                  <p>Ingresá sin contraseñas.</p>
                </div>
              </div>
              <div className="tags_login_benefit_card">
                <span>🔒</span>
                <div>
                  <strong>Ingreso seguro</strong>
                  <p>Links únicos y protegidos.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="tags_login_right">
            <div className="tags_login_card">
              <div className="tags_login_card_header">
                <div className="tags_login_card_icon">🔐</div>
                <div>
                  <h2>Acceso a tu cuenta</h2>
                  <p>Ingresá tu email para continuar</p>
                </div>
              </div>
              <div className="tags_login_form_group">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  className="tags_login_input"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                />
              </div>
              <button type="button" onClick={() => handleLogin()} disabled={loading} className="tags_login_btn">
                {loading ? "Enviando..." : "Enviar link"}
              </button>
              <a href="/registro" className="tags_login_register_link">
                ¿No tenés cuenta? Crear cuenta de usuario
              </a>
              {accountChoices && (
                <div className="tags_login_account_choices" role="group" aria-label="Elegir tipo de acceso">
                  <p className="tags_login_account_choices_title">Encontramos más de una forma de acceso para este email:</p>
                  {accountChoices.map(option => (
                    <button
                      key={option.type}
                      type="button"
                      className="tags_login_btn tags_login_account_choice"
                      onClick={() => handleLogin(option.type)}
                      disabled={loading}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              {error && <div className="tags_login_error">{error}</div>}
              <div className="tags_login_footer">
                <a href="/logout" className="tags_login_change_account">↻ Cambiar cuenta</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
