"use client";

// =====================================
// PAGE CLIENT: Activar QR-Page
// Descripción: Solicita slug público y activa una QR-Page para un QR.
// =====================================

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function QRPageActivateClient({
    businessId,
    qrCodeId
}) {

    const router =
        useRouter();

    const [slug, setSlug] =
        useState("");

    const [saving, setSaving] =
        useState(false);

    async function activate() {

        const cleanSlug =
            makeSlug(slug);

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
                title: "Confirmar slug",
                text: `La URL pública será /p/${cleanSlug}. Luego podrá quedar bloqueada al publicar.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Activar QR-Page",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) return;

        setSaving(true);

        try {

            const res =
                await fetch("/api/qr-page/activate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        businessId,
                        qrCodeId,
                        slug: cleanSlug
                    })
                });

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo activar la QR-Page"
                );
            }

            showAlert({
                title: "QR-Page activada",
                text: "Ahora podés editar y publicar la página.",
                icon: "success"
            });

            router.push(
                `/dashboard/businesses/${businessId}/qrs/${qrCodeId}/qr-page`
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

                <h1 className="qr_page_title">
                    Activar QR-Page
                </h1>

                <p className="qr_page_subtitle">
                    Definí la URL pública de esta página.
                </p>

                <div className="qr_page_field mt-4">
                    <label>
                        Slug público
                    </label>

                    <input
                        className="qr_page_input"
                        value={slug}
                        onChange={(e) =>
                            setSlug(
                                makeSlug(e.target.value)
                            )
                        }
                        placeholder="mi-negocio"
                    />
                </div>

                <div className="qr_page_status mt-3">
                    URL final:{" "}
                    <strong>
                        /p/{slug || "mi-negocio"}
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
                                : "Activar QR-Page"
                        }
                    </button>

                </div>

            </div>

        </div>
    );
}