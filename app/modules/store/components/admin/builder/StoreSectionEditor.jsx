// =====================================
// Archivo:
// /app/modules/store/components/admin/builder/StoreSectionEditor.jsx
//
// Descripción:
// Editor de secciones del Builder
// de Tags Store.
// =====================================

"use client";

import { useState } from "react";

import showAlert
    from "@/app/components/showAlert";

import {
    STORE_SECTION_TYPES
}
    from "@/app/modules/store/lib/builder/storeBuilderTypes";

export default function StoreSectionEditor({
    storeId,
    section,
    onClose,
    onReload
}) {
    const [title, setTitle] =
        useState(section.title || "");

    const [type, setType] =
        useState(section.section_type || "hero");

    const [isVisible, setIsVisible] =
        useState(!!section.is_visible);

    const [settings, setSettings] =
        useState(section.settings_json || {});

    const [saving, setSaving] =
        useState(false);

    function updateSetting(field, value) {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    }

    async function handleSave() {
        setSaving(true);

        try {
            const res =
                await fetch(
                    "/api/store/admin/builder/sections/update",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            storeId,
                            sectionId: section.id,
                            title,
                            section_type: section.section_type,
                            is_visible: isVisible,
                            settings_json: settings
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error guardando sección"
                );
            }

            await onReload();
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

    return (
        <div className="qr_page_modal_overlay">

            <div className="qr_page_modal">

                <div className="qr_page_modal_header">
                    <div>
                        <h3>
                            Editar sección
                        </h3>

                        <p>
                            Configuración general y visual.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="qr_page_modal_close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="qr_page_grid">

                    <div className="qr_page_field">
                        <label>Título interno</label>

                        <input
                            className="qr_page_input"
                            value={title}
                            onChange={(e) =>
                                setTitle(e.target.value)
                            }
                        />
                    </div>


                    <div className="qr_page_field">
                        <label>Visibilidad</label>

                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={(e) =>
                                    setIsVisible(e.target.checked)
                                }
                            />

                            Mostrar sección
                        </label>
                    </div>

                    <div className="qr_page_field">
                        <label>Ancho del contenido</label>

                        <select
                            className="qr_page_select"
                            value={settings.container || "normal"}
                            onChange={(e) =>
                                updateSetting(
                                    "container",
                                    e.target.value
                                )
                            }
                        >
                            <option value="normal">
                                Normal
                            </option>

                            <option value="wide">
                                Ancho
                            </option>

                            <option value="full">
                                Pantalla completa
                            </option>
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label>Alineación</label>

                        <select
                            className="qr_page_select"
                            value={settings.alignment || "left"}
                            onChange={(e) =>
                                updateSetting(
                                    "alignment",
                                    e.target.value
                                )
                            }
                        >
                            <option value="left">
                                Izquierda
                            </option>

                            <option value="center">
                                Centro
                            </option>

                            <option value="right">
                                Derecha
                            </option>
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label>Color de fondo</label>

                        <input
                            className="qr_page_input qr_page_color"
                            type="color"
                            value={
                                settings.backgroundColor ||
                                "#ffffff"
                            }
                            onChange={(e) =>
                                updateSetting(
                                    "backgroundColor",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Color de texto</label>

                        <input
                            className="qr_page_input qr_page_color"
                            type="color"
                            value={
                                settings.textColor ||
                                "#111827"
                            }
                            onChange={(e) =>
                                updateSetting(
                                    "textColor",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Padding superior</label>

                        <select
                            className="qr_page_select"
                            value={settings.paddingTop || "normal"}
                            onChange={(e) =>
                                updateSetting("paddingTop", e.target.value)
                            }
                        >
                            <option value="none">Sin espacio</option>
                            <option value="small">Pequeño</option>
                            <option value="normal">Normal</option>
                            <option value="large">Grande</option>
                            <option value="xl">Muy grande</option>
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label>Padding inferior</label>

                        <select
                            className="qr_page_select"
                            value={settings.paddingBottom || "normal"}
                            onChange={(e) =>
                                updateSetting("paddingBottom", e.target.value)
                            }
                        >
                            <option value="none">Sin espacio</option>
                            <option value="small">Pequeño</option>
                            <option value="normal">Normal</option>
                            <option value="large">Grande</option>
                            <option value="xl">Muy grande</option>
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label>Radio de bordes</label>

                        <select
                            className="qr_page_select"
                            value={settings.borderRadius || "none"}
                            onChange={(e) =>
                                updateSetting("borderRadius", e.target.value)
                            }
                        >
                            <option value="none">Sin bordes redondeados</option>
                            <option value="small">Pequeño</option>
                            <option value="normal">Normal</option>
                            <option value="large">Grande</option>
                            <option value="pill">Muy redondeado</option>
                        </select>
                    </div>

                </div>

                <div className="qr_page_actions mt">
                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Guardando..." : "Guardar sección"}
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                </div>

            </div>

        </div>
    );
}