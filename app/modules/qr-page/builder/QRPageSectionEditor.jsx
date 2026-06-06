"use client";

import { useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

import {
    QR_PAGE_SECTION_TYPES
} from "@/app/modules/qr-page/lib/qrPageBuilderTypes";

export default function QRPageSectionEditor({
    businessId,
    pageId,
    section,
    onClose,
    onReload
}) {

    const [title, setTitle] =
        useState(section.title || "");

    const [type, setType] =
        useState(section.type || "content");

    const [isVisible, setIsVisible] =
        useState(!!section.is_visible);

    const [settings, setSettings] =
        useState(section.settings_json || {});

    const [styles, setStyles] =
        useState(section.styles_json || {});

    const [saving, setSaving] =
        useState(false);

    function updateSetting(field, value) {
        setSettings((prev) => ({
            ...prev,
            [field]: value
        }));
    }

    function updateStyle(field, value) {
        setStyles((prev) => ({
            ...prev,
            [field]: value
        }));
    }

    async function handleSave() {

        setSaving(true);

        try {

            const res =
                await fetch(
                    "/api/qr-page/sections/update",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            pageId,
                            sectionId: section.id,
                            type,
                            title,
                            is_visible: isVisible,
                            settings_json: settings,
                            styles_json: styles
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error guardando sección"
                );
            }

            showAlert({
                type: "success",
                title: "Guardado",
                text: "Sección actualizada"
            });

            await onReload();
            onClose();

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
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
                            Configuración visual y general de la sección.
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
                        <label>Tipo de sección</label>

                        <select
                            className="qr_page_select"
                            value={type}
                            onChange={(e) =>
                                setType(e.target.value)
                            }
                        >
                            {
                                QR_PAGE_SECTION_TYPES.map(
                                    (item) => (
                                        <option
                                            key={item.value}
                                            value={item.value}
                                        >
                                            {item.label}
                                        </option>
                                    )
                                )
                            }
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label>Visibilidad</label>

                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={(e) =>
                                    setIsVisible(
                                        e.target.checked
                                    )
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
                            value={styles.alignment || "center"}
                            onChange={(e) =>
                                updateStyle(
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
                                styles.backgroundColor ||
                                "#ffffff"
                            }
                            onChange={(e) =>
                                updateStyle(
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
                                styles.textColor ||
                                "#111827"
                            }
                            onChange={(e) =>
                                updateStyle(
                                    "textColor",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Padding superior</label>

                        <input
                            className="qr_page_input"
                            value={styles.paddingTop || ""}
                            placeholder="Ej: 40px"
                            onChange={(e) =>
                                updateStyle(
                                    "paddingTop",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Padding inferior</label>

                        <input
                            className="qr_page_input"
                            value={styles.paddingBottom || ""}
                            placeholder="Ej: 40px"
                            onChange={(e) =>
                                updateStyle(
                                    "paddingBottom",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Radio de bordes</label>

                        <input
                            className="qr_page_input"
                            value={styles.borderRadius || ""}
                            placeholder="Ej: 20px"
                            onChange={(e) =>
                                updateStyle(
                                    "borderRadius",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                </div>

                <div className="qr_page_actions mt">
                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {
                            saving
                                ? "Guardando..."
                                : "Guardar sección"
                        }
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