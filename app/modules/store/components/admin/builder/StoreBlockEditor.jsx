// =====================================
// Archivo:
// /app/modules/store/components/admin/builder/StoreBlockEditor.jsx
//
// Descripción:
// Editor dinámico de bloques del Builder
// de Tags Store. Interpreta definiciones
// declarativas de módulos.
// =====================================

"use client";

import { useMemo, useState } from "react";

import showAlert from "@/app/components/showAlert";

import MediaUploader from "@/app/components/MediaUploader";

import { getStoreModuleDefinition }
    from "@/app/modules/store/lib/storeModuleDefinitions";

import "../../../styles/store-public.css";
import "../../../../../styles/tags_store_admin.css"

import {
    FaAlignLeft,
    FaBrush,
    FaBullhorn,
    FaCheck,
    FaCircleInfo,
    FaEye,
    FaFloppyDisk,
    FaFont,
    FaGear,
    FaImage,
    FaLayerGroup,
    FaLink,
    FaListCheck,
    FaPalette,
    FaRectangleList,
    FaRegFileLines,
    FaStore,
    FaToggleOn,
    FaWandMagicSparkles,
    FaXmark
} from "react-icons/fa6";

const EDITOR_ICONS = {
    animation: FaWandMagicSparkles,
    button: FaRectangleList,
    content: FaCircleInfo,
    design: FaPalette,
    fields: FaRegFileLines,
    font: FaFont,
    image: FaImage,
    layout: FaLayerGroup,
    link: FaLink,
    marketing: FaBullhorn,
    options: FaListCheck,
    palette: FaPalette,
    preview: FaEye,
    settings: FaGear,
    store: FaStore,
    style: FaBrush,
    switch: FaToggleOn,
    text: FaAlignLeft
};

const DEFAULT_FONT_OPTIONS = [
    "Inter",
    "Poppins",
    "Montserrat",
    "Raleway",
    "Lora",
    "Oswald"
];

const DEFAULT_WEIGHT_OPTIONS = [
    "300",
    "400",
    "500",
    "600",
    "700",
    "800"
];

const DEFAULT_SIZE_OPTIONS = [
    "12px",
    "14px",
    "16px",
    "18px",
    "20px",
    "24px",
    "28px",
    "32px",
    "40px",
    "48px",
    "56px"
];

function getIcon(iconKey, fallback = FaCircleInfo) {
    return EDITOR_ICONS[iconKey] || fallback;
}

function getFieldValue({
    field,
    title,
    isVisible,
    entity,
    content,
    styles,
    animation
}) {
    const target =
        field.target || "content";

    if (target === "block") {
        if (field.key === "title") {
            return title;
        }

        if (field.key === "is_visible") {
            return isVisible;
        }

        return "";
    }

    if (target === "styles") {
        return styles[field.key];
    }

    if (target === "animation") {
        return animation[field.key];
    }

    if (target === "typography") {
        return styles.typography?.[field.part]?.[field.key];
    }

    const value =
        content[field.key];

    if (
        value !== undefined &&
        value !== null &&
        value !== ""
    ) {
        return value;
    }

    if (field.fallback === "entity.name") {
        return entity?.name || "";
    }

    if (field.fallback === "entity.description") {
        return entity?.description || "";
    }

    if (field.defaultValue !== undefined) {
        return field.defaultValue;
    }

    return "";
}

export default function StoreBlockEditor({
    businessId,
    entity,
    section,
    block,
    onClose,
    onBlockUpdated
}) {

    const module =
        getStoreModuleDefinition(block.block_type);

    const editor =
        module?.editor || {};

    const tabs =
        Array.isArray(editor.tabs)
            ? editor.tabs
            : [];

    const firstTabId =
        tabs[0]?.id || "content";

    const [activeTab, setActiveTab] =
        useState(firstTabId);

    const [title, setTitle] =
        useState(block.title || "");

    const [isVisible, setIsVisible] =
        useState(!!block.is_visible);

    const [content, setContent] =
        useState(block.content_json || {});

    const [styles, setStyles] =
        useState(block.styles_json || {});

    const [animation, setAnimation] =
        useState(block.animation_json || {});

    const originalState = useMemo(() => ({

        title:
            block.title || "",

        isVisible:
            !!block.is_visible,

        content:
            structuredClone(
                block.content_json || {}
            ),

        styles:
            structuredClone(
                block.styles_json || {}
            ),

        animation:
            structuredClone(
                block.animation_json || {}
            )

    }), [block]);

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
        setContent(prev => {

            const next = {
                ...prev
            };

            if (
                value === "" ||
                value === null ||
                value === undefined
            ) {
                delete next[key];
            }
            else {
                next[key] = value;
            }

            return next;

        });
    }

    function updateStyle(key, value) {

        setStyles(prev => {

            const next = {
                ...prev
            };

            if (
                value === "" ||
                value === null ||
                value === undefined
            ) {
                delete next[key];
            }
            else {
                next[key] = value;
            }

            return next;

        });

    }

    function updateTypography(part, key, value) {

        setStyles(prev => {

            const next = {
                ...prev
            };

            const typography = {
                ...(next.typography || {})
            };

            const partValues = {
                ...(typography[part] || {})
            };

            if (
                value === "" ||
                value === null ||
                value === undefined
            ) {
                delete partValues[key];
            }
            else {
                partValues[key] = value;
            }

            if (Object.keys(partValues).length) {
                typography[part] = partValues;
            }
            else {
                delete typography[part];
            }

            if (Object.keys(typography).length) {
                next.typography = typography;
            }
            else {
                delete next.typography;
            }

            return next;

        });

    }

    function updateAnimation(key, value) {
        setAnimation(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function updateField(field, value) {
        const target =
            field.target || "content";

        if (target === "block") {
            if (field.key === "title") {
                setTitle(value);
            }

            if (field.key === "is_visible") {
                setIsVisible(value);
            }

            return;
        }

        if (target === "styles") {
            updateStyle(field.key, value);
            return;
        }

        if (target === "animation") {
            updateAnimation(field.key, value);
            return;
        }

        if (target === "typography") {
            updateTypography(field.part, field.key, value);
            return;
        }

        updateContent(field.key, value);
    }

    function buildUpdatedBlock() {
        return {
            ...block,
            title,
            content_json: content,
            styles_json: styles,
            animation_json: animation,
            is_visible: isVisible
        };
    }

    async function handleSave() {
        setSaving(true);

        try {
            const updatedBlock =
                buildUpdatedBlock();

            const res =
                await fetch(
                    "/api/store/admin/builder/blocks/update",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            sectionId: section.id,
                            blockId: block.id,
                            block_type: block.block_type,
                            title: updatedBlock.title,
                            content_json: updatedBlock.content_json,
                            styles_json: updatedBlock.styles_json,
                            animation_json: updatedBlock.animation_json,
                            is_visible: updatedBlock.is_visible
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error guardando bloque"
                );
            }

            const savedBlock =
                data.block ||
                data.data ||
                updatedBlock;

            onBlockUpdated?.({
                ...updatedBlock,
                ...savedBlock,
                content_json:
                    savedBlock.content_json ??
                    updatedBlock.content_json,
                styles_json:
                    savedBlock.styles_json ??
                    updatedBlock.styles_json,
                animation_json:
                    savedBlock.animation_json ??
                    updatedBlock.animation_json,
                is_visible:
                    savedBlock.is_visible ??
                    updatedBlock.is_visible
            });

            showAlert({
                title: "Guardado",
                text: "Los cambios se guardaron correctamente.",
                icon: "success",
                timer: 1200
            });

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

    function renderTextField({ field, value }) {
        return (
            <input
                className="qr_page_input"
                value={value || ""}
                placeholder={field.placeholder || ""}
                onChange={(e) =>
                    updateField(field, e.target.value)
                }
            />
        );
    }

    function renderTextareaField({ field, value }) {
        return (
            <textarea
                className="qr_page_textarea"
                value={value || ""}
                placeholder={field.placeholder || ""}
                onChange={(e) =>
                    updateField(field, e.target.value)
                }
            />
        );
    }

    function renderSwitchField({ field, value }) {
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
                    {field.checkboxLabel || field.switchLabel || "Activado"}
                </span>
            </label>
        );
    }

    function renderNumberField({ field, value }) {
        return (
            <input
                className="qr_page_input"
                type="number"
                min={field.min}
                max={field.max}
                step={field.step || 1}
                value={value ?? ""}
                placeholder={field.placeholder || ""}
                onChange={(e) =>
                    updateField(
                        field,
                        e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                    )
                }
            />
        );
    }

    function renderSliderField({ field, value }) {
        const currentValue =
            Number(value ?? field.defaultValue ?? field.min ?? 0);

        return (
            <div className="store_range_field">
                <input
                    type="range"
                    min={field.min ?? 0}
                    max={field.max ?? 100}
                    step={field.step ?? 1}
                    value={currentValue}
                    onChange={(e) =>
                        updateField(
                            field,
                            Number(e.target.value)
                        )
                    }
                />

                <div className="store_range_labels">
                    <span>{field.minLabel || "Mínimo"}</span>
                    <strong>
                        {currentValue}
                        {field.suffix || ""}
                    </strong>
                    <span>{field.maxLabel || "Máximo"}</span>
                </div>
            </div>
        );
    }

    function renderSelectField({ field, value }) {
        return (
            <select
                className="qr_page_select"
                value={value || ""}
                onChange={(e) =>
                    updateField(field, e.target.value)
                }
            >
                <option value="">
                    {field.emptyLabel || "Por Defecto"}
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

    function renderButtonGroupField({ field, value }) {
        return (
            <div className="store_builder_button_group">
                {(field.options || []).map(option => (
                    <button
                        key={option.value}
                        type="button"
                        className={value === option.value ? "active" : ""}
                        onClick={() =>
                            updateField(field, option.value)
                        }
                    >
                        {option.icon && (() => {
                            const OptionIcon =
                                getIcon(option.icon, FaCircleInfo);

                            return <OptionIcon />;
                        })()}

                        <span>
                            {option.label}
                        </span>
                    </button>
                ))}
            </div>
        );
    }

    function renderColorField({ field, value }) {

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
                        updateField(field, undefined)
                    }
                >
                    Por defecto
                </button>

            </div>

        );

    }

    function renderUrlField({ field, value }) {
        return (
            <input
                className="qr_page_input"
                type="url"
                value={value || ""}
                placeholder={field.placeholder || "https://"}
                onChange={(e) =>
                    updateField(field, e.target.value)
                }
            />
        );
    }

    function renderLinkField({ field, value }) {
        const linkValue =
            value && typeof value === "object"
                ? value
                : {
                    label: "",
                    url: "",
                    target: "_self"
                };

        function updateLink(key, nextValue) {
            updateField(
                field,
                {
                    ...linkValue,
                    [key]: nextValue
                }
            );
        }

        return (
            <div className="store_builder_link_field">
                <input
                    className="qr_page_input"
                    value={linkValue.label || ""}
                    placeholder={field.labelPlaceholder || "Texto del enlace"}
                    onChange={(e) =>
                        updateLink("label", e.target.value)
                    }
                />

                <input
                    className="qr_page_input"
                    type="url"
                    value={linkValue.url || ""}
                    placeholder={field.urlPlaceholder || "https://"}
                    onChange={(e) =>
                        updateLink("url", e.target.value)
                    }
                />

                <select
                    className="qr_page_select"
                    value={linkValue.target || "_self"}
                    onChange={(e) =>
                        updateLink("target", e.target.value)
                    }
                >
                    <option value="_self">Abrir en la misma página</option>
                    <option value="_blank">Abrir en una nueva pestaña</option>
                </select>
            </div>
        );
    }

    function renderIconField({ field, value }) {
        return (
            <div className="store_builder_icon_picker">
                {(field.options || Object.keys(EDITOR_ICONS)).map(iconKey => {
                    const Icon =
                        getIcon(iconKey, FaCircleInfo);

                    return (
                        <button
                            key={iconKey}
                            type="button"
                            className={value === iconKey ? "active" : ""}
                            onClick={() =>
                                updateField(field, iconKey)
                            }
                            title={iconKey}
                        >
                            <Icon />
                        </button>
                    );
                })}
            </div>
        );
    }

    function renderImageField({ field, value }) {
        return (
            <MediaUploader
                businessId={businessId}
                module={field.module || "store"}
                variant={field.variant || "hero"}
                entityId={field.entityId || block.id}
                fileName={field.fileName || field.key || "image"}
                replace={field.replace !== false}
                previousStoragePath={
                    content[field.storagePathKey] ||
                    content.imageStoragePath ||
                    ""
                }
                previousOgStoragePath={
                    content[field.ogStoragePathKey] ||
                    content.imageOgStoragePath ||
                    ""
                }
                value={value || ""}
                label={field.uploadLabel || "Subir imagen"}
                onChange={(media) => {
                    updateField(
                        field,
                        media?.url ||
                        media?.file_url ||
                        media ||
                        ""
                    );

                    if (field.storagePathKey) {
                        updateContent(
                            field.storagePathKey,
                            media?.storagePath || ""
                        );
                    }

                    if (field.ogUrlKey) {
                        updateContent(
                            field.ogUrlKey,
                            media?.og_url || ""
                        );
                    }

                    if (field.ogStoragePathKey) {
                        updateContent(
                            field.ogStoragePathKey,
                            media?.ogStoragePath || ""
                        );
                    }
                }}
            />
        );
    }

    function renderRepeaterField({ field, value }) {
        const items =
            Array.isArray(value)
                ? value
                : [];

        const itemFields =
            field.itemFields || [
                {
                    key: "title",
                    type: "text",
                    label: "Título"
                },
                {
                    key: "text",
                    type: "textarea",
                    label: "Texto"
                }
            ];

        function getItemFieldValue(item, itemField) {
            return item?.[itemField.key] ?? "";
        }

        function updateItem(index, itemKey, itemValue) {
            const next =
                [...items];

            next[index] = {
                ...next[index],
                [itemKey]: itemValue
            };

            updateField(field, next);
        }

        function renderItemField(itemField, item, index) {
            const itemValue =
                getItemFieldValue(item, itemField);

            if (itemField.type === "textarea") {
                return (
                    <textarea
                        className="qr_page_textarea"
                        value={itemValue || ""}
                        placeholder={itemField.placeholder || ""}
                        onChange={(e) =>
                            updateItem(
                                index,
                                itemField.key,
                                e.target.value
                            )
                        }
                    />
                );
            }

            if (itemField.type === "select") {
                return (
                    <select
                        className="qr_page_select"
                        value={itemValue || ""}
                        onChange={(e) =>
                            updateItem(
                                index,
                                itemField.key,
                                e.target.value
                            )
                        }
                    >
                        <option value="">
                            {itemField.emptyLabel || "Elegir opción"}
                        </option>

                        {(itemField.options || []).map(option => (
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

            if (itemField.type === "switch" || itemField.type === "checkbox") {
                return (
                    <label className="qr_page_checkbox store_builder_switch">
                        <input
                            type="checkbox"
                            checked={itemValue === true}
                            onChange={(e) =>
                                updateItem(
                                    index,
                                    itemField.key,
                                    e.target.checked
                                )
                            }
                        />

                        <span>
                            {itemField.checkboxLabel || "Activado"}
                        </span>
                    </label>
                );
            }

            if (itemField.type === "number") {
                return (
                    <input
                        className="qr_page_input"
                        type="number"
                        min={itemField.min}
                        max={itemField.max}
                        step={itemField.step || 1}
                        value={itemValue ?? ""}
                        placeholder={itemField.placeholder || ""}
                        onChange={(e) =>
                            updateItem(
                                index,
                                itemField.key,
                                e.target.value === ""
                                    ? ""
                                    : Number(e.target.value)
                            )
                        }
                    />
                );
            }

            if (itemField.type === "url") {
                return (
                    <input
                        className="qr_page_input"
                        type="url"
                        value={itemValue || ""}
                        placeholder={itemField.placeholder || "https://"}
                        onChange={(e) =>
                            updateItem(
                                index,
                                itemField.key,
                                e.target.value
                            )
                        }
                    />
                );
            }

            return (
                <input
                    className="qr_page_input"
                    value={itemValue || ""}
                    placeholder={itemField.placeholder || ""}
                    onChange={(e) =>
                        updateItem(
                            index,
                            itemField.key,
                            e.target.value
                        )
                    }
                />
            );
        }

        return (
            <div className="store_builder_items_editor">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="store_builder_item_card"
                    >
                        {itemFields.map(itemField => (
                            <div
                                key={itemField.key}
                                className="qr_page_field full"
                            >
                                <label>
                                    {itemField.label}
                                </label>

                                {renderItemField(itemField, item, index)}
                            </div>
                        ))}

                        <button
                            type="button"
                            className="qr_page_btn secondary"
                            onClick={() =>
                                updateField(
                                    field,
                                    items.filter((_, i) => i !== index)
                                )
                            }
                        >
                            Quitar
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    className="qr_page_btn secondary"
                    onClick={() =>
                        updateField(
                            field,
                            [
                                ...items,
                                itemFields.reduce((acc, itemField) => ({
                                    ...acc,
                                    [itemField.key]:
                                        itemField.defaultValue ??
                                        (
                                            itemField.type === "switch" ||
                                                itemField.type === "checkbox"
                                                ? false
                                                : ""
                                        )
                                }), {})
                            ]
                        )
                    }
                >
                    {field.addLabel || "+ Agregar item"}
                </button>
            </div>
        );
    }

    function renderTypographyField({ field }) {
        const parts =
            field.parts || [];

        if (!parts.length) {
            return (
                <div className="qr_page_info_box">
                    Este bloque no tiene textos configurables.
                </div>
            );
        }

        return (
            <div className="store_builder_typography_list">
                {parts.map(part => {
                    const typography =
                        styles.typography?.[part.key] || {};

                    return (
                        <div
                            key={part.key}
                            className="store_builder_typography_card"
                        >
                            <h4>
                                {part.label || part.key}
                            </h4>

                            {part.description && (
                                <p>
                                    {part.description}
                                </p>
                            )}

                            <div className="qr_page_grid">
                                <div className="qr_page_field">
                                    <label>Tipo de letra</label>

                                    <select
                                        className="qr_page_select"
                                        value={typography.fontFamily || ""}
                                        onChange={(e) =>
                                            updateTypography(
                                                part.key,
                                                "fontFamily",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">Usar la de la tienda</option>

                                        {(field.fontOptions || DEFAULT_FONT_OPTIONS).map(font => (
                                            <option
                                                key={font}
                                                value={font}
                                            >
                                                {font}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="qr_page_field">
                                    <label>Tamaño</label>

                                    <select
                                        className="qr_page_select"
                                        value={typography.fontSize || ""}
                                        onChange={(e) =>
                                            updateTypography(
                                                part.key,
                                                "fontSize",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">Automático</option>

                                        {(field.sizeOptions || DEFAULT_SIZE_OPTIONS).map(size => (
                                            <option
                                                key={size}
                                                value={size}
                                            >
                                                {size}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="qr_page_field">
                                    <label>Grosor</label>

                                    <select
                                        className="qr_page_select"
                                        value={typography.fontWeight || ""}
                                        onChange={(e) =>
                                            updateTypography(
                                                part.key,
                                                "fontWeight",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">Normal de la tienda</option>

                                        {(field.weightOptions || DEFAULT_WEIGHT_OPTIONS).map(weight => (
                                            <option
                                                key={weight}
                                                value={weight}
                                            >
                                                {weight}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="qr_page_field">
                                    <label>Inclinación</label>

                                    <select
                                        className="qr_page_select"
                                        value={typography.fontStyle || ""}
                                        onChange={(e) =>
                                            updateTypography(
                                                part.key,
                                                "fontStyle",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">Normal</option>
                                        <option value="italic">Cursiva</option>
                                    </select>
                                </div>

                                <div className="qr_page_field">
                                    <label>Subrayado</label>

                                    <select
                                        className="qr_page_select"
                                        value={typography.textDecoration || ""}
                                        onChange={(e) =>
                                            updateTypography(
                                                part.key,
                                                "textDecoration",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">Sin subrayar</option>
                                        <option value="underline">Subrayado</option>
                                    </select>
                                </div>

                                <div className="qr_page_field">
                                    <label>Color</label>

                                    <div className="store_color_field">
                                        <input
                                            className="qr_page_input qr_page_color"
                                            type="color"
                                            value={typography.color || field.defaultColor || "#111827"}
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
                                                    undefined
                                                )
                                            }
                                        >
                                            Por defecto
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    function renderLogoPreviewField({
        entity,
        content
    }) {

        const logoWidth =
            Number(content.logoWidth || 220);

        const logoHeight =
            Number(content.logoHeight || 70);

        const logoPadding =
            Number(content.logoPadding || 0);

        return (
            <div className="store_logo_preview_field">
                {entity?.logo_url ? (
                    <img
                        src={entity.logo_url}
                        alt="Logo"
                        className="store_logo_preview_image"
                        style={{
                            width: logoWidth,
                            height: logoHeight,
                            padding: logoPadding,
                            objectFit: "contain"
                        }}
                    />
                ) : (
                    <div className="store_logo_preview_empty">
                        Sin logo configurado
                    </div>
                )}

                <small>
                    El logo se administra desde Información General de la tienda.
                </small>
            </div>
        );

    }
    const FIELD_REGISTRY = {
        buttonGroup: renderButtonGroupField,
        checkbox: renderSwitchField,
        color: renderColorField,
        icon: renderIconField,
        image: renderImageField,
        items: renderRepeaterField,
        link: renderLinkField,
        number: renderNumberField,
        range: renderSliderField,
        repeater: renderRepeaterField,
        logoPreview: renderLogoPreviewField,
        select: renderSelectField,
        slider: renderSliderField,
        switch: renderSwitchField,
        text: renderTextField,
        textarea: renderTextareaField,
        typography: renderTypographyField,
        url: renderUrlField
    };

    function renderField(field) {

        const value =
            getFieldValue({
                field,
                title,
                isVisible,
                content,
                styles,
                animation,
                entity
            });

        const Renderer =
            FIELD_REGISTRY[field.type] ||
            FIELD_REGISTRY.text;

        return Renderer({
            field,
            value,
            entity,
            title,
            isVisible,
            content,
            styles,
            animation
        });

    }

    function renderHeroImagePreview() {
        const cover =
            content.imageUrl ||
            entity?.cover_url;

        const imageFit =
            content.imageFit || "cover";

        const imagePosition =
            `${content.imagePositionX || "center"} ${content.imagePositionY || "center"}`;

        const overlayOpacity =
            Math.min(
                100,
                Math.max(
                    0,
                    Number(content.overlayOpacity ?? 40)
                )
            );

        const previewHeight =
            content.heroHeight === "small"
                ? "220px"
                : content.heroHeight === "large"
                    ? "360px"
                    : content.heroHeight === "full"
                        ? "420px"
                        : "300px";

        return (
            <div
                className="store_image_preview"
                style={{
                    height: previewHeight
                }}
            >
                {cover ? (
                    <img
                        src={cover}
                        alt=""
                        className="store_image_preview_img"
                        style={{
                            objectFit:
                                imageFit === "contain"
                                    ? "contain"
                                    : "cover",
                            objectPosition: imagePosition
                        }}
                    />
                ) : (
                    <div className="store_image_preview_empty">
                        Todavía no cargaste una imagen.
                    </div>
                )}

                {cover && overlayOpacity > 0 && (
                    <div
                        className="store_image_preview_overlay"
                        style={{
                            backgroundColor:
                                `rgba(0,0,0,${overlayOpacity / 100})`
                        }}
                    />
                )}
            </div>
        );
    }

    function renderEmptyPreview() {
        return null;
    }

    const PREVIEW_REGISTRY = {
        "hero": renderHeroImagePreview,
        "hero-image": renderHeroImagePreview,
        "header": renderEmptyPreview,
        "topbar": renderEmptyPreview
    };

    function renderPreview(previewKey) {
        const PreviewRenderer =
            PREVIEW_REGISTRY[previewKey];

        if (!PreviewRenderer) {
            return null;
        }

        return <PreviewRenderer />;
    }

    function renderGroup(group, index) {
        const GroupIcon =
            getIcon(group.icon, FaLayerGroup);

        const fields =
            Array.isArray(group.fields)
                ? group.fields
                : [];

        return (
            <div
                key={`${group.title || "group"}-${index}`}
                className="store_builder_group_card"
            >
                {(group.title || group.description) && (
                    <div className="store_builder_group_header">
                        <div className="store_builder_group_icon">
                            <GroupIcon />
                        </div>

                        <div>
                            {group.title && (
                                <h4>
                                    {group.title}
                                </h4>
                            )}

                            {group.description && (
                                <p>
                                    {group.description}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {!fields.length ? (
                    <div className="qr_page_info_box full">
                        Esta parte todavía no tiene opciones editables.
                    </div>
                ) : (
                    <div className="qr_page_grid">
                        {fields.map(field => (
                            <div
                                key={`${field.target || "content"}-${field.part || ""}-${field.key}`}
                                className={`qr_page_field ${field.full !== false ? "full" : ""}`}
                            >
                                {field.label && field.type !== "typography" && (
                                    <label>
                                        {field.label}
                                    </label>
                                )}

                                {field.description && (
                                    <small className="store_builder_field_help">
                                        {field.description}
                                    </small>
                                )}

                                {renderField(field)}

                                {field.help && (
                                    <small className="store_builder_field_help">
                                        {field.help}
                                    </small>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    function renderActiveTab() {
        if (!activeTabConfig) {
            return (
                <div className="qr_page_info_box full">
                    Este bloque todavía no tiene editor configurado.
                </div>
            );
        }

        const groups =
            Array.isArray(activeTabConfig.groups)
                ? activeTabConfig.groups
                : [];

        return (
            <>
                {activeTabConfig.description && (
                    <div className="store_builder_tab_intro">
                        {activeTabConfig.description}
                    </div>
                )}

                {activeTabConfig.preview && renderPreview(activeTabConfig.preview)}

                <div className="store_builder_groups">
                    {groups.map(renderGroup)}
                </div>
            </>
        );
    }

    return (
        <div className="qr_page_modal_overlay">
            <div className="qr_page_modal store_block_editor_modal">

                <div className="qr_page_modal_header store_block_editor_header">

                    <div className="store_editor_header_info">

                        <div className="store_editor_header_title">

                            <div className="store_editor_header_icon">
                                <FaStore />
                            </div>

                            <h3>
                                {module?.name || "Bloque"}
                            </h3>

                        </div>

                        <p>
                            {editor.description ||
                                "Personalizá cómo verán este bloque tus clientes."}
                        </p>

                    </div>

                    <button
                        type="button"
                        className="qr_page_modal_close"
                        onClick={onClose}
                    >
                        <FaXmark />
                    </button>

                </div>

                {!!tabs.length && (
                    <div className="store_block_editor_tabs">
                        {tabs.map(tab => {
                            const TabIcon =
                                getIcon(tab.icon, FaCircleInfo);

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    className={`store_block_editor_tab_btn ${activeTab === tab.id ? "active" : ""}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <TabIcon />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="store_block_editor_body">
                    <div className="store_block_editor_panel">
                        {renderActiveTab()}
                    </div>
                </div>

                <div className="store_block_editor_footer">
                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={onClose}
                    >
                        <FaXmark />
                        <span>Cancelar</span>
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <FaFloppyDisk />

                        <span>
                            {saving ? "Guardando..." : "Guardar"}
                        </span>

                    </button>

                    <button
                        type="button"
                        className="qr_page_btn primary"
                        disabled={saving}
                        onClick={async () => {
                            const ok =
                                await handleSave();

                            if (ok !== false) {
                                onClose();
                            }
                        }}
                    >
                        <FaCheck />
                        <span>Guardar y cerrar</span>
                    </button>

                </div>

            </div>
        </div>
    );
}