"use client";

// =====================================
// PAGE CLIENT: Activar ClientsReviews
// Descripción: Solicita slug público y activa el módulo premium de reseñas.
// =====================================

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaGoogle } from "react-icons/fa";

import showAlert from "@/app/components/showAlert";

import "@/app/styles/tagsModals.css";
import "@/app/styles/qr-page.css";

function makeSlug(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function ClientReviewsActivateClient({
    businessId,
    qrCodeId,
    session,
    isAdmin
}) {
    const router =
        useRouter();

    const [slugInput, setSlugInput] =
        useState("");

    const [saving, setSaving] =
        useState(false);

    const cleanSlug =
        useMemo(
            () => makeSlug(slugInput),
            [slugInput]
        );

    async function activate() {

        if (!cleanSlug) {
            showAlert({
                title: "Slug requerido",
                text: "Ingresá una URL pública válida.",
                icon: "error"
            });

            return;
        }

        const confirmed =
            await showAlert({
                title: "Activar ClientsReviews",
                text: `La URL pública será /p/${cleanSlug}. Este QR quedará asociado al formulario de reseñas.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Activar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) return;

        setSaving(true);

        try {

            const res =
                await fetch(
                    "/api/client-reviews/activate",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            qrCodeId,
                            slug: cleanSlug
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo activar ClientsReviews"
                );
            }

            showAlert({
                title: "ClientsReviews activado",
                text: "Ahora podés configurar las preguntas y revisar las opiniones.",
                icon: "success"
            });

            router.push(
                `/dashboard/businesses/${businessId}/qrs/${qrCodeId}/client-reviews`
            );

        } catch (err) {

            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {

            setSaving(false);
        }
    }

    return (
        <div className="qr_page_builder">

            <div className="qr_page_card">

                <div className="d-flex align-items-center gap-2 mb-3">

                    <FaGoogle
                        style={{
                            color: "#4285F4",
                            fontSize: 26
                        }}
                    />

                    <h1 className="qr_page_title m-0">
                        Activar ClientsReviews
                    </h1>

                </div>

                <p className="qr_page_subtitle">
                    Creá una página pública para captar reseñas, recibir feedback privado y guiar a tus clientes hacia Google Reviews.
                </p>

                <div className="qr_page_field mt-4">

                    <label>
                        Nombre para la URL pública
                    </label>

                    <input
                        className="qr_page_input"
                        value={slugInput}
                        onChange={(e) =>
                            setSlugInput(e.target.value)
                        }
                        placeholder="Reseñas Mi Negocio"
                    />

                    <small
                        style={{
                            display: "block",
                            marginTop: 8,
                            opacity: 0.75
                        }}
                    >
                        Podés escribir con espacios. El sistema generará automáticamente el slug.
                    </small>

                </div>

                <div className="qr_page_status mt-3">
                    URL final:{" "}
                    <strong>
                        /p/{cleanSlug || "resenas-mi-negocio"}
                    </strong>
                </div>

                <div className="qr_page_actions mt-4">

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}`
                            )
                        }
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn success"
                        disabled={saving}
                        onClick={activate}
                    >
                        {
                            saving
                                ? "Activando..."
                                : "Activar ClientsReviews"
                        }
                    </button>

                </div>

            </div>

        </div>
    );
}