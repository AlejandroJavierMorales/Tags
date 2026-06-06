"use client";

import { useState } from "react";
import Image from "next/image";

import showAlert
    from "@/app/components/showAlert";

import "@/app/styles/tags-login.css";

export default function EventLoginClient() {

    const [email, setEmail] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [sent, setSent] =
        useState(false);

    async function login() {

        try {

            if (!email.trim()) {

                showAlert({
                    title: "Error",
                    text: "Ingresá un email válido",
                    icon: "error"
                });

                return;
            }

            setLoading(true);

            const res =
                await fetch(
                    "/api/events/auth/send-link",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo enviar el link",
                    icon: "error"
                });

                return;
            }

            setSent(true);

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "Error interno",
                icon: "error"
            });

        } finally {

            setLoading(false);
        }
    }

    // =========================
    // SUCCESS
    // =========================

    if (sent) {

        return (

            <div className="tags_login_page">

                <div className="tags_login_topbar">
                    Tags — Event Staff Access
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
                            Te enviamos un link de acceso.
                        </p>

                    </div>

                </div>

            </div>
        );
    }

    return (

        <div className="tags_login_page">

            <div className="tags_login_topbar">
                Tags — Staff Access
            </div>

            <div className="tags_login_wrapper">

                <div className="tags_login_layout">

                    {/* LEFT */}
                    <div className="tags_login_left">

                        <div className="tags_login_brand">

                            <div className="tags_login_logo">

                                <Image
                                    src="/logo_tags_transparente.webp"
                                    alt="Tags"
                                    width={180}
                                    height={140}
                                    priority
                                />

                            </div>

                            <div className="tags_login_brand_text">

                                <div className="tags_login_badge">
                                    Event Staff Panel
                                </div>

                                <h1 className="tags_login_title">
                                    Staff Access 🎟
                                </h1>

                                <p className="tags_login_subtitle">

                                    Accedé al scanner y herramientas
                                    operativas del evento.

                                </p>

                            </div>

                        </div>

                    </div>

                    {/* RIGHT */}
                    <div className="tags_login_right">

                        <div className="tags_login_card">

                            <div className="tags_login_card_header">

                                <div className="tags_login_card_icon">
                                    🎫
                                </div>

                                <div>

                                    <h2>
                                        Ingreso Staff
                                    </h2>

                                    <p>
                                        Ingresá tu email autorizado
                                    </p>

                                </div>

                            </div>

                            <div className="tags_login_form_group">

                                <label>
                                    Email
                                </label>

                                <input
                                    type="email"
                                    className="tags_login_input"
                                    placeholder="staff@email.com"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                            <button
                                className="tags_login_btn"
                                onClick={login}
                                disabled={loading}
                            >

                                {
                                    loading
                                        ? "Enviando..."
                                        : "Enviar link"
                                }

                            </button>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}