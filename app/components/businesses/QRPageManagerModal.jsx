// =====================================
// COMPONENT: app/components/businesses/QRPageManagerModal.jsx
// Descripción: Administra QR-Pages activadas y permite crear nuevas desde el Workspace.
// =====================================

"use client";

import { useMemo, useState } from "react";
import showAlert from "@/app/components/showAlert";

function makeSlug(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function QRPageManagerModal({
    open,
    businessId,
    qrPages = [],
    total = 0,
    router,
    onClose,
    onCreated
}) {
    const [creating, setCreating] = useState(false);
    const [pageName, setPageName] = useState("");
    const [menuName, setMenuName] = useState("");
    const [saving, setSaving] = useState(false);

    const used = qrPages.length;
    const canCreate = used < total;

    const cleanSlug = useMemo(
        () => makeSlug(pageName),
        [pageName]
    );

    if (!open) return null;

    async function createPage() {
        if (!pageName.trim() || !cleanSlug) {
            showAlert({
                title: "Nombre requerido",
                text: "Ingresá un nombre válido para la página.",
                icon: "warning"
            });
            return;
        }

        setSaving(true);

        try {
            const res = await fetch("/api/workspace/apps/qr-page/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId,
                    title: pageName.trim(),
                    slug: cleanSlug,
                    navLabel: menuName.trim() || pageName.trim()
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "No se pudo crear la página");
            }

            showAlert({
                title: "QR-Page creada",
                text: "La página fue creada con su QR asociado.",
                icon: "success"
            });

            setPageName("");
            setMenuName("");
            setCreating(false);

            onCreated?.(data);

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
        <div className="tags_modal_overlay">
            <div className="tags_modal_card tags_text_normal">

                <button
                    type="button"
                    className="tags_modal_close"
                    onClick={onClose}
                >
                    ✕
                </button>

                <div className="tags_modal_header text-center">
                    <h2 className="tags_modal_title tags_title">
                        QR-Page
                    </h2>

                    <p className="tags_modal_description">
                        {used} / {total} páginas activadas
                    </p>
                </div>

                <div className="tags_modal_body">

                    {qrPages.length > 0 && (
                        <div className="tags_modal_group">
                            <label className="tags_modal_label">
                                Páginas activadas
                            </label>

                            <div className="d-flex flex-column gap-2">
                                {qrPages.map((qr) => (
                                    <div
                                        key={qr.id}
                                        className="d-flex justify-content-between align-items-center p-2 rounded"
                                        style={{
                                            border: "1px solid #e5e7eb",
                                            background: "#f9fafb"
                                        }}
                                    >
                                        <div>
                                            <strong>
                                                {qr.qr_page_title || qr.label || qr.qr_page_slug}
                                            </strong>

                                            <div style={{ fontSize: 12, opacity: .7 }}>
                                                /p/{qr.qr_page_slug}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="tags_modal_btn tags_modal_btn_success"
                                            style={{ maxWidth: 110 }}
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/businesses/${businessId}/qrs/${qr.id}/qr-page`
                                                )
                                            }
                                        >
                                            Editar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!creating && canCreate && (
                        <button
                            type="button"
                            className="tags_modal_btn tags_modal_btn_success"
                            onClick={() => setCreating(true)}
                        >
                            Nueva QR-Page
                        </button>
                    )}

                    {!canCreate && (
                        <p className="mt-3 text-muted">
                            Ya usaste todo el cupo disponible.
                        </p>
                    )}

                    {creating && (
                        <>
                            <hr />

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">
                                    Nombre de la página
                                </label>

                                <input
                                    className="tags_modal_input"
                                    value={pageName}
                                    onChange={(e) => setPageName(e.target.value)}
                                    placeholder="Ej: Promociones de invierno"
                                />
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">
                                    Texto para el menú
                                </label>

                                <input
                                    className="tags_modal_input"
                                    value={menuName}
                                    onChange={(e) => setMenuName(e.target.value)}
                                    placeholder="Ej: Promociones"
                                />
                            </div>

                            <div className="qr_page_status mt-3">
                                Dirección pública:{" "}
                                <strong>
                                    /p/{cleanSlug || "nombre-de-la-pagina"}
                                </strong>
                            </div>

                            <div className="tags_modal_actions mt-3">
                                <button
                                    type="button"
                                    className="tags_modal_btn tags_modal_btn_cancel"
                                    onClick={() => setCreating(false)}
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    className="tags_modal_btn tags_modal_btn_success"
                                    onClick={createPage}
                                    disabled={saving}
                                >
                                    {saving ? "Creando..." : "Crear página"}
                                </button>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}