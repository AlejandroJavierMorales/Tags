// =====================================
// Archivo:
// /app/modules/store/components/admin/builder/StoreSectionsManager.jsx
//
// Descripción:
// Administra secciones y bloques del Builder
// de Tags Store.
// =====================================

"use client";

import { useEffect, useState } from "react";

import showAlert from "@/app/components/showAlert";

import {
    STORE_SECTION_TYPES,
    STORE_BLOCK_TYPES
}
    from "@/app/modules/store/lib/builder/storeBuilderTypes";

import StoreSectionEditor from "./StoreSectionEditor";

import StoreBlockEditor from "./StoreBlockEditor";
import StorePageManager from "./StorePageManager";



export default function StoreSectionsManager({
    businessId,
    store,
    storeId,
    sections = [],
    blocks = [],
    onReload
}) {
    const [saving, setSaving] =
        useState(false);

    const [creatingSection, setCreatingSection] =
        useState(false);

    const [creatingBlockSectionId, setCreatingBlockSectionId] =
        useState(null);

    const [newSectionType, setNewSectionType] =
        useState("hero");

    const [newSectionTitle, setNewSectionTitle] =
        useState("");

    const [newBlockType, setNewBlockType] =
        useState("store_hero");

    const [newBlockTitle, setNewBlockTitle] =
        useState("");

    const [editingSection, setEditingSection] =
        useState(null);

    const [localSections, setLocalSections] =
        useState([]);

    const [localBlocks, setLocalBlocks] =
        useState([]);

    const [editingBlock, setEditingBlock] =
        useState(null);

    const [builderMode, setBuilderMode] =
        useState("blocks");


    useEffect(() => {
        setLocalSections(
            [...sections].sort(
                (a, b) =>
                    Number(a.sort_order || 0) -
                    Number(b.sort_order || 0)
            )
        );
    }, [sections]);

    useEffect(() => {
        setLocalBlocks(
            [...blocks].sort(
                (a, b) =>
                    Number(a.sort_order || 0) -
                    Number(b.sort_order || 0)
            )
        );
    }, [blocks]);

    function getSectionLabel(type) {
        return STORE_SECTION_TYPES.find(
            item => item.value === type
        )?.label || type;
    }

    function getBlockLabel(type) {
        return STORE_BLOCK_TYPES.find(
            item => item.value === type
        )?.label || type;
    }

    function isFixedSection(section) {
        return [
            "topbar",
            "footer"
        ].includes(section.section_type);
    }

    function getMovableSections() {
        return localSections.filter(
            section => !isFixedSection(section)
        );
    }

    function getMovableIndex(section) {
        return getMovableSections().findIndex(
            item =>
                Number(item.id) ===
                Number(section.id)
        );
    }

    function getSectionBlocks(sectionId) {
        return localBlocks
            .filter(
                block =>
                    Number(block.section_id) ===
                    Number(sectionId)
            )
            .sort(
                (a, b) =>
                    Number(a.sort_order || 0) -
                    Number(b.sort_order || 0)
            );
    }

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
            await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(
                data.error ||
                "Error en la operación"
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
                "/api/store/admin/builder/sections/create",
                {
                    storeId,
                    section_type: newSectionType,
                    title:
                        newSectionTitle ||
                        getSectionLabel(newSectionType),
                    settings_json: {}
                }
            );

            setCreatingSection(false);
            setNewSectionTitle("");
            setNewSectionType("hero");

            await onReload();

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

    async function handleCreateBlock(section) {
        if (!newBlockType) {
            return;
        }

        setSaving(true);

        try {
            await apiPost(
                "/api/store/admin/builder/blocks/create",
                {
                    sectionId: section.id,
                    block_type: newBlockType,
                    title:
                        newBlockTitle ||
                        getBlockLabel(newBlockType),
                    content_json: {},
                    styles_json: {},
                    animation_json: {}
                }
            );

            setCreatingBlockSectionId(null);
            setNewBlockTitle("");
            setNewBlockType("store_hero");

            await onReload();

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

    async function handleMoveSection(section, direction) {
        if (isFixedSection(section)) {
            return;
        }

        const fixedTop =
            localSections.filter(
                item => item.section_type === "topbar"
            );

        const movable =
            localSections.filter(
                item => !isFixedSection(item)
            );

        const fixedBottom =
            localSections.filter(
                item => item.section_type === "footer"
            );

        const currentIndex =
            movable.findIndex(
                item =>
                    Number(item.id) ===
                    Number(section.id)
            );

        const targetIndex =
            direction === "up"
                ? currentIndex - 1
                : currentIndex + 1;

        if (
            currentIndex < 0 ||
            targetIndex < 0 ||
            targetIndex >= movable.length
        ) {
            return;
        }

        const nextMovable =
            [...movable];

        const current =
            nextMovable[currentIndex];

        nextMovable[currentIndex] =
            nextMovable[targetIndex];

        nextMovable[targetIndex] =
            current;

        const nextSections =
            [
                ...fixedTop,
                ...nextMovable,
                ...fixedBottom
            ].map((item, index) => ({
                ...item,
                sort_order: index + 1
            }));

        const reordered =
            nextSections.map(item => ({
                id: item.id,
                sort_order: item.sort_order
            }));

        setLocalSections(nextSections);
        setSaving(true);

        try {
            await apiPost(
                "/api/store/admin/builder/sections/reorder",
                {
                    storeId,
                    sections: reordered
                }
            );

        } catch (err) {
            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

            await onReload();

        } finally {
            setSaving(false);
        }
    }

    async function handleMoveBlock(
        section,
        index,
        direction
    ) {
        const sectionBlocks =
            getSectionBlocks(section.id);

        const nextBlocks =
            [...sectionBlocks];

        const targetIndex =
            direction === "up"
                ? index - 1
                : index + 1;

        if (
            targetIndex < 0 ||
            targetIndex >= nextBlocks.length
        ) {
            return;
        }

        const current =
            nextBlocks[index];

        nextBlocks[index] =
            nextBlocks[targetIndex];

        nextBlocks[targetIndex] =
            current;

        const reordered =
            nextBlocks.map((block, i) => ({
                id: block.id,
                sort_order: i + 1
            }));

        setLocalBlocks(prev =>
            prev.map(block => {
                const updated =
                    reordered.find(
                        item =>
                            Number(item.id) ===
                            Number(block.id)
                    );

                return updated
                    ? {
                        ...block,
                        sort_order: updated.sort_order
                    }
                    : block;
            })
        );

        setSaving(true);

        try {
            await apiPost(
                "/api/store/admin/builder/blocks/reorder",
                {
                    sectionId: section.id,
                    blocks: reordered
                }
            );

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

            await onReload();

        } finally {
            setSaving(false);
        }
    }

    async function handleUpdateSection(section, changes) {
        setSaving(true);

        try {
            await apiPost(
                "/api/store/admin/builder/sections/update",
                {
                    storeId,
                    sectionId: section.id,
                    title:
                        changes.title ??
                        section.title,
                    section_type:
                        section.section_type,
                    is_visible:
                        changes.is_visible ??
                        section.is_visible,
                    settings_json:
                        changes.settings_json ??
                        section.settings_json ??
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

    async function toggleSection(section) {
        await handleUpdateSection(
            section,
            {
                is_visible:
                    !section.is_visible
            }
        );
    }

    async function toggleBlock(section, block) {
        setSaving(true);

        try {
            await apiPost(
                "/api/store/admin/builder/blocks/update",
                {
                    sectionId: section.id,
                    blockId: block.id,
                    block_type: block.block_type,
                    title: block.title,
                    content_json:
                        block.content_json || {},
                    styles_json:
                        block.styles_json || {},
                    animation_json:
                        block.animation_json || {},
                    is_visible:
                        !block.is_visible
                }
            );

            await onReload();

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

    async function handleDeleteSection(section) {
        const confirmed =
            await showAlert({
                title: "Eliminar sección",
                text: "¿Seguro querés eliminar esta sección y sus bloques?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        setSaving(true);

        try {
            await apiPost(
                "/api/store/admin/builder/sections/delete",
                {
                    storeId,
                    sectionId: section.id
                }
            );

            setLocalSections(prev =>
                prev.filter(item =>
                    Number(item.id) !== Number(section.id)
                )
            );

            setLocalBlocks(prev =>
                prev.filter(block =>
                    Number(block.section_id) !== Number(section.id)
                )
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

    async function handleDeleteBlock(section, block) {
        const confirmed =
            await showAlert({
                title: "Eliminar bloque",
                text: "¿Seguro querés eliminar este bloque?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        setSaving(true);

        try {
            await apiPost(
                "/api/store/admin/builder/blocks/delete",
                {
                    sectionId: section.id,
                    blockId: block.id
                }
            );

            setLocalBlocks(prev =>
                prev.filter(item =>
                    Number(item.id) !== Number(block.id)
                )
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

    function handleBlockUpdated(updatedBlock) {
        if (!updatedBlock?.id) {
            return;
        }

        setLocalBlocks(prev =>
            prev.map(block =>
                Number(block.id) === Number(updatedBlock.id)
                    ? {
                        ...block,
                        ...updatedBlock,
                        section_id:
                            updatedBlock.section_id ??
                            block.section_id,
                        sort_order:
                            updatedBlock.sort_order ??
                            block.sort_order
                    }
                    : block
            )
        );

        setEditingBlock(prev =>
            prev &&
                Number(prev.block.id) === Number(updatedBlock.id)
                ? {
                    ...prev,
                    block: {
                        ...prev.block,
                        ...updatedBlock,
                        section_id:
                            updatedBlock.section_id ??
                            prev.block.section_id,
                        sort_order:
                            updatedBlock.sort_order ??
                            prev.block.sort_order
                    }
                }
                : prev
        );
    }

    const creatableSectionTypes =
        STORE_SECTION_TYPES.filter(
            item =>
                ![
                    "topbar",
                    "footer"
                ].includes(item.value)
        );


    const currentEditingBlock =
        editingBlock
            ? localBlocks.find(
                b => Number(b.id) === Number(editingBlock.block.id)
            )
            : null;

    /*  UI  */


    return (
        <div className="qr_page_card">

            <div className="qr_page_builder_panel_header">
                <div>
                    <h2>
                        Constructor
                    </h2>

                    <p>
                        Editá la estructura visual de la tienda.
                    </p>
                </div>

                {
                    builderMode === "blocks" && (
                        <button
                            type="button"
                            className="qr_page_btn success"
                            disabled={saving}
                            onClick={() =>
                                setCreatingSection(true)
                            }
                        >
                            + Nueva sección
                        </button>
                    )
                }
            </div>

            <div className="store_builder_mode_tabs">
                <button
                    type="button"
                    className={builderMode === "blocks" ? "active" : ""}
                    onClick={() => setBuilderMode("blocks")}
                >
                    Bloques de la Tienda
                </button>

                <button
                    type="button"
                    className={builderMode === "pages" ? "active" : ""}
                    onClick={() => setBuilderMode("pages")}
                >
                    Páginas Internas
                </button>
            </div>
            {/* desde */}
            {builderMode === "blocks" && (
                <>
                    {creatingSection && (
                        <div className="qr_page_inline_form store_builder_inline_form">
                            <div className="qr_page_grid">

                                <div className="qr_page_field">
                                    <label>Tipo de sección</label>

                                    <select
                                        className="qr_page_select"
                                        value={newSectionType}
                                        onChange={(e) =>
                                            setNewSectionType(e.target.value)
                                        }
                                    >
                                        {creatableSectionTypes.map(item => (
                                            <option
                                                key={item.value}
                                                value={item.value}
                                            >
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="qr_page_field">
                                    <label>Título interno</label>

                                    <input
                                        className="qr_page_input"
                                        value={newSectionTitle}
                                        placeholder="Ej: Promoción principal"
                                        onChange={(e) =>
                                            setNewSectionTitle(e.target.value)
                                        }
                                    />
                                </div>

                            </div>

                            <div className="qr_page_actions mt">
                                <button
                                    type="button"
                                    className="qr_page_btn success"
                                    disabled={saving}
                                    onClick={handleCreateSection}
                                >
                                    Crear sección
                                </button>

                                <button
                                    type="button"
                                    className="qr_page_btn secondary"
                                    disabled={saving}
                                    onClick={() =>
                                        setCreatingSection(false)
                                    }
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="qr_page_sections_list">

                        {!localSections.length && (
                            <div className="qr_page_empty">
                                Todavía no hay secciones.
                            </div>
                        )}

                        {localSections.map(section => {
                            const sectionBlocks =
                                getSectionBlocks(section.id);

                            const movableIndex =
                                getMovableIndex(section);

                            return (
                                <div
                                    key={section.id}
                                    className="qr_page_section_card store_builder_section_card"
                                >
                                    <div className="qr_page_section_top">

                                        <div>
                                            <strong>
                                                {section.title || getSectionLabel(section.section_type)}
                                            </strong>

                                            <span>
                                                {getSectionLabel(section.section_type)}
                                            </span>
                                        </div>

                                        <div className="qr_page_small_actions store_builder_section_actions">

                                            {!isFixedSection(section) && (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            saving ||
                                                            movableIndex === 0
                                                        }
                                                        onClick={() =>
                                                            handleMoveSection(
                                                                section,
                                                                "up"
                                                            )
                                                        }
                                                    >
                                                        ↑ Sección
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            saving ||
                                                            movableIndex ===
                                                            getMovableSections().length - 1
                                                        }
                                                        onClick={() =>
                                                            handleMoveSection(
                                                                section,
                                                                "down"
                                                            )
                                                        }
                                                    >
                                                        ↓ Sección
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() =>
                                                    setEditingSection(section)
                                                }
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() =>
                                                    toggleSection(section)
                                                }
                                            >
                                                {
                                                    section.is_visible
                                                        ? "Ocultar"
                                                        : "Mostrar"
                                                }
                                            </button>

                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() =>
                                                    handleDeleteSection(section)
                                                }
                                            >
                                                Eliminar
                                            </button>
                                        </div>

                                    </div>

                                    <div className="qr_page_blocks_list">

                                        {!sectionBlocks.length && (
                                            <div className="qr_page_empty small">
                                                Sin bloques.
                                            </div>
                                        )}

                                        {sectionBlocks.map((block, blockIndex) => (
                                            <div
                                                key={block.id}
                                                className="qr_page_block_row"
                                            >
                                                <div>
                                                    <strong>
                                                        {getBlockLabel(block.block_type)}
                                                    </strong>

                                                    <span>
                                                        #{block.id}
                                                    </span>
                                                </div>

                                                <div className="qr_page_small_actions store_builder_block_actions">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            saving ||
                                                            blockIndex === 0
                                                        }
                                                        onClick={() =>
                                                            handleMoveBlock(
                                                                section,
                                                                blockIndex,
                                                                "up"
                                                            )
                                                        }
                                                    >
                                                        ↑ Bloque
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            saving ||
                                                            blockIndex ===
                                                            sectionBlocks.length - 1
                                                        }
                                                        onClick={() =>
                                                            handleMoveBlock(
                                                                section,
                                                                blockIndex,
                                                                "down"
                                                            )
                                                        }
                                                    >
                                                        ↓ Bloque
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={() =>
                                                            setEditingBlock({ section, block })}
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={() =>
                                                            toggleBlock(
                                                                section,
                                                                block
                                                            )
                                                        }
                                                    >
                                                        {
                                                            block.is_visible
                                                                ? "Ocultar"
                                                                : "Mostrar"
                                                        }
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={() =>
                                                            handleDeleteBlock(
                                                                section,
                                                                block
                                                            )
                                                        }
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {creatingBlockSectionId === section.id ? (
                                            <div className="qr_page_inline_form compact store_builder_block_form">

                                                <div className="qr_page_grid">

                                                    <div className="qr_page_field">
                                                        <label>Tipo de bloque</label>

                                                        <select
                                                            className="qr_page_select"
                                                            value={newBlockType}
                                                            onChange={(e) =>
                                                                setNewBlockType(e.target.value)
                                                            }
                                                        >
                                                            {STORE_BLOCK_TYPES.map(item => (
                                                                <option
                                                                    key={item.value}
                                                                    value={item.value}
                                                                >
                                                                    {item.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="qr_page_field">
                                                        <label>Título interno</label>

                                                        <input
                                                            className="qr_page_input"
                                                            value={newBlockTitle}
                                                            placeholder="Ej: Banner principal"
                                                            onChange={(e) =>
                                                                setNewBlockTitle(e.target.value)
                                                            }
                                                        />
                                                    </div>

                                                </div>

                                                <div className="qr_page_actions mt">
                                                    <button
                                                        type="button"
                                                        className="qr_page_btn success"
                                                        disabled={saving}
                                                        onClick={() =>
                                                            handleCreateBlock(section)
                                                        }
                                                    >
                                                        Agregar bloque
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="qr_page_btn secondary"
                                                        disabled={saving}
                                                        onClick={() =>
                                                            setCreatingBlockSectionId(null)
                                                        }
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>

                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="qr_page_add_block_btn"
                                                disabled={saving}
                                                onClick={() =>
                                                    setCreatingBlockSectionId(section.id)
                                                }
                                            >
                                                + Agregar bloque
                                            </button>
                                        )}

                                    </div>
                                </div>
                            );
                        })}

                    </div>
                </>
            )}
            {/* hasta */}
            {builderMode === "pages" && (
                <StorePageManager
                    store={store}
                    onReload={onReload}
                />
            )}
            {editingSection && (
                <StoreSectionEditor
                    storeId={storeId}
                    section={editingSection}
                    onClose={() => setEditingSection(null)}
                    onReload={onReload}
                />
            )}

            {editingBlock && currentEditingBlock && (
                <StoreBlockEditor
                    businessId={businessId}
                    entity={store}
                    section={editingBlock.section}
                    block={currentEditingBlock}
                    onClose={() => setEditingBlock(null)}
                    onBlockUpdated={handleBlockUpdated}
                />
            )}

            <style jsx>{`
                .store_builder_section_card {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                }

                .store_builder_section_actions {
                    background: #dcfce7;
                    border-radius: 12px;
                    padding: 6px;
                }

                .store_builder_section_actions button {
                    font-weight: 700;
                }

                .store_builder_block_actions {
                    background: #f8fafc;
                    border-radius: 10px;
                    padding: 4px;
                }

                .store_builder_block_actions button {
                    font-size: .78rem;
                }

                .store_builder_inline_form,
                .store_builder_block_form {
                    background: #ffffff;
                    border: 1px solid #bbf7d0;
                    border-radius: 14px;
                    padding: 16px;
                    margin-bottom: 16px;
                }

                .store_builder_block_form {
                    margin-top: 12px;
                }

                .store_builder_mode_tabs {
                    display: flex;
                    gap: 8px;
                    margin: 0 0 18px;
                    padding: 6px;
                    background: #f8fafc;
                    border: 1px solid #e5e7eb;
                    border-radius: 14px;
                }

                .store_builder_mode_tabs button {
                    border: 0;
                    background: transparent;
                    padding: 10px 16px;
                    border-radius: 10px;
                    font-weight: 800;
                }

                .store_builder_mode_tabs button.active {
                    background: #111827;
                    color: #ffffff;
                }
            `}</style>

        </div>
    );
}