"use client";

import { useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

import {
    QR_PAGE_SECTION_TYPES,
    QR_PAGE_BLOCK_TYPES
} from "@/app/modules/qr-page/lib/qrPageBuilderTypes";

import QRPageBlockEditor
    from "./QRPageBlockEditor";

import QRPageSectionEditor
    from "./QRPageSectionEditor";

export default function QRPageSectionsManager({
    businessId,
    pageId,
    sections,
    onReload
}) {

    const [creatingSection, setCreatingSection] =
        useState(false);

    const [newSectionType, setNewSectionType] =
        useState("content");

    const [newSectionTitle, setNewSectionTitle] =
        useState("");

    const [creatingBlockSectionId, setCreatingBlockSectionId] =
        useState(null);

    const [newBlockType, setNewBlockType] =
        useState("text");

    const [saving, setSaving] =
        useState(false);

    const [editingBlock, setEditingBlock] =
        useState(null);

    const [editingSection, setEditingSection] =
        useState(null);

    async function apiPost(url, body) {

        const res =
            await fetch(
                url,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                }
            );

        const data =
            await res.json();

        if (!res.ok) {
            throw new Error(
                data.error || "Error en la operación"
            );
        }

        return data;
    }

    async function handleCreateSection() {

        if (!newSectionType) {
            return;
        }

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/sections/create",
                {
                    businessId,
                    pageId,
                    type: newSectionType,
                    title:
                        newSectionTitle ||
                        QR_PAGE_SECTION_TYPES.find(
                            (item) =>
                                item.value === newSectionType
                        )?.label ||
                        "Nueva sección",
                    settings_json: {},
                    styles_json: {}
                }
            );

            setCreatingSection(false);
            setNewSectionTitle("");
            setNewSectionType("content");

            showAlert({
                type: "success",
                title: "Listo",
                text: "Sección creada"
            });

            await onReload();

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

    async function handleUpdateSection(section, changes) {

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/sections/update",
                {
                    businessId,
                    pageId,
                    sectionId: section.id,
                    type:
                        changes.type ??
                        section.type,
                    title:
                        changes.title ??
                        section.title,
                    is_visible:
                        changes.is_visible ??
                        section.is_visible,
                    settings_json:
                        changes.settings_json ??
                        section.settings_json ??
                        {},
                    styles_json:
                        changes.styles_json ??
                        section.styles_json ??
                        {}
                }
            );

            await onReload();

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

    async function handleDeleteSection(section) {

        const confirmed =
            window.confirm(
                "¿Eliminar esta sección y todos sus bloques?"
            );

        if (!confirmed) {
            return;
        }

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/sections/delete",
                {
                    businessId,
                    pageId,
                    sectionId: section.id
                }
            );

            showAlert({
                type: "success",
                title: "Eliminada",
                text: "Sección eliminada"
            });

            await onReload();

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

    async function handleMoveSection(index, direction) {

        const nextSections =
            [...sections];

        const targetIndex =
            direction === "up"
                ? index - 1
                : index + 1;

        if (
            targetIndex < 0 ||
            targetIndex >= nextSections.length
        ) {
            return;
        }

        const current =
            nextSections[index];

        nextSections[index] =
            nextSections[targetIndex];

        nextSections[targetIndex] =
            current;

        const reordered =
            nextSections.map((section, i) => ({
                id: section.id,
                sort_order: i + 1
            }));

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/sections/reorder",
                {
                    businessId,
                    pageId,
                    sections: reordered
                }
            );

            await onReload();

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

    function getDefaultBlockContent(type) {

        if (type === "vcard") {
            return {
                buttonLabel: "Guardar contacto"
            };
        }

        if (type === "bullet_list") {

            return {

                title: "Nuestros beneficios",

                icon: "✓",

                iconColor: "#2563eb",

                items: [

                    "Atención personalizada",

                    "Respuesta rápida",

                    "Experiencia comprobable",

                    "Contacto directo"

                ]
            };
        }

        if (type === "profile_card") {
            return {
                photo_url: "",
                name: "Nombre Apellido",
                jobTitle: "Cargo o especialidad",
                company: "Empresa / Marca",
                bio: "Una presentación breve, clara y profesional."
            };
        }

        if (type === "social_actions") {
            return {
                showWhatsapp: true,
                showPhone: true,
                showEmail: true,
                showWebsite: true,
                showLinkedin: true,
                showInstagram: true
            };
        }

        if (type === "share_profile") {
            return {
                buttonLabel: "Compartir perfil"
            };
        }

        if (type === "profile_qr") {
            return {
                title: "Escaneá mi QR",
                text: "También podés compartir esta tarjeta escaneando el código.",
                showUrl: true
            };
        }

        if (type === "text") {
            return {
                title: "Nuevo texto",
                text: "Escribí el contenido de este bloque."
            };
        }

        if (type === "image") {
            return {
                image_url: "",
                alt: ""
            };
        }

        if (type === "video") {
            return {
                video_url: ""
            };
        }

        if (type === "button") {
            return {
                label: "Ver más",
                url: ""
            };
        }

        if (type === "whatsapp") {
            return {
                label: "Contactar por WhatsApp",
                phone: "",
                message: "Hola, quiero hacer una consulta."
            };
        }

        if (type === "social_links") {
            return {
                instagram: "",
                facebook: "",
                tiktok: "",
                youtube: "",
                linkedin: "",
                website: ""
            };
        }

        if (type === "map") {
            return {
                address: "",
                embed_url: ""
            };
        }

        if (type === "spacer") {
            return {
                height: 32
            };
        }
        if (type === "cards") {
            return {
                items: [
                    {
                        title: "Servicio destacado",
                        text: "Descripción breve del servicio, producto o propuesta.",
                        image_url: "",
                        button_label: "",
                        button_url: ""
                    },
                    {
                        title: "Atención personalizada",
                        text: "Una solución pensada para cada cliente.",
                        image_url: "",
                        button_label: "",
                        button_url: ""
                    },
                    {
                        title: "Respuesta rápida",
                        text: "Canales directos para consultas y reservas.",
                        image_url: "",
                        button_label: "",
                        button_url: ""
                    }
                ]
            };
        }

        if (type === "feature_list") {
            return {
                items: [
                    "Atención personalizada",
                    "Respuesta rápida",
                    "Experiencia comprobable",
                    "Contacto directo"
                ]
            };
        }

        if (type === "contact_info") {
            return {
                showWhatsapp: true,
                showPhone: true,
                showEmail: true,
                showAddress: true
            };
        }

        if (type === "faq") {
            return {
                items: [
                    {
                        question: "¿Cómo puedo consultar?",
                        answer: "Podés comunicarte directamente por WhatsApp, teléfono o email."
                    },
                    {
                        question: "¿Dónde están ubicados?",
                        answer: "La dirección y datos de contacto están disponibles en esta página."
                    }
                ]
            };
        }

        if (type === "testimonials") {
            return {
                items: [
                    {
                        name: "Cliente satisfecho",
                        role: "",
                        text: "Excelente atención y muy buena experiencia.",
                        image_url: ""
                    }
                ]
            };
        }

        if (type === "pricing_cards") {
            return {
                items: [
                    {
                        title: "Plan básico",
                        price: "$0",
                        features: [
                            "Característica 1",
                            "Característica 2",
                            "Característica 3"
                        ],
                        button_label: "Consultar",
                        button_url: ""
                    }
                ]
            };
        }

        if (type === "cta") {
            return {
                title: "¿Querés hacer una consulta?",
                text: "Contactanos y te respondemos a la brevedad.",
                buttonLabel: "Contactar ahora",
                buttonUrl: ""
            };
        }

        if (type === "stats") {
            return {
                items: [
                    {
                        value: "+100",
                        label: "Clientes"
                    },
                    {
                        value: "+5",
                        label: "Años de experiencia"
                    },
                    {
                        value: "24hs",
                        label: "Respuesta rápida"
                    }
                ]
            };
        }

        if (type === "team") {
            return {
                items: [
                    {
                        name: "Nombre Apellido",
                        role: "Cargo o especialidad",
                        image_url: ""
                    }
                ]
            };
        }

        return {};
    }

    async function handleCreateBlock(section) {

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/blocks/create",
                {
                    businessId,
                    pageId,
                    sectionId: section.id,
                    type: newBlockType,
                    content_json:
                        getDefaultBlockContent(
                            newBlockType
                        ),
                    styles_json: {}
                }
            );

            setCreatingBlockSectionId(null);
            setNewBlockType("text");

            showAlert({
                type: "success",
                title: "Listo",
                text: "Bloque creado"
            });

            await onReload();

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

    async function handleUpdateBlock(section, block, changes) {

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/blocks/update",
                {
                    businessId,
                    pageId,
                    sectionId: section.id,
                    blockId: block.id,
                    type:
                        changes.type ??
                        block.type,
                    is_visible:
                        changes.is_visible ??
                        block.is_visible,
                    content_json:
                        changes.content_json ??
                        block.content_json ??
                        {},
                    styles_json:
                        changes.styles_json ??
                        block.styles_json ??
                        {}
                }
            );

            await onReload();

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

    async function handleDeleteBlock(section, block) {

        const confirmed =
            window.confirm(
                "¿Eliminar este bloque?"
            );

        if (!confirmed) {
            return;
        }

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/blocks/delete",
                {
                    businessId,
                    pageId,
                    sectionId: section.id,
                    blockId: block.id
                }
            );

            showAlert({
                type: "success",
                title: "Eliminado",
                text: "Bloque eliminado"
            });

            await onReload();

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

    async function handleMoveBlock(section, index, direction) {

        const blocks =
            [...(section.blocks || [])];

        const targetIndex =
            direction === "up"
                ? index - 1
                : index + 1;

        if (
            targetIndex < 0 ||
            targetIndex >= blocks.length
        ) {
            return;
        }

        const current =
            blocks[index];

        blocks[index] =
            blocks[targetIndex];

        blocks[targetIndex] =
            current;

        const reordered =
            blocks.map((block, i) => ({
                id: block.id,
                sort_order: i + 1
            }));

        setSaving(true);

        try {

            await apiPost(
                "/api/qr-page/blocks/reorder",
                {
                    businessId,
                    pageId,
                    sectionId: section.id,
                    blocks: reordered
                }
            );

            await onReload();

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

    function getLabel(list, value) {

        return list.find(
            (item) => item.value === value
        )?.label || value;
    }



    /*  UI  */

    return (
        <div className="qr_page_sections_manager">

            <div className="qr_page_builder_panel_header">

                <div>
                    <h2>
                        Secciones y bloques
                    </h2>

                    <p>
                        Organizá la estructura principal de tu QR-Page.
                    </p>
                </div>

                <button
                    type="button"
                    className="qr_page_btn success"
                    onClick={() =>
                        setCreatingSection(true)
                    }
                    disabled={saving}
                >
                    + Agregar sección
                </button>

            </div>

            {
                creatingSection && (
                    <div className="qr_page_inline_form">

                        <div className="qr_page_grid">

                            <div className="qr_page_field">
                                <label>Tipo de sección</label>

                                <select
                                    className="qr_page_select"
                                    value={newSectionType}
                                    onChange={(e) =>
                                        setNewSectionType(
                                            e.target.value
                                        )
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
                                <label>Título interno</label>

                                <input
                                    className="qr_page_input"
                                    value={newSectionTitle}
                                    onChange={(e) =>
                                        setNewSectionTitle(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ej: Servicios, Contacto..."
                                />
                            </div>

                        </div>

                        <div className="qr_page_actions mt">
                            <button
                                type="button"
                                className="qr_page_btn success"
                                onClick={handleCreateSection}
                                disabled={saving}
                            >
                                Crear sección
                            </button>

                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                onClick={() =>
                                    setCreatingSection(false)
                                }
                            >
                                Cancelar
                            </button>
                        </div>

                    </div>
                )
            }

            <div className="qr_page_sections_list">

                {
                    !sections?.length && (
                        <div className="qr_page_empty">
                            Todavía no hay secciones.
                        </div>
                    )
                }

                {
                    sections?.map((section, sectionIndex) => (
                        <div
                            key={section.id}
                            className="qr_page_section_card"
                        >

                            <div className="qr_page_section_top">

                                <div>
                                    <strong>
                                        {section.title || getLabel(
                                            QR_PAGE_SECTION_TYPES,
                                            section.type
                                        )}
                                    </strong>

                                    <span>
                                        {getLabel(
                                            QR_PAGE_SECTION_TYPES,
                                            section.type
                                        )}
                                    </span>
                                </div>

                                <div className="qr_page_small_actions">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleMoveSection(
                                                sectionIndex,
                                                "up"
                                            )
                                        }
                                        disabled={
                                            saving ||
                                            sectionIndex === 0
                                        }
                                    >
                                        ↑
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleMoveSection(
                                                sectionIndex,
                                                "down"
                                            )
                                        }
                                        disabled={
                                            saving ||
                                            sectionIndex ===
                                            sections.length - 1
                                        }
                                    >
                                        ↓
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingSection(section)
                                        }
                                        disabled={saving}
                                    >
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleUpdateSection(
                                                section,
                                                {
                                                    is_visible:
                                                        !section.is_visible
                                                }
                                            )
                                        }
                                        disabled={saving}
                                    >
                                        {
                                            section.is_visible
                                                ? "Ocultar"
                                                : "Mostrar"
                                        }
                                    </button>

                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() =>
                                            handleDeleteSection(
                                                section
                                            )
                                        }
                                        disabled={saving}
                                    >
                                        Eliminar
                                    </button>

                                </div>

                            </div>

                            <div className="qr_page_blocks_list">

                                {
                                    !(section.blocks || []).length && (
                                        <div className="qr_page_empty small">
                                            Sin bloques.
                                        </div>
                                    )
                                }

                                {
                                    (section.blocks || []).map(
                                        (block, blockIndex) => (
                                            <div
                                                key={block.id}
                                                className="qr_page_block_row"
                                            >

                                                <div>
                                                    <strong>
                                                        {getLabel(
                                                            QR_PAGE_BLOCK_TYPES,
                                                            block.type
                                                        )}
                                                    </strong>

                                                    <span>
                                                        #{block.id}
                                                    </span>
                                                </div>

                                                <div className="qr_page_small_actions">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleMoveBlock(
                                                                section,
                                                                blockIndex,
                                                                "up"
                                                            )
                                                        }
                                                        disabled={
                                                            saving ||
                                                            blockIndex === 0
                                                        }
                                                    >
                                                        ↑
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleMoveBlock(
                                                                section,
                                                                blockIndex,
                                                                "down"
                                                            )
                                                        }
                                                        disabled={
                                                            saving ||
                                                            blockIndex ===
                                                            section.blocks.length - 1
                                                        }
                                                    >
                                                        ↓
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditingBlock({
                                                                section,
                                                                block
                                                            })
                                                        }
                                                        disabled={saving}
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleUpdateBlock(
                                                                section,
                                                                block,
                                                                {
                                                                    is_visible:
                                                                        !block.is_visible
                                                                }
                                                            )
                                                        }
                                                        disabled={saving}
                                                    >
                                                        {
                                                            block.is_visible
                                                                ? "Ocultar"
                                                                : "Mostrar"
                                                        }
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        onClick={() =>
                                                            handleDeleteBlock(
                                                                section,
                                                                block
                                                            )
                                                        }
                                                        disabled={saving}
                                                    >
                                                        Eliminar
                                                    </button>

                                                </div>

                                            </div>
                                        )
                                    )
                                }

                            </div>

                            {
                                creatingBlockSectionId === section.id
                                    ? (
                                        <div className="qr_page_inline_form compact">

                                            <div className="qr_page_field">
                                                <label>Tipo de bloque</label>

                                                <select
                                                    className="qr_page_select"
                                                    value={newBlockType}
                                                    onChange={(e) =>
                                                        setNewBlockType(
                                                            e.target.value
                                                        )
                                                    }
                                                >
                                                    {
                                                        QR_PAGE_BLOCK_TYPES.map(
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

                                            <div className="qr_page_actions mt">
                                                <button
                                                    type="button"
                                                    className="qr_page_btn success"
                                                    onClick={() =>
                                                        handleCreateBlock(
                                                            section
                                                        )
                                                    }
                                                    disabled={saving}
                                                >
                                                    Crear bloque
                                                </button>

                                                <button
                                                    type="button"
                                                    className="qr_page_btn secondary"
                                                    onClick={() =>
                                                        setCreatingBlockSectionId(
                                                            null
                                                        )
                                                    }
                                                >
                                                    Cancelar
                                                </button>
                                            </div>

                                        </div>
                                    )
                                    : (
                                        <button
                                            type="button"
                                            className="qr_page_add_block_btn"
                                            onClick={() =>
                                                setCreatingBlockSectionId(
                                                    section.id
                                                )
                                            }
                                            disabled={saving}
                                        >
                                            + Agregar bloque
                                        </button>
                                    )
                            }

                        </div>
                    ))
                }

            </div>
            {
                editingBlock && (
                    <QRPageBlockEditor
                        businessId={businessId}
                        pageId={pageId}
                        section={editingBlock.section}
                        block={editingBlock.block}
                        onClose={() => setEditingBlock(null)}
                        onReload={onReload}
                    />
                )
            }
            {
                editingSection && (
                    <QRPageSectionEditor
                        businessId={businessId}
                        pageId={pageId}
                        section={editingSection}
                        onClose={() => setEditingSection(null)}
                        onReload={onReload}
                    />
                )
            }
        </div>
    );
}