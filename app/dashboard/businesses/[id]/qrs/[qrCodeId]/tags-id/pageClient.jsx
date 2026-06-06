"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import showAlert from "@/app/components/showAlert";

import "@/app/styles/qr-page.css";

export default function TagsIdActivateClient({
    businessId,
    qrCodeId,
    business
}) {

    const router =
        useRouter();

    const [slug, setSlug] =
        useState("");

    const [saving, setSaving] =
        useState(false);

    async function handleActivate() {

        if (!slug.trim()) {
            showAlert({
                title: "Slug requerido",
                text: "Definí el slug público de tu Tags Id.",
                icon: "warning"
            });

            return;
        }

        const confirm =
            await showAlert({
                title: "Confirmar slug",
                text: "El slug no podrá modificarse luego de activar el Tags Id. ¿Continuar?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Activar",
                cancelButtonText: "Cancelar"
            });

        if (!confirm) {
            return;
        }

        setSaving(true);

        try {

            const res =
                await fetch(
                    "/api/tags-id/activate",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            qrCodeId,
                            slug
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error activando Tags Id"
                );
            }

            showAlert({
                title: "Tags Id activado",
                text: "Tu Tags Id ya está publicado.",
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

            <div className="qr_page_header">

                <div>
                    <h1 className="qr_page_title">
                        Activar Tags Id
                    </h1>

                    <p className="qr_page_subtitle">
                        {business?.name || business?.email}
                    </p>
                </div>

            </div>

            <div className="qr_page_card">

                <div className="qr_page_field full">
                    <label>Slug público</label>

                    <input
                        className="qr_page_input"
                        value={slug}
                        onChange={(e) =>
                            setSlug(e.target.value)
                        }
                        placeholder="ej: juan-perez"
                    />
                </div>

                <p style={{ marginTop: 12 }}>
                    Este slug define la URL pública de tu Tags Id.
                    Una vez activado no podrá modificarse desde el panel.
                </p>

                <button
                    type="button"
                    className="qr_page_btn success"
                    onClick={handleActivate}
                    disabled={saving}
                >
                    {
                        saving
                            ? "Activando..."
                            : "Activar Tags Id"
                    }
                </button>

            </div>

        </div>
    );
}