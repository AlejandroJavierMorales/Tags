// =====================================
// Archivo:
// /app/modules/store/components/admin/builder/StorePageEditor.jsx
//
// Descripción:
// Editor dinámico de páginas fijas de Tags Store.
// Guarda configuración en settings_json.pageEditors.
// Contexto: store
// =====================================

"use client";

import { useMemo, useState } from "react";

import showAlert from "@/app/components/showAlert";

import {
    getStorePageDefinition
} from "@/app/modules/store/lib/storePageDefinitions";

import {
    FaCheck,
    FaCircleInfo,
    FaFloppyDisk,
    FaPalette,
    FaXmark
} from "react-icons/fa6";

export default function StorePageEditor({
    store,
    pageType,
    onBack,
    onUpdated
}) {

    const definition =
        getStorePageDefinition(pageType);

    const editor =
        definition?.editor || {};

    const tabs =
        Array.isArray(editor.tabs)
            ? editor.tabs
            : [];

    const currentConfig =
        store?.settings_json?.pageEditors?.[pageType] || {};

    const [activeTab, setActiveTab] =
        useState(tabs[0]?.id || "content");

    const [content, setContent] =
        useState({
            ...(definition?.defaultContent || {}),
            ...(currentConfig.content || {})
        });

    const [styles, setStyles] =
        useState({
            ...(definition?.defaultStyles || {}),
            ...(currentConfig.styles || {})
        });

    const [typography, setTypography] =
        useState(currentConfig.typography || {});

    const [animation, setAnimation] =
        useState(currentConfig.animation || {});

    const [saving, setSaving] =
        useState(false);

    const activeTabConfig =
        useMemo(
            () =>
                tabs.find(tab => tab.id === activeTab) ||
                tabs[0] ||
                null,
            [tabs, activeTab]
        );

    function updateContent(key, value) {
        setContent(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function updateStyle(key, value) {
        setStyles(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function updateTypography(part, key, value) {
        setTypography(prev => ({
            ...prev,
            [part]: {
                ...(prev[part] || {}),
                [key]: value
            }
        }));
    }

    function getFieldValue(field) {
        const target =
            field.target || "content";

        if (target === "styles") {
            return styles[field.key] ?? "";
        }

        if (target === "typography") {
            return typography?.[field.part]?.[field.key] ?? "";
        }

        if (target === "animation") {
            return animation[field.key] ?? "";
        }

        return content[field.key] ?? field.defaultValue ?? "";
    }

    function updateField(field, value) {
        const target =
            field.target || "content";

        if (target === "styles") {
            updateStyle(field.key, value);
            return;
        }

        if (target === "typography") {
            updateTypography(field.part, field.key, value);
            return;
        }

        if (target === "animation") {
            setAnimation(prev => ({
                ...prev,
                [field.key]: value
            }));
            return;
        }

        updateContent(field.key, value);
    }

    async function handleSave() {
        setSaving(true);

        try {
            const nextSettings = {
                ...(store.settings_json || {}),
                pageEditors: {
                    ...(store.settings_json?.pageEditors || {}),
                    [pageType]: {
                        content,
                        styles,
                        typography,
                        animation
                    }
                }
            };

            const res =
                await fetch(
                    "/api/store/admin/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId: store.business_id,
                            storeId: store.id,
                            ...store,
                            settings_json: nextSettings,
                            styles_json: store.styles_json || {}
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error guardando configuración"
                );
            }

            showAlert({
                title: "Guardado",
                text: "La página se actualizó correctamente.",
                icon: "success",
                timer: 1200
            });

            onUpdated?.();

            return true;

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

            return false;

        } finally {
            setSaving(false);
        }
    }

    function renderField(field) {
        const value =
            getFieldValue(field);

        if (field.type === "checkbox") {
            return (
                <label className="qr_page_checkbox store_builder_switch">
                    <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(e) =>
                            updateField(field, e.target.checked)
                        }
                    />
                    <span>
                        {field.checkboxLabel || "Activado"}
                    </span>
                </label>
            );
        }

        if (field.type === "textarea") {
            return (
                <textarea
                    className="qr_page_textarea"
                    value={value || ""}
                    onChange={(e) =>
                        updateField(field, e.target.value)
                    }
                />
            );
        }

        if (field.type === "select") {
            return (
                <select
                    className="qr_page_select"
                    value={value || ""}
                    onChange={(e) =>
                        updateField(field, e.target.value)
                    }
                >
                    <option value="">
                        {field.emptyLabel || "Por defecto"}
                    </option>

                    {(field.options || []).map(option => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
            );
        }

        if (field.type === "color") {
            return (
                <div className="store_color_field">
                    <input
                        className="qr_page_input qr_page_color"
                        type="color"
                        value={value || "#000000"}
                        onChange={(e) =>
                            updateField(field, e.target.value)
                        }
                    />

                    <button
                        type="button"
                        className="store_color_default_btn"
                        onClick={() =>
                            updateField(field, "")
                        }
                    >
                        Por defecto
                    </button>
                </div>
            );
        }
        /* tipografia */
        if (field.type === "typography") {
            return (
                <div className="store_page_typography_editor">
                    {
                        (field.parts || []).map(part => {

                            const value =
                                typography?.[part.key] || {};

                            return (
                                <div
                                    key={part.key}
                                    className="store_page_typography_part"
                                >
                                    <h5>
                                        {part.label}
                                    </h5>

                                    {
                                        part.description && (
                                            <p>
                                                {part.description}
                                            </p>
                                        )
                                    }

                                    <div className="qr_page_grid">

                                        <div className="qr_page_field">
                                            <label>Color</label>

                                            <div className="store_color_field">
                                                <input
                                                    className="qr_page_input qr_page_color"
                                                    type="color"
                                                    value={value.color || "#000000"}
                                                    onChange={(e) =>
                                                        updateTypography(
                                                            part.key,
                                                            "color",
                                                            e.target.value
                                                        )
                                                    }
                                                />

                                                <button
                                                    type="button"
                                                    className="store_color_default_btn"
                                                    onClick={() =>
                                                        updateTypography(
                                                            part.key,
                                                            "color",
                                                            ""
                                                        )
                                                    }
                                                >
                                                    Por defecto
                                                </button>
                                            </div>
                                        </div>

                                        <div className="qr_page_field">
                                            <label>Tamaño</label>

                                            <select
                                                className="qr_page_select"
                                                value={value.fontSize || ""}
                                                onChange={(e) =>
                                                    updateTypography(
                                                        part.key,
                                                        "fontSize",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="">Por defecto</option>
                                                <option value="12px">12px</option>
                                                <option value="14px">14px</option>
                                                <option value="16px">16px</option>
                                                <option value="18px">18px</option>
                                                <option value="20px">20px</option>
                                                <option value="24px">24px</option>
                                                <option value="28px">28px</option>
                                                <option value="32px">32px</option>
                                                <option value="40px">40px</option>
                                            </select>
                                        </div>

                                        <div className="qr_page_field">
                                            <label>Peso</label>

                                            <select
                                                className="qr_page_select"
                                                value={value.fontWeight || ""}
                                                onChange={(e) =>
                                                    updateTypography(
                                                        part.key,
                                                        "fontWeight",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="">Por defecto</option>
                                                <option value="400">Normal</option>
                                                <option value="500">Medio</option>
                                                <option value="600">Semi bold</option>
                                                <option value="700">Bold</option>
                                                <option value="800">Extra bold</option>
                                            </select>
                                        </div>

                                        <div className="qr_page_field">
                                            <label>Alineación</label>

                                            <select
                                                className="qr_page_select"
                                                value={value.textAlign || ""}
                                                onChange={(e) =>
                                                    updateTypography(
                                                        part.key,
                                                        "textAlign",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="">Por defecto</option>
                                                <option value="left">Izquierda</option>
                                                <option value="center">Centrado</option>
                                                <option value="right">Derecha</option>
                                            </select>
                                        </div>

                                    </div>
                                </div>
                            );

                        })
                    }
                </div>
            );
        }
        /******************** */
        return (
            <input
                className="qr_page_input"
                value={value || ""}
                onChange={(e) =>
                    updateField(field, e.target.value)
                }
            />
        );
    }

    function renderGroup(group, index) {
        if (
            group?.title === "Estado del bloque"
        ) {
            return null;
        }
        return (
            <div
                key={`${group.title}-${index}`}
                className="store_builder_group_card"
            >
                <div className="store_builder_group_header">
                    <div className="store_builder_group_icon">
                        <FaCircleInfo />
                    </div>

                    <div>
                        <h4>{group.title}</h4>
                        {group.description && <p>{group.description}</p>}
                    </div>
                </div>

                <div className="qr_page_grid">
                    {(group.fields || []).map(field => (
                        <div
                            key={`${field.target || "content"}-${field.part || ""}-${field.key}`}
                            className={[
                                "qr_page_field",
                                field.type === "checkbox"
                                    ? "store_page_checkbox_field"
                                    : "full"
                            ].filter(Boolean).join(" ")}
                        >
                            {field.label && (
                                <label>{field.label}</label>
                            )}

                            {renderField(field)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!definition) {
        return null;
    }

    return (
        <div className="store_page_editor">

            <div className="qr_page_builder_panel_header">

                <div>
                    <button
                        type="button"
                        className="qr_page_btn secondary mb-3"
                        onClick={onBack}
                    >
                        ← Volver a páginas
                    </button>

                    <h2>
                        {definition.name}
                    </h2>

                    <p>
                        {editor.description}
                    </p>
                </div>

            </div>

            <div className="store_block_editor_tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`store_block_editor_tab_btn ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="store_block_editor_body">
                <div className="store_block_editor_panel">
                    {activeTabConfig?.description && (
                        <div className="store_builder_tab_intro">
                            {activeTabConfig.description}
                        </div>
                    )}

                    <div className="store_builder_groups">
                        {(activeTabConfig?.groups || []).map(renderGroup)}
                    </div>
                </div>
            </div>

            <div className="store_block_editor_footer">
                <button
                    type="button"
                    className="qr_page_btn secondary"
                    onClick={onBack}
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    className="qr_page_btn success"
                    onClick={handleSave}
                    disabled={saving}
                >
                    <FaFloppyDisk />
                    <span>{saving ? "Guardando..." : "Guardar"}</span>
                </button>

                <button
                    type="button"
                    className="qr_page_btn primary"
                    disabled={saving}
                    onClick={async () => {
                        const ok =
                            await handleSave();

                        if (ok !== false) {
                            onBack();
                        }
                    }}
                >
                    <FaCheck />
                    <span>Guardar y volver</span>
                </button>
            </div>
            <style jsx>{`
                        .store_page_checkbox_field {
                            width: 100%;
                        }
                        
                        .store_page_typography_editor {
                            display: grid;
                            gap: 18px;
                        }   

                        .store_page_typography_part {
                            padding: 16px;
                            border: 1px solid #e5e7eb;
                            border-radius: 14px;
                            background: #ffffff;
                        }

                        .store_page_typography_part h5 {
                            margin: 0 0 4px;
                            font-size: .95rem;
                            font-weight: 800;
                        }

                        .store_page_typography_part p {
                            margin: 0 0 14px;
                            color: #64748b;
                            font-size: .82rem;
                        }

                        @media (min-width: 768px) {
                            .store_page_checkbox_field {
                                grid-column: span 4;
                            }
                        }

                        @media (max-width: 767px) {
                            .store_page_checkbox_field {
                                grid-column: span 6;
                            }
                        }
                    `}
            </style>
        </div>


    );


}