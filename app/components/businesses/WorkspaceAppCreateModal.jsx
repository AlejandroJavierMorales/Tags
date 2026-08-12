// =====================================
// COMPONENT: app/components/businesses/WorkspaceAppCreateModal.jsx
// Descripción: Modal genérico para crear una aplicación del Workspace con QR automático.
// =====================================

"use client";

import { useMemo, useState } from "react";
import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";

function makeSlug(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function WorkspaceAppCreateModal({
    open,
    businessId,
    onClose,
    onCreated,
    title,
    description,
    endpoint,
    createButtonLabel,
    successTitle,
    successMessage,
    allowCustomSlug = false,
    allowEmptySlug = false,
    hidePublicPathPreview = false,
    businessProfileOptions = [],
}) {
    const [pageName, setPageName] = useState("");
    const [menuName, setMenuName] = useState("");
    const [customSlug, setCustomSlug] = useState("");
    const [businessProfileCode, setBusinessProfileCode] = useState("");
    const [saving, setSaving] = useState(false);

    const cleanSlug = useMemo(
        () => makeSlug(allowCustomSlug ? customSlug : pageName),
        [allowCustomSlug, customSlug, pageName]
    );

    async function createPage() {
        if (!pageName.trim() || (!cleanSlug && !allowEmptySlug)) {
            showAlert({
                title: "Nombre requerido",
                text: "Ingresá un nombre válido para la página.",
                icon: "warning"
            });
            return;
        }

        setSaving(true);

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    businessId,
                    name: pageName.trim(),
                    title: pageName.trim(),
                    slug: cleanSlug || null,
                    businessProfileCode: businessProfileCode || businessProfileOptions[0]?.value || "generic",
                    navLabel: menuName.trim() || pageName.trim()
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "No se pudo crear la página");
            }

            showAlert({
                title: successTitle || "Aplicación creada",
                text: successMessage || "La aplicación fue creada con su QR asociado.",
                icon: "success"
            });

            setPageName("");
            setMenuName("");
            setCustomSlug("");
            setBusinessProfileCode("");

            if (onCreated) {
                onCreated(data);
            }

            onClose();

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

    if (!open) {
        return null;
    }

    return (
        <div className="tags_modal_overlay">
            <div className="tags_modal_card tags_text_normal">
                {saving && <TagsSpinner size={100} logoSize={52} borderSize={4} background="rgba(255,255,255,.72)" />}

                <button
                    type="button"
                    className="tags_modal_close"
                    onClick={onClose}
                >
                    ✕
                </button>

                <div className="tags_modal_header text-center">
                    <h2 className="tags_modal_title tags_title">
                        {title || "Crear aplicación"}
                    </h2>

                    <p className="tags_modal_description">
                        {description || "Creá una aplicación con su QR asociado automáticamente."}
                    </p>
                </div>

                <div className="tags_modal_body">

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

                    {allowCustomSlug && (
                        <div className="tags_modal_group">
                            <label className="tags_modal_label">Slug público</label>
                            <input className="tags_modal_input" value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} placeholder="spa-mi-negocio" />
                        </div>
                    )}

                    {businessProfileOptions.length > 0 && (
                        <div className="tags_modal_group">
                            <label className="tags_modal_label">Tipo de negocio</label>
                            <select className="tags_modal_input" value={businessProfileCode || businessProfileOptions[0]?.value || ""} onChange={(e) => setBusinessProfileCode(e.target.value)}>
                                {businessProfileOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                    )}

                    {!hidePublicPathPreview && <div className="qr_page_status mt-3">
                        Dirección pública:{" "}
                        <strong>
                            /p/{cleanSlug || "nombre-de-la-pagina"}
                        </strong>
                    </div>}

                </div>

                <div className="tags_modal_actions">
                    <button
                        type="button"
                        className="tags_modal_btn tags_modal_btn_cancel"
                        onClick={onClose}
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
                        {saving ? "Creando..." : (createButtonLabel || "Crear")}
                    </button>
                </div>

            </div>
        </div>
    );
}
