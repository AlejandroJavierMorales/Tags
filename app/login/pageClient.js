"use client";
import "../styles/tags-login.css"
import { useState } from "react";
import Image from "next/image";

export default function LoginForm() {

  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const [sent, setSent] = useState(false);

  const [error, setError] = useState("");

  // =========================
  // SEND MAGIC LINK
  // =========================

  async function handleLogin() {

    setError("");

    if (!email.trim()) {

      setError("Ingresá un email válido");

      return;
    }

    setLoading(true);

    try {

      const res = await fetch(
        "/api/auth/send-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email.trim()
          })
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {

        setError(
          data.error || "Error enviando el link"
        );

        return;
      }

      setSent(true);

    } catch (err) {

      console.error(err);

      setError("Error de conexión");

    } finally {

      setLoading(false);
    }
  }

  // =========================
  // SENT UI
  // =========================

  if (sent) {

    return (

      <div className="tags_login_page">

        <div className="tags_login_topbar">
          Tags — Plataforma de Gestión y Reporting de Códigos QR
        </div>

        <div className="tags_login_wrapper">

          <div className="tags_login_success_card">

            <div className="tags_login_success_icon">
              📩
            </div>

            <h2 className="tags_login_success_title">
              Revisá tu email
            </h2>

            <p className="tags_login_success_text">
              Te enviamos un link para ingresar a tu panel.
            </p>

            <button
              className="tags_login_btn"
              onClick={() => setSent(false)}
            >
              Enviar nuevamente
            </button>

          </div>

        </div>

      </div>
    );
  }

  // =========================
  // LOGIN UI
  // =========================

  return (

    <div className="tags_login_page">

      {/* TOPBAR */}
      <div className="tags_login_topbar">
        Tags — Plataforma de Gestión y Reporting de Códigos QR
      </div>

      <div className="tags_login_wrapper">

        <div className="tags_login_layout">

          {/* LEFT CONTENT */}
          <div className="tags_login_left">

            {/* BRAND */}
            <div className="tags_login_brand">

              <div className="tags_login_logo">

                <Image
                  src="/logo_tags_transparente.webp"
                  alt="Tags"
                  width={180}
                  height={140}
                  className="img-fluid"
                  priority
                />

              </div>

              <div className="tags_login_brand_text">

                <div className="tags_login_badge">
                  Plataforma QR Inteligente
                </div>

                <h1 className="tags_login_title">
                  Bienvenido 👋
                </h1>

                <p className="tags_login_subtitle">
                  Accedé a tu panel para gestionar QR,
                  visualizar estadísticas y analizar resultados
                  en tiempo real.
                </p>

              </div>

            </div>

            {/* BENEFITS */}
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

          {/* RIGHT LOGIN */}
          <div className="tags_login_right">

            <div className="tags_login_card">

              <div className="tags_login_card_header">

                <div className="tags_login_card_icon">
                  🔐
                </div>

                <div>

                  <h2>
                    Acceso a clientes
                  </h2>

                  <p>
                    Ingresá tu email para continuar
                  </p>

                </div>

              </div>

              {/* INPUT */}
              <div className="tags_login_form_group">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  className="tags_login_input"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />

              </div>

              {/* BUTTON */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="tags_login_btn"
              >
                {
                  loading
                    ? "Enviando..."
                    : "Enviar link"
                }
              </button>

              {/* ERROR */}
              {
                error && (

                  <div className="tags_login_error">
                    {error}
                  </div>

                )
              }

              {/* FOOTER */}
              <div className="tags_login_footer">

                <a
                  href="/logout"
                  className="tags_login_change_account"
                >
                  🔄 Cambiar cuenta
                </a>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}