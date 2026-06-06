"use client";

import { useEffect, useState }
    from "react";

import { useRouter }
    from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import "../../../../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";
import TagsSpinner from "@/app/components/TagsSpinner";

import {
    FiGlobe,
    FiMail
} from "react-icons/fi";

import {
    FaWhatsapp,
    FaInstagram,
    FaFacebookF
} from "react-icons/fa";

import InvitationHeader from "@/app/modules/e-events/components/invitations/InvitationHeader";
import InvitationNavigation from "@/app/modules/e-events/components/invitations/InvitationNavigation";



export default function InvitationBuilderPageClient({

    session,
    eventId,
    invitationId,
    modules

}) {

    const router =
        useRouter();

    const [builder, setBuilder] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [selectedBlockId, setSelectedBlockId] =
        useState(null);

    const [showAddBlockModal, setShowAddBlockModal] =
        useState(false);

    const [galleryIndexes, setGalleryIndexes] =
        useState({});

    useEffect(() => {

        if (!invitationId) return;

        load();

    }, [invitationId]);

    useEffect(() => {

        if (!builder?.blocks?.length) return;

        const intervals = [];

        builder.blocks.forEach(block => {

            const config =
                normalizeConfig(block.config_json);

            const galleryImages =
                Array.isArray(config.image_urls)
                    ? config.image_urls
                    : Array.isArray(config.images)
                        ? config.images
                        : [];

            if (
                block.type === "gallery"
                &&
                config.mode === "carousel"
                &&
                config.autoplay === true
                &&
                galleryImages.length > 1
            ) {

                const interval =
                    setInterval(() => {

                        setGalleryIndexes(prev => ({

                            ...prev,

                            [block.id]:
                                (
                                    (prev[block.id] || 0)
                                    + 1
                                ) % galleryImages.length
                        }));

                    }, Number(config.autoplay_delay || 3000));

                intervals.push(interval);
            }
        });

        return () => {

            intervals.forEach(interval =>
                clearInterval(interval)
            );
        };

    }, [builder]);

    function normalizeConfig(config) {

        if (!config) return {};

        if (typeof config === "object") {

            return config;
        }

        try {

            return JSON.parse(config);

        } catch (err) {

            return {};
        }
    }

    function normalizeBlocks(blocks = []) {

        return blocks.map(block => ({

            ...block,

            config_json:
                normalizeConfig(
                    block.config_json
                )
        }));
    }

    async function load() {

        try {

            setLoading(true);

            const res =
                await fetch(
                    `/api/events/invitations/builder/get?invitation_id=${invitationId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "Error cargando builder",

                    icon: "error"
                });

                return;
            }

            const normalizedBuilder = {

                ...data.builder,

                blocks:
                    normalizeBlocks(
                        data.builder.blocks || []
                    )
            };

            setBuilder(
                normalizedBuilder
            );

            if (
                normalizedBuilder.blocks.length
            ) {

                setSelectedBlockId(
                    normalizedBuilder.blocks[0].id
                );
            }

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    function getSelectedBlock() {

        if (!builder) return null;

        return builder.blocks.find(
            block =>
                block.id === selectedBlockId
        );
    }

    function updateBlockField(
        blockId,
        field,
        value
    ) {

        const newBlocks =
            builder.blocks.map(block => {

                if (block.id !== blockId) {

                    return block;
                }

                return {

                    ...block,

                    [field]:
                        value
                };
            });

        setBuilder({

            ...builder,

            blocks:
                newBlocks
        });
    }

    function updateBlockConfig(
        blockId,
        key,
        value
    ) {

        const newBlocks =
            builder.blocks.map(block => {

                if (block.id !== blockId) {

                    return block;
                }

                return {

                    ...block,

                    config_json: {

                        ...normalizeConfig(
                            block.config_json
                        ),

                        [key]:
                            value
                    }
                };
            });

        setBuilder({

            ...builder,

            blocks:
                newBlocks
        });
    }

    function moveBlock(
        blockId,
        direction
    ) {

        const blocks =
            [...builder.blocks];

        const index =
            blocks.findIndex(
                block =>
                    block.id === blockId
            );

        if (index === -1) return;

        const newIndex =
            direction === "up"
                ? index - 1
                : index + 1;

        if (
            newIndex < 0
            ||
            newIndex >= blocks.length
        ) {

            return;
        }

        const temp =
            blocks[index];

        blocks[index] =
            blocks[newIndex];

        blocks[newIndex] =
            temp;

        const reordered =
            blocks.map((block, idx) => ({

                ...block,

                position:
                    idx + 1
            }));

        setBuilder({

            ...builder,

            blocks:
                reordered
        });
    }

    async function save() {

        try {

            setSaving(true);

            const res =
                await fetch(
                    "/api/events/invitations/builder/save",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                invitation_id:
                                    invitationId,

                                theme_id:
                                    builder.invitation?.theme_id || null,

                                seo:
                                    builder.seo,

                                styles:
                                    builder.styles,

                                header:
                                    builder.header || {},

                                blocks:
                                    builder.blocks.map(block => ({

                                        ...block,

                                        config_json:
                                            normalizeConfig(
                                                block.config_json
                                            )
                                    }))
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "Error guardando builder",

                    icon: "error"
                });

                return;
            }

            showAlert({

                title: "OK",

                text:
                    "Builder guardado correctamente",

                icon: "success"
            });

            load();

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    async function addGalleryBlock() {

        try {

            setSaving(true);

            const nextPosition =
                builder.blocks.length + 1;

            const res =
                await fetch(
                    "/api/events/invitations/blocks/create",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                invitation_id:
                                    Number(invitationId),

                                type:
                                    "gallery",

                                title:
                                    "Galería",

                                position:
                                    nextPosition,

                                config_json: {
                                    title:
                                        "Galería",

                                    subtitle:
                                        "Momentos especiales",

                                    image_urls:
                                        [],

                                    columns:
                                        2,

                                    gap:
                                        8
                                }
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo crear el bloque galería",
                    icon: "error"
                });

                return;
            }

            await load();

            showAlert({
                title: "OK",
                text:
                    "Bloque galería agregado",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text:
                    "No se pudo crear el bloque galería",
                icon: "error"
            });

        } finally {

            setSaving(false);
        }
    }

    function renderMediaSelector(block, fieldName, label) {

        const config =
            normalizeConfig(block.config_json);

        return (

            <div className="mb-3">

                <label>
                    {label}
                </label>

                {
                    builder.media?.length === 0
                    &&
                    (
                        <p style={{ color: "#666" }}>
                            Todavía no hay imágenes cargadas.
                        </p>
                    )
                }

                <div className="row g-2">

                    {
                        builder.media
                            ?.filter(item => item.type === "image")
                            .map(item => (

                                <div
                                    className="col-4"
                                    key={item.id}
                                >

                                    <div
                                        onClick={() =>
                                            updateBlockConfig(
                                                block.id,
                                                fieldName,
                                                item.file_url
                                            )
                                        }
                                        style={{
                                            border:
                                                config[fieldName] === item.file_url
                                                    ? "3px solid #111"
                                                    : "1px solid #ddd",
                                            borderRadius: 12,
                                            overflow: "hidden",
                                            cursor: "pointer",
                                            background: "#f8f9fa"
                                        }}
                                    >

                                        <img
                                            src={item.file_url}
                                            alt={item.alt_text || ""}
                                            style={{
                                                width: "100%",
                                                height: 90,
                                                objectFit: "cover"
                                            }}
                                        />

                                    </div>

                                </div>
                            ))
                    }

                </div>

            </div>
        );
    }

    function renderHeroEditor(block) {

        const config =
            normalizeConfig(
                block.config_json
            );

        return (

            <>

                <div className="mb-3">

                    <label>
                        Título principal
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={config.title || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "title",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Subtítulo
                    </label>

                    <textarea
                        className="form-control"
                        rows={3}
                        value={config.subtitle || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "subtitle",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    {
                        renderMediaSelector(
                            block,
                            "image_url",
                            "Imagen de portada"
                        )
                    }

                </div>

                <div className="mb-3">

                    <label>
                        Texto del botón
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={config.button_text || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "button_text",
                                e.target.value
                            )
                        }
                    />

                </div>

            </>

        );
    }

    function renderEventInfoEditor(block) {

        const config =
            normalizeConfig(
                block.config_json
            );

        return (

            <>

                <div className="mb-3">

                    <label>
                        Título de sección
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={config.title || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "title",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="row">

                    <div className="col-md-6 mb-3">

                        <label>
                            Fecha
                        </label>

                        <input
                            type="date"
                            className="form-control tags_text_normal"
                            value={config.date || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "date",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="col-md-6 mb-3">

                        <label>
                            Hora
                        </label>

                        <input
                            type="time"
                            className="form-control tags_text_normal"
                            value={config.time || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "time",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                </div>

                <div className="mb-3">

                    <label>
                        Descripción
                    </label>

                    <textarea
                        className="form-control"
                        rows={4}
                        value={config.description || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "description",
                                e.target.value
                            )
                        }
                    />

                </div>

            </>

        );
    }

    function renderCountdownEditor(block) {

        const config =
            normalizeConfig(
                block.config_json
            );

        return (

            <>

                <div className="mb-3">

                    <label>
                        Título
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={config.title || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "title",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Fecha objetivo
                    </label>

                    <input
                        type="datetime-local"
                        className="form-control tags_text_normal"
                        value={config.target_date || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "target_date",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="form-check mb-2">

                    <input
                        type="checkbox"
                        className="form-check-input tags_text_normal"
                        checked={config.show_days !== false}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "show_days",
                                e.target.checked
                            )
                        }
                    />

                    <label className="form-check-label">
                        Mostrar días
                    </label>

                </div>

                <div className="form-check mb-2">

                    <input
                        type="checkbox"
                        className="form-check-input tags_text_normal"
                        checked={config.show_hours !== false}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "show_hours",
                                e.target.checked
                            )
                        }
                    />

                    <label className="form-check-label">
                        Mostrar horas
                    </label>

                </div>

                <div className="form-check mb-2">

                    <input
                        type="checkbox"
                        className="form-check-input tags_text_normal"
                        checked={config.show_minutes !== false}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "show_minutes",
                                e.target.checked
                            )
                        }
                    />

                    <label className="form-check-label">
                        Mostrar minutos
                    </label>

                </div>

            </>

        );
    }

    function renderLocationEditor(block) {

        const config =
            normalizeConfig(
                block.config_json
            );

        return (

            <>

                <div className="mb-3">

                    <label>
                        Nombre del lugar
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={config.place_name || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "place_name",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Dirección
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={config.address || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "address",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        URL Google Maps
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={config.maps_url || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "maps_url",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Texto del botón
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={config.button_text || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "button_text",
                                e.target.value
                            )
                        }
                    />

                </div>

            </>

        );
    }

    function renderRSVPEditor(block) {

        const config =
            normalizeConfig(
                block.config_json
            );

        return (

            <>

                <div className="mb-3">

                    <label>
                        Título
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={config.title || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "title",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Texto descriptivo
                    </label>

                    <textarea
                        className="form-control tags_text_normal"
                        rows={3}
                        value={config.description || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "description",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="form-check mb-2">

                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={config.allow_companions !== false}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "allow_companions",
                                e.target.checked
                            )
                        }
                    />

                    <label className="form-check-label">
                        Permitir acompañantes
                    </label>

                </div>

                <div className="form-check mb-2">

                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={config.ask_dietary_notes !== false}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "ask_dietary_notes",
                                e.target.checked
                            )
                        }
                    />

                    <label className="form-check-label">
                        Solicitar notas alimentarias
                    </label>

                </div>

                <div className="form-check mb-2">

                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={config.ask_message !== false}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "ask_message",
                                e.target.checked
                            )
                        }
                    />

                    <label className="form-check-label">
                        Permitir mensaje adicional
                    </label>

                </div>

            </>

        );
    }


    function renderGalleryEditor(block) {

        const config =
            normalizeConfig(
                block.config_json
            );

        const galleryImages =
            Array.isArray(config.image_urls)
                ? config.image_urls
                : Array.isArray(config.images)
                    ? config.images
                    : [];

        function toggleImage(url) {

            let newImages =
                [...galleryImages];

            if (newImages.includes(url)) {

                newImages =
                    newImages.filter(
                        item => item !== url
                    );

            } else {

                newImages.push(url);
            }

            updateBlockConfig(
                block.id,
                "image_urls",
                newImages
            );
        }

        return (

            <>

                <div className="mb-3">

                    <label>
                        Título
                    </label>

                    <input
                        className="form-control"
                        value={config.title || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "title",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Subtítulo
                    </label>

                    <textarea
                        className="form-control tags_text_normal"
                        rows={2}
                        value={config.subtitle || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "subtitle",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="row">

                    <div className="col-md-6 mb-3">

                        <label>
                            Tipo de galería
                        </label>

                        <select
                            className="form-select tags_text_normal"
                            value={config.mode || "grid"}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "mode",
                                    e.target.value
                                )
                            }
                        >

                            <option value="grid">
                                Grilla
                            </option>

                            <option value="carousel">
                                Carrusel
                            </option>

                        </select>

                    </div>

                    <div className="col-md-6 mb-3">

                        <label>
                            Alto imagen
                        </label>

                        <input
                            type="number"
                            className="form-control"
                            value={config.image_height || 120}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "image_height",
                                    Number(e.target.value)
                                )
                            }
                        />

                    </div>

                </div>

                {
                    (config.mode || "grid") === "grid"
                    &&
                    (
                        <div className="row">

                            <div className="col-md-6 mb-3">

                                <label>
                                    Columnas
                                </label>

                                <select
                                    className="form-select tags_text_normal"
                                    value={config.columns || 2}
                                    onChange={(e) =>
                                        updateBlockConfig(
                                            block.id,
                                            "columns",
                                            Number(e.target.value)
                                        )
                                    }
                                >

                                    <option value={1}>
                                        1 columna
                                    </option>

                                    <option value={2}>
                                        2 columnas
                                    </option>

                                    <option value={3}>
                                        3 columnas
                                    </option>

                                </select>

                            </div>

                            <div className="col-md-6 mb-3">

                                <label>
                                    Espaciado
                                </label>

                                <input
                                    type="number"
                                    className="form-control"
                                    value={config.gap || 8}
                                    onChange={(e) =>
                                        updateBlockConfig(
                                            block.id,
                                            "gap",
                                            Number(e.target.value)
                                        )
                                    }
                                />

                            </div>

                        </div>
                    )
                }

                {
                    (config.mode || "grid") === "carousel"
                    &&
                    (
                        <div className="row">

                            <div className="col-md-4 mb-3">

                                <div className="form-check">

                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={config.show_arrows !== false}
                                        onChange={(e) =>
                                            updateBlockConfig(
                                                block.id,
                                                "show_arrows",
                                                e.target.checked
                                            )
                                        }
                                    />

                                    <label className="form-check-label">
                                        Flechas
                                    </label>

                                </div>

                            </div>

                            <div className="col-md-4 mb-3">

                                <div className="form-check">

                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={config.show_dots !== false}
                                        onChange={(e) =>
                                            updateBlockConfig(
                                                block.id,
                                                "show_dots",
                                                e.target.checked
                                            )
                                        }
                                    />

                                    <label className="form-check-label">
                                        Puntos
                                    </label>

                                </div>

                            </div>

                            <div className="col-md-4 mb-3">

                                <div className="form-check">

                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={config.autoplay === true}
                                        onChange={(e) =>
                                            updateBlockConfig(
                                                block.id,
                                                "autoplay",
                                                e.target.checked
                                            )
                                        }
                                    />

                                    <label className="form-check-label">
                                        Auto
                                    </label>

                                </div>
                                {
                                    config.autoplay === true
                                    &&
                                    (
                                        <div className="col-md-12 mb-3">

                                            <label>
                                                Velocidad autoplay
                                            </label>

                                            <select
                                                className="form-select tags_text_normal"
                                                value={config.autoplay_delay || 3000}
                                                onChange={(e) =>
                                                    updateBlockConfig(
                                                        block.id,
                                                        "autoplay_delay",
                                                        Number(e.target.value)
                                                    )
                                                }
                                            >
                                                <option value={2000}>
                                                    Rápido
                                                </option>

                                                <option value={3000}>
                                                    Normal
                                                </option>

                                                <option value={5000}>
                                                    Lento
                                                </option>
                                            </select>

                                        </div>
                                    )
                                }

                            </div>

                        </div>
                    )
                }

                <div className="mb-2">

                    <label>
                        Imágenes de la galería
                    </label>

                    {
                        builder.media
                            ?.filter(item => item.type === "image")
                            .length === 0
                        &&
                        (
                            <p style={{ color: "#666" }}>
                                Todavía no hay imágenes cargadas en Media.
                            </p>
                        )
                    }

                </div>

                <div className="row g-2">

                    {
                        builder.media
                            ?.filter(item => item.type === "image")
                            .map(item => (

                                <div
                                    className="col-4"
                                    key={item.id}
                                >

                                    <div
                                        onClick={() =>
                                            toggleImage(
                                                item.file_url
                                            )
                                        }
                                        style={{
                                            cursor: "pointer",
                                            border:
                                                galleryImages.includes(item.file_url)
                                                    ? "3px solid #111"
                                                    : "1px solid #ddd",
                                            borderRadius: 12,
                                            overflow: "hidden",
                                            background: "#f8f9fa",
                                            position: "relative"
                                        }}
                                    >

                                        <img
                                            src={item.file_url}
                                            alt={item.alt_text || ""}
                                            style={{
                                                width: "100%",
                                                height: 90,
                                                objectFit: "cover"
                                            }}
                                        />

                                        {
                                            galleryImages.includes(item.file_url)
                                            &&
                                            (
                                                <span
                                                    style={{
                                                        position: "absolute",
                                                        top: 6,
                                                        right: 6,
                                                        background: "#111",
                                                        color: "#fff",
                                                        borderRadius: 999,
                                                        width: 24,
                                                        height: 24,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: 12
                                                    }}
                                                >
                                                    ✓
                                                </span>
                                            )
                                        }

                                    </div>

                                </div>

                            ))
                    }

                </div>

            </>

        );
    }

    function updateHeaderConfig(
        key,
        value
    ) {

        setBuilder({

            ...builder,

            header: {

                ...(builder.header || {}),

                [key]:
                    value
            }
        });
    }

    function renderStyleEditor() {

        const styles =
            builder.styles?.config_json
                ? normalizeConfig(builder.styles.config_json)
                : normalizeConfig(builder.styles);

        function updateStyle(key, value) {

            setBuilder({

                ...builder,

                styles: {

                    ...styles,

                    [key]:
                        value
                }
            });
        }

        return (

            <div className="card mb-3">

                <div className="card-body">

                    <h5>
                        Estilos generales
                    </h5>

                    <div className="row">

                        <div className="col-md-6 mb-3">

                            <label>
                                Color principal
                            </label>

                            <input
                                type="color"
                                className="form-control form-control-color"
                                value={styles.primary_color || "#111111"}
                                onChange={(e) =>
                                    updateStyle(
                                        "primary_color",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Color de fondo
                            </label>

                            <input
                                type="color"
                                className="form-control form-control-color"
                                value={styles.background_color || "#ffffff"}
                                onChange={(e) =>
                                    updateStyle(
                                        "background_color",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Color de texto
                            </label>

                            <input
                                type="color"
                                className="form-control form-control-color tags_text_normal"
                                value={styles.text_color || "#222222"}
                                onChange={(e) =>
                                    updateStyle(
                                        "text_color",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Bordes
                            </label>

                            <select
                                className="form-select tags_text_normal"
                                value={styles.border_radius || "rounded"}
                                onChange={(e) =>
                                    updateStyle(
                                        "border_radius",
                                        e.target.value
                                    )
                                }
                            >

                                <option value="none">
                                    Rectos
                                </option>

                                <option value="rounded">
                                    Redondeados
                                </option>

                                <option value="pill">
                                    Muy redondeados
                                </option>

                            </select>

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Tipografía
                            </label>

                            <select
                                className="form-select tags_text_normal"
                                value={styles.font_family || "Arial"}
                                onChange={(e) =>
                                    updateStyle(
                                        "font_family",
                                        e.target.value
                                    )
                                }
                            >
                                <option value="Arial">Arial</option>
                                <option value="Georgia">Georgia</option>
                                <option value="'Times New Roman', serif">Times New Roman</option>
                                <option value="Verdana">Verdana</option>
                                <option value="'Montserrat', sans-serif">Montserrat</option>
                                <option value="'Playfair Display', serif">Playfair Display</option>
                            </select>

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Tamaño títulos
                            </label>

                            <input
                                type="number"
                                className="form-control"
                                value={styles.title_size || 28}
                                onChange={(e) =>
                                    updateStyle(
                                        "title_size",
                                        Number(e.target.value)
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Tamaño texto
                            </label>

                            <input
                                type="number"
                                className="form-control tags_text_normal"
                                value={styles.text_size || 16}
                                onChange={(e) =>
                                    updateStyle(
                                        "text_size",
                                        Number(e.target.value)
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Peso títulos
                            </label>

                            <select
                                className="form-select tags_text_normal"
                                value={styles.title_weight || "700"}
                                onChange={(e) =>
                                    updateStyle(
                                        "title_weight",
                                        e.target.value
                                    )
                                }
                            >
                                <option value="400">Normal</option>
                                <option value="600">Semi Bold</option>
                                <option value="700">Bold</option>
                                <option value="800">Extra Bold</option>
                            </select>

                        </div>

                    </div>

                </div>

            </div>
        );
    }

    function renderHeaderEditor() {

        const header =
            builder.header || {};

        return (

            <div className="card mb-3">

                <div className="card-body">

                    <h5>
                        Header global
                    </h5>

                    <div className="form-check mb-2">

                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={header.enabled !== false}
                            onChange={(e) =>
                                updateHeaderConfig(
                                    "enabled",
                                    e.target.checked
                                )
                            }
                        />

                        <label className="form-check-label">
                            Mostrar header
                        </label>

                    </div>

                    <div className="form-check mb-2">

                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={header.sticky === true}
                            onChange={(e) =>
                                updateHeaderConfig(
                                    "sticky",
                                    e.target.checked
                                )
                            }
                        />

                        <label className="form-check-label">
                            Menú sticky
                        </label>

                    </div>

                    <div className="form-check mb-2">

                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={header.showLogo !== false}
                            onChange={(e) =>
                                updateHeaderConfig(
                                    "showLogo",
                                    e.target.checked
                                )
                            }
                        />

                        <label className="form-check-label">
                            Mostrar logo
                        </label>

                    </div>

                    <div className="form-check mb-3">

                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={header.showMenu !== false}
                            onChange={(e) =>
                                updateHeaderConfig(
                                    "showMenu",
                                    e.target.checked
                                )
                            }
                        />

                        <label className="form-check-label">
                            Mostrar menú
                        </label>

                    </div>

                    <div className="mb-3">

                        <label>
                            Logo
                        </label>

                        {
                            builder.media
                                ?.filter(item => item.type === "image")
                                .length === 0
                            &&
                            (
                                <p style={{ color: "#666" }}>
                                    Todavía no hay imágenes cargadas en Media.
                                </p>
                            )
                        }

                        {
                            header.logoUrl
                            &&
                            (
                                <div
                                    style={{
                                        marginBottom: 12,
                                        padding: 10,
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 12,
                                        background: "#f8f9fa"
                                    }}
                                >
                                    <small>
                                        Logo seleccionado
                                    </small>

                                    <div>
                                        <img
                                            src={header.logoUrl}
                                            alt="Logo seleccionado"
                                            style={{
                                                maxWidth: 160,
                                                maxHeight: 70,
                                                objectFit: "contain",
                                                display: "block",
                                                marginTop: 8
                                            }}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className="icon_btn danger mt-2"
                                        onClick={() =>
                                            updateHeaderConfig(
                                                "logoUrl",
                                                ""
                                            )
                                        }
                                    >
                                        Quitar logo
                                    </button>
                                </div>
                            )
                        }

                        <div className="row g-2">

                            {
                                builder.media
                                    ?.filter(item => item.type === "image")
                                    .map(item => (

                                        <div
                                            className="col-4"
                                            key={item.id}
                                        >

                                            <div
                                                onClick={() =>
                                                    updateHeaderConfig(
                                                        "logoUrl",
                                                        item.file_url
                                                    )
                                                }
                                                style={{
                                                    border:
                                                        header.logoUrl === item.file_url
                                                            ? "3px solid #111"
                                                            : "1px solid #ddd",
                                                    borderRadius: 12,
                                                    overflow: "hidden",
                                                    cursor: "pointer",
                                                    background: "#f8f9fa"
                                                }}
                                            >

                                                <img
                                                    src={item.file_url}
                                                    alt={item.alt_text || ""}
                                                    style={{
                                                        width: "100%",
                                                        height: 80,
                                                        objectFit: "cover"
                                                    }}
                                                />

                                            </div>

                                        </div>
                                    ))
                            }

                        </div>

                    </div>

                    <div className="row">

                        <div className="col-md-6 mb-3">

                            <label>
                                Color fondo
                            </label>

                            <input
                                type="color"
                                className="form-control form-control-color"
                                value={header.backgroundColor || "#ffffff"}
                                onChange={(e) =>
                                    updateHeaderConfig(
                                        "backgroundColor",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Color texto
                            </label>

                            <input
                                type="color"
                                className="form-control form-control-color tags_text_normal"
                                value={header.textColor || "#111111"}
                                onChange={(e) =>
                                    updateHeaderConfig(
                                        "textColor",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Altura header
                            </label>

                            <input
                                type="number"
                                className="form-control tags_text_normal"
                                value={header.height || 72}
                                onChange={(e) =>
                                    updateHeaderConfig(
                                        "height",
                                        Number(e.target.value)
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Alto logo
                            </label>

                            <input
                                type="number"
                                className="form-control tags_text_normal"
                                value={header.logoHeight || 40}
                                onChange={(e) =>
                                    updateHeaderConfig(
                                        "logoHeight",
                                        Number(e.target.value)
                                    )
                                }
                            />

                        </div>

                    </div>

                </div>

            </div>
        );
    }

    function renderBlockStyleEditor(block) {

        const config =
            normalizeConfig(block.config_json);

        const styles =
            config.styles || {};

        function updateBlockStyle(key, value) {

            updateBlockConfig(
                block.id,
                "styles",
                {
                    ...styles,
                    [key]: value
                }
            );
        }

        return (

            <div className="card mb-3">

                <div className="card-body">

                    <h5>
                        Personalización del bloque
                    </h5>

                    <div className="row">

                        <div className="col-md-6 mb-3">

                            <label>
                                Fondo
                            </label>

                            <input
                                type="color"
                                className="form-control form-control-color"
                                value={styles.background_color || "#ffffff"}
                                onChange={(e) =>
                                    updateBlockStyle(
                                        "background_color",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Color texto
                            </label>

                            <input
                                type="color"
                                className="form-control form-control-color tags_text_normal"
                                value={styles.text_color || textColor}
                                onChange={(e) =>
                                    updateBlockStyle(
                                        "text_color",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Color título
                            </label>

                            <input
                                type="color"
                                className="form-control form-control-color tags_text_normal"
                                value={styles.title_color || textColor}
                                onChange={(e) =>
                                    updateBlockStyle(
                                        "title_color",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Alineación
                            </label>

                            <select
                                className="form-select tags_text_normal"
                                value={styles.text_align || "center"}
                                onChange={(e) =>
                                    updateBlockStyle(
                                        "text_align",
                                        e.target.value
                                    )
                                }
                            >
                                <option value="left">Izquierda</option>
                                <option value="center">Centro</option>
                                <option value="right">Derecha</option>
                            </select>

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Tamaño título
                            </label>

                            <input
                                type="number"
                                className="form-control tags_text_normal"
                                value={styles.title_size || titleSize}
                                onChange={(e) =>
                                    updateBlockStyle(
                                        "title_size",
                                        Number(e.target.value)
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label>
                                Tamaño texto
                            </label>

                            <input
                                type="number"
                                className="form-control tags_text_normal"
                                value={styles.text_size || textSize}
                                onChange={(e) =>
                                    updateBlockStyle(
                                        "text_size",
                                        Number(e.target.value)
                                    )
                                }
                            />

                        </div>

                    </div>

                </div>

            </div>
        );
    }

    function renderBlockEditor(block) {

        if (!block) {

            return (

                <p>
                    Seleccioná un bloque para editar.
                </p>
            );
        }

        if (block.type === "hero") {

            return renderHeroEditor(block);
        }

        if (block.type === "event_info") {

            return renderEventInfoEditor(block);
        }

        if (block.type === "countdown") {

            return renderCountdownEditor(block);
        }

        if (block.type === "location") {

            return renderLocationEditor(block);
        }

        if (block.type === "rsvp") {

            return renderRSVPEditor(block);
        }

        if (block.type === "gallery") {

            return renderGalleryEditor(block);
        }
        if (block.type === "video") {

            return renderVideoEditor(block);
        }
        if (block.type === "timeline") {

            return renderTimelineEditor(block);
        }
        if (block.type === "gifts") {

            return renderGiftsEditor(block);
        }
        if (block.type === "footer") {

            return renderFooterEditor(block);
        }

        return (

            <p>
                Este tipo de bloque todavía no tiene editor visual.
            </p>
        );
    }

    function getBlockLabel(block) {

        if (block.type === "hero") return "Portada";

        if (block.type === "event_info") return "Información";

        if (block.type === "countdown") return "Countdown";

        if (block.type === "location") return "Ubicación";

        if (block.type === "rsvp") return "RSVP";

        if (block.type === "gallery") return "Galería";

        if (block.type === "video") return "Video";

        if (block.type === "timeline") return "Agenda";

        if (block.type === "gifts") return "Regalos";

        if (block.type === "footer") return "Footer";

        return block.title || block.type;
    }

    if (
        loading
        ||
        !builder
    ) {

        return (

            <div className="container-fluid tags_container m-0 p-0">

                <EventOwnerHeader
                    session={session}
                />

                <div className="pt-4 px-3">
                    <TagsSpinner />
                </div>

            </div>
        );
    }

    /* Estilos */
    const previewStyles =
        builder?.styles?.config_json
            ? normalizeConfig(builder?.styles.config_json)
            : normalizeConfig(builder?.styles);

    const primaryColor =
        previewStyles.primary_color || "#111111";

    const backgroundColor =
        previewStyles.background_color || "#ffffff";

    const textColor =
        previewStyles.text_color || "#222222";

    const borderRadius =
        previewStyles.border_radius === "pill"
            ? 28
            : previewStyles.border_radius === "none"
                ? 0
                : 16;
    const fontFamily =
        previewStyles.font_family || "Arial";

    const titleSize =
        previewStyles.title_size || 28;

    const textSize =
        previewStyles.text_size || 16;

    const titleWeight =
        previewStyles.title_weight || "700";
    /* Fin EStilos */

    const selectedBlock = getSelectedBlock();


    function getCountdownParts(targetDate) {

        if (!targetDate) {

            return {
                days: "--",
                hours: "--",
                minutes: "--"
            };
        }

        const target =
            new Date(targetDate).getTime();

        const now =
            new Date().getTime();

        const diff =
            Math.max(target - now, 0);

        return {
            days:
                Math.floor(diff / (1000 * 60 * 60 * 24)),

            hours:
                Math.floor((diff / (1000 * 60 * 60)) % 24),

            minutes:
                Math.floor((diff / (1000 * 60)) % 60)
        };
    }

    function getGoogleMapsEmbedUrl(url) {

        if (!url) return "";

        return url;
    }

    /* async function createGalleryBlock() {

        try {

            setSaving(true);

            const nextPosition =
                (builder.blocks?.length || 0) + 1;

            const res =
                await fetch(
                    "/api/events/invitations/blocks/create",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body:
                            JSON.stringify({

                                invitation_id:
                                    Number(invitationId),

                                type:
                                    "gallery",

                                title:
                                    "Galería",

                                position:
                                    nextPosition,

                                config_json: {
                                    title: "Galería",
                                    images: [],
                                    columns: 2,
                                    gap: 8
                                }
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text: data.error || "No se pudo crear la galería",
                    icon: "error"
                });

                return;
            }

            await load();

            showAlert({
                title: "OK",
                text: "Galería agregada",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    } */
    function openAddBlockModal() {

        setShowAddBlockModal(true);
    }

    async function createBlock(type) {

        const labels = {
            hero: "Portada",
            event_info: "Información",
            countdown: "Countdown",
            location: "Ubicación",
            gallery: "Galería",
            rsvp: "RSVP",
            video: "Video",
            timeline: "Agenda",
            gifts: "Regalos",
            footer: "Footer",
        };

        const defaultConfigs = {
            hero: {},
            event_info: {},
            countdown: {},
            location: {},
            gallery: {
                title: "Galería",
                images: [],
                columns: 2,
                gap: 8
            },
            video: {
                title: "Video",
                description: "",
                video_url: "",
                controls: true,
                muted: false,
                autoplay: false
            },
            timeline: {
                title: "Agenda",
                subtitle: "",
                items: [
                    {
                        time: "18:00",
                        title: "Recepción",
                        description: ""
                    }
                ]
            },
            gifts: {
                title: "Regalos",
                description: "Si querés hacernos un regalo, podés hacerlo usando estos datos.",
                alias: "",
                cbu: "",
                bank_name: "",
                account_holder: "",
                external_url: "",
                external_button_text: "Abrir link"
            },
            footer: {
                title: "Gracias",
                text: "Esperamos compartir este momento con vos.",
                whatsapp: "",
                instagram: "",
                facebook: "",
                website: "",
                email: ""
            },
            rsvp: {}
        };

        try {

            setSaving(true);

            const nextPosition =
                (builder.blocks?.length || 0) + 1;

            const res =
                await fetch(
                    "/api/events/invitations/blocks/create",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body:
                            JSON.stringify({

                                invitation_id:
                                    Number(invitationId),

                                type,

                                title:
                                    labels[type] || type,

                                position:
                                    nextPosition,

                                config_json:
                                    defaultConfigs[type] || {}
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text: data.error || "No se pudo crear el bloque",
                    icon: "error"
                });

                return;
            }

            setShowAddBlockModal(false);

            await load();

            showAlert({
                title: "OK",
                text: "Bloque agregado",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }


    async function deleteBlock(blockId) {

        const confirm =
            await showAlert({
                title: "Eliminar bloque",
                text: "Esta acción no se puede deshacer",
                icon: "warning",
                showCancelButton: true
            });

        if (!confirm) return;

        try {

            setSaving(true);

            const res =
                await fetch(
                    "/api/events/invitations/blocks/delete",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            id: blockId
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text: data.error || "No se pudo eliminar el bloque",
                    icon: "error"
                });

                return;
            }

            await load();

            showAlert({
                title: "OK",
                text: "Bloque eliminado",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    function renderVideoEditor(block) {

        const config =
            normalizeConfig(
                block.config_json
            );

        const selectedVideo =
            config.video_url || "";

        return (

            <>

                <div className="mb-3">

                    <label>
                        Título
                    </label>

                    <input
                        className="form-control"
                        value={config.title || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "title",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Descripción
                    </label>

                    <textarea
                        className="form-control"
                        rows={3}
                        value={config.description || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "description",
                                e.target.value
                            )
                        }
                    />

                </div>

                <label>
                    Video
                </label>

                <div className="row g-2 mb-3">

                    {
                        builder.media
                            ?.filter(item => item.type === "video")
                            .map(item => (

                                <div
                                    className="col-6"
                                    key={item.id}
                                >

                                    <div
                                        onClick={() =>
                                            updateBlockConfig(
                                                block.id,
                                                "video_url",
                                                item.file_url
                                            )
                                        }
                                        style={{
                                            border:
                                                selectedVideo === item.file_url
                                                    ? "3px solid #111"
                                                    : "1px solid #ddd",
                                            borderRadius: 12,
                                            overflow: "hidden",
                                            cursor: "pointer"
                                        }}
                                    >

                                        <video
                                            src={item.file_url}
                                            style={{
                                                width: "100%",
                                                height: 110,
                                                objectFit: "cover"
                                            }}
                                        />

                                    </div>

                                </div>
                            ))
                    }

                </div>

                <div className="form-check mb-2">

                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={config.controls !== false}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "controls",
                                e.target.checked
                            )
                        }
                    />

                    <label className="form-check-label">
                        Mostrar controles
                    </label>

                </div>

                <div className="form-check mb-2">

                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={config.muted === true}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "muted",
                                e.target.checked
                            )
                        }
                    />

                    <label className="form-check-label">
                        Silenciado
                    </label>

                </div>

                <div className="form-check mb-2">

                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={config.autoplay === true}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "autoplay",
                                e.target.checked
                            )
                        }
                    />

                    <label className="form-check-label">
                        Autoplay
                    </label>

                </div>

            </>

        );
    }

    function getBlockPreviewStyles(config) {

        const blockStyles =
            config.styles || {};

        return {

            background:
                blockStyles.background_color || backgroundColor,

            color:
                blockStyles.text_color || textColor,

            textAlign:
                blockStyles.text_align || "center",

            fontSize:
                blockStyles.text_size || textSize,

            fontFamily
        };
    }

    function getBlockTitleStyles(config) {

        const blockStyles =
            config.styles || {};

        return {

            color:
                blockStyles.title_color ||
                blockStyles.text_color ||
                textColor,

            fontSize:
                blockStyles.title_size || titleSize,

            fontWeight:
                titleWeight
        };
    }

    function nextGalleryImage(
        blockId,
        total
    ) {

        setGalleryIndexes(prev => ({

            ...prev,

            [blockId]:
                (
                    (prev[blockId] || 0)
                    + 1
                ) % total
        }));
    }

    function prevGalleryImage(
        blockId,
        total
    ) {

        setGalleryIndexes(prev => ({

            ...prev,

            [blockId]:

                (
                    (prev[blockId] || 0)
                    - 1
                    + total
                ) % total
        }));
    }

    function renderTimelineEditor(block) {

        const config =
            normalizeConfig(block.config_json);

        const items =
            Array.isArray(config.items)
                ? config.items
                : [];

        function updateItem(index, field, value) {

            const newItems =
                items.map((item, i) => {

                    if (i !== index) return item;

                    return {
                        ...item,
                        [field]: value
                    };
                });

            updateBlockConfig(
                block.id,
                "items",
                newItems
            );
        }

        function addItem() {

            updateBlockConfig(
                block.id,
                "items",
                [
                    ...items,
                    {
                        time: "",
                        title: "",
                        description: ""
                    }
                ]
            );
        }

        function removeItem(index) {

            updateBlockConfig(
                block.id,
                "items",
                items.filter((item, i) =>
                    i !== index
                )
            );
        }

        return (

            <>

                <div className="mb-3">

                    <label>
                        Título
                    </label>

                    <input
                        className="form-control"
                        value={config.title || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "title",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Subtítulo
                    </label>

                    <textarea
                        className="form-control"
                        rows={2}
                        value={config.subtitle || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "subtitle",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="tags_subtitle mb-2">
                    Momentos
                </div>

                {
                    items.map((item, index) => (

                        <div
                            key={index}
                            className="mb-3"
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 12,
                                padding: 12
                            }}
                        >

                            <div className="row g-2">

                                <div className="col-md-4">

                                    <input
                                        className="form-control"
                                        placeholder="Hora"
                                        value={item.time || ""}
                                        onChange={(e) =>
                                            updateItem(
                                                index,
                                                "time",
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                                <div className="col-md-8">

                                    <input
                                        className="form-control"
                                        placeholder="Título"
                                        value={item.title || ""}
                                        onChange={(e) =>
                                            updateItem(
                                                index,
                                                "title",
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                                <div className="col-12">

                                    <textarea
                                        className="form-control"
                                        placeholder="Descripción"
                                        rows={2}
                                        value={item.description || ""}
                                        onChange={(e) =>
                                            updateItem(
                                                index,
                                                "description",
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                            </div>

                            <button
                                type="button"
                                className="icon_btn danger mt-2"
                                onClick={() =>
                                    removeItem(index)
                                }
                            >
                                🗑 Eliminar momento
                            </button>

                        </div>
                    ))
                }

                <button
                    type="button"
                    className="tags_btn"
                    onClick={addItem}
                >
                    ＋ Agregar momento
                </button>

            </>

        );
    }

    function renderGiftsEditor(block) {

        const config =
            normalizeConfig(block.config_json);

        return (

            <>

                <div className="mb-3">

                    <label>
                        Título
                    </label>

                    <input
                        className="form-control"
                        value={config.title || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "title",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Texto
                    </label>

                    <textarea
                        className="form-control"
                        rows={3}
                        value={config.description || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "description",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="row">

                    <div className="col-md-6 mb-3">

                        <label>
                            Alias
                        </label>

                        <input
                            className="form-control"
                            value={config.alias || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "alias",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="col-md-6 mb-3">

                        <label>
                            CBU / CVU
                        </label>

                        <input
                            className="form-control"
                            value={config.cbu || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "cbu",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="col-md-6 mb-3">

                        <label>
                            Banco / Entidad
                        </label>

                        <input
                            className="form-control"
                            value={config.bank_name || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "bank_name",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="col-md-6 mb-3">

                        <label>
                            Titular
                        </label>

                        <input
                            className="form-control"
                            value={config.account_holder || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "account_holder",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                </div>

                <div className="mb-3">

                    <label>
                        Link externo opcional
                    </label>

                    <input
                        className="form-control"
                        placeholder="https://..."
                        value={config.external_url || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "external_url",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Texto botón externo
                    </label>

                    <input
                        className="form-control"
                        value={config.external_button_text || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "external_button_text",
                                e.target.value
                            )
                        }
                    />

                </div>

            </>

        );
    }

    function renderFooterEditor(block) {

        const config =
            normalizeConfig(block.config_json);

        return (

            <>

                <div className="mb-3">

                    <label>
                        Título
                    </label>

                    <input
                        className="form-control"
                        value={config.title || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "title",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="mb-3">

                    <label>
                        Texto
                    </label>

                    <textarea
                        className="form-control"
                        rows={3}
                        value={config.text || ""}
                        onChange={(e) =>
                            updateBlockConfig(
                                block.id,
                                "text",
                                e.target.value
                            )
                        }
                    />

                </div>

                <div className="row">

                    <div className="col-md-6 mb-3">

                        <label>
                            WhatsApp
                        </label>

                        <input
                            className="form-control"
                            placeholder="https://wa.me/..."
                            value={config.whatsapp || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "whatsapp",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="col-md-6 mb-3">

                        <label>
                            Instagram
                        </label>

                        <input
                            className="form-control"
                            placeholder="https://instagram.com/..."
                            value={config.instagram || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "instagram",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="col-md-6 mb-3">

                        <label>
                            Facebook
                        </label>

                        <input
                            className="form-control"
                            placeholder="https://facebook.com/..."
                            value={config.facebook || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "facebook",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="col-md-6 mb-3">

                        <label>
                            Sitio web
                        </label>

                        <input
                            className="form-control"
                            placeholder="https://..."
                            value={config.website || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "website",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="col-md-12 mb-3">

                        <label>
                            Email
                        </label>

                        <input
                            className="form-control"
                            placeholder="mailto:info@..."
                            value={config.email || ""}
                            onChange={(e) =>
                                updateBlockConfig(
                                    block.id,
                                    "email",
                                    e.target.value
                                )
                            }
                        />

                    </div>

                </div>

            </>

        );
    }

    /* UI */

    return (

        <div className="container-fluid tags_container m-0 p-0">

            <EventOwnerHeader
                session={session}
            />

            <div className="m-0 p-0 pt-4 px-2 px-md-3">

                {
                    (
                        session.role === "admin"
                        ||
                        session.role === "event_client"
                    )
                    &&
                    <OwnerNavigation />
                }

                {
                    modules
                    &&
                    (
                        <EventNavigation
                            eventId={eventId}
                            modules={modules}
                        />
                    )
                }

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 24,
                        gap: 12,
                        flexWrap: "wrap"
                    }}
                >

                    <div>

                        <h2>
                            🎨 Builder de Invitación
                        </h2>

                        <p>
                            {
                                builder.invitation?.title
                            }
                        </p>

                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap"
                        }}
                    >

                        <InvitationNavigation
                            eventId={eventId}
                            invitationId={invitationId}
                            active="builder"
                        />
                        <div>
                            <button
                                className="tags_btn"
                                onClick={save}
                                disabled={saving}
                            >
                                {
                                    saving
                                        ? "Guardando..."
                                        : "💾 Guardar Diseño"
                                }
                            </button>
                        </div>


                    </div>

                </div>

                <div className="row g-3 mb-4">

                    <div className="col-6 col-md-3 tags_text_normal mb-4 ">

                        <div className="card" style={{
                            background:
                                "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)",
                        }}>

                            <div className="card-body tags_text_normal">

                                <span>
                                    Bloques
                                </span>

                                <h3 style={{
                                    fontSize: 18
                                }}>
                                    {builder.stats?.blocks || 0}
                                </h3>

                            </div>

                        </div>

                    </div>

                    <div className="col-6 col-md-3">

                        <div className="card tags_text_normal" style={{
                            background:
                                "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)",
                        }}>

                            <div className="card-body">

                                <span>
                                    Media
                                </span>

                                <h3 style={{
                                    fontSize: 18
                                }}>
                                    {builder.stats?.media || 0}
                                </h3>

                            </div>

                        </div>

                    </div>

                    <div className="col-6 col-md-3">

                        <div className="card tags_text_normal" style={{
                            background:
                                "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)",
                        }}>

                            <div className="card-body">

                                <span>
                                    Invitados
                                </span>

                                <h3 style={{
                                    fontSize: 18
                                }}>
                                    {builder.stats?.guests || 0}
                                </h3>

                            </div>

                        </div>

                    </div>

                    <div className="col-6 col-md-3">

                        <div className="card tags_text_normal" style={{
                            background:
                                "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)",
                        }}>

                            <div className="card-body">

                                <span>
                                    Estado
                                </span>

                                <h3
                                    style={{
                                        fontSize: 18
                                    }}
                                >
                                    {
                                        builder.invitation?.published_at
                                            ? "Publicada"
                                            : "Borrador"
                                    }
                                </h3>

                            </div>

                        </div>

                    </div>

                </div>

                <div className="row g-3">

                    <div className="col-lg-3">

                        <div>

                            <div className="card-body tags_text_normal">

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 16
                                    }}
                                >

                                    <h5 className="m-0">
                                        Bloques
                                    </h5>

                                    <button
                                        className="icon_btn tags_btn"
                                        title="Agregar galería"
                                        onClick={openAddBlockModal}
                                        disabled={saving}
                                    >
                                        ＋ Nuevo
                                    </button>

                                </div>


                                {
                                    builder.blocks.map(block => (

                                        <div
                                            key={block.id}
                                            onClick={() =>
                                                setSelectedBlockId(block.id)
                                            }
                                            style={{
                                                border:
                                                    selectedBlockId === block.id
                                                        ? "2px solid #111"
                                                        : "1px solid #e5e7eb",
                                                borderRadius: 12,
                                                padding: 12,
                                                marginBottom: 10,
                                                cursor: "pointer",
                                                background:
                                                    selectedBlockId === block.id
                                                        ? "#f8f9fa"
                                                        : "#fff"
                                            }}
                                        >

                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    gap: 8
                                                }}
                                            >

                                                <div>

                                                    <strong>
                                                        {getBlockLabel(block)}
                                                    </strong>

                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            color: "#666"
                                                        }}
                                                    >
                                                        Tipo: {block.type}
                                                    </div>

                                                </div>

                                                <span className="tags_badge">
                                                    #{block.position}
                                                </span>

                                            </div>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 6,
                                                    marginTop: 10
                                                }}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >

                                                <button
                                                    className="icon_btn"
                                                    onClick={() =>
                                                        moveBlock(block.id, "up")
                                                    }
                                                >
                                                    ↑
                                                </button>

                                                <button
                                                    className="icon_btn"
                                                    onClick={() =>
                                                        moveBlock(block.id, "down")
                                                    }
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    className="icon_btn danger"
                                                    onClick={() =>
                                                        deleteBlock(block.id)
                                                    }
                                                >
                                                    🗑
                                                </button>

                                            </div>

                                        </div>

                                    ))
                                }

                            </div>

                        </div>

                    </div>

                    <div className="col-lg-5 tags_text_normal">

                        {/* <div className="card"> */}

                            <div className="card-body">
                                <div
                                    style={{
                                        padding: 16,
                                        borderRadius: 16,
                                        background: "#f6f5f5",
                                        
                                    }}
                                >

                                    <h5 className="mb-4">
                                        Editor del bloque seleccionado
                                    </h5>

                                    {
                                        selectedBlock
                                        &&
                                        (

                                            <div className="mb-3">

                                                <label>
                                                    Nombre interno del bloque
                                                </label>

                                                <input
                                                    className="form-control"
                                                    value={selectedBlock.title || ""}
                                                    onChange={(e) =>
                                                        updateBlockField(
                                                            selectedBlock.id,
                                                            "title",
                                                            e.target.value
                                                        )
                                                    }
                                                />

                                            </div>

                                        )
                                    }

                                    {
                                        selectedBlock
                                        &&
                                        renderBlockStyleEditor(selectedBlock)
                                    }

                                    {renderBlockEditor(selectedBlock)}
                                    <hr />
                                    <div
                                        style={{
                                            marginTop: 28,
                                            padding: 16,
                                            borderRadius: 16,
                                            background:
                                                "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)",
                                            border: "1px solid #d1d5db"
                                        }}
                                    >
                                        <h5 className="mb-4">
                                            Ajustes globales de la invitación
                                        </h5>

                                        {renderStyleEditor()}

                                        {renderHeaderEditor()}
                                    </div>
                                </div>
                                {/*  */}

                            </div>

                        {/* </div> */}

                    </div>

                    <div className="col-lg-4">

                        <div
                            
                            style={{
                                position: "sticky",
                                top: 20
                            }}
                        >

                            <div className="card-body" >

                                <h5 className="mb-3 text-center">
                                    Vista previa
                                </h5>

                                <div
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius,
                                        overflow: "hidden",
                                        background: backgroundColor,
                                        color: textColor,
                                        minHeight: 520,
                                        fontFamily,
                                        fontSize: textSize
                                    }}
                                >
                                    <InvitationHeader
                                        headerConfig={builder?.header}
                                        blocks={builder?.blocks}
                                        previewMode
                                    />
                                    {
                                        builder.blocks
                                            .sort((a, b) => a.position - b.position)
                                            .map(block => {

                                                const config =
                                                    normalizeConfig(block.config_json);

                                                const blockStyles =
                                                    config.styles || {};

                                                const sectionStyle = {
                                                    background:
                                                        blockStyles.background_color || "transparent",
                                                    color:
                                                        blockStyles.text_color || textColor,
                                                    textAlign:
                                                        blockStyles.text_align || "center",
                                                    fontSize:
                                                        blockStyles.text_size || textSize,
                                                    fontFamily
                                                };

                                                const headingStyle = {
                                                    color:
                                                        blockStyles.title_color ||
                                                        blockStyles.text_color ||
                                                        textColor,
                                                    fontSize:
                                                        blockStyles.title_size || titleSize,
                                                    fontWeight:
                                                        titleWeight
                                                };

                                                if (block.type === "hero") {

                                                    return (

                                                        <section
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                minHeight: 220,
                                                                padding: 24,
                                                                backgroundImage:
                                                                    config.image_url
                                                                        ? `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url(${config.image_url})`
                                                                        : "linear-gradient(135deg, #111, #444)",
                                                                backgroundSize: "cover",
                                                                backgroundPosition: "center",
                                                                color:
                                                                    blockStyles.text_color || "#fff",
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                justifyContent: "center",
                                                                textAlign:
                                                                    blockStyles.text_align || "center",
                                                                fontSize:
                                                                    blockStyles.text_size || textSize,
                                                                fontFamily
                                                            }}
                                                        >

                                                            <h2
                                                                style={{
                                                                    ...headingStyle,
                                                                    color:
                                                                        blockStyles.title_color ||
                                                                        blockStyles.text_color ||
                                                                        "#fff"
                                                                }}
                                                            >
                                                                {
                                                                    config.title
                                                                    ||
                                                                    builder.invitation?.title
                                                                    ||
                                                                    "Título de la invitación"
                                                                }
                                                            </h2>

                                                            {
                                                                config.subtitle
                                                                &&
                                                                (
                                                                    <p>
                                                                        {config.subtitle}
                                                                    </p>
                                                                )
                                                            }

                                                            {
                                                                config.button_text
                                                                &&
                                                                (
                                                                    <div>
                                                                        <button
                                                                            className="tags_btn"
                                                                            style={{
                                                                                marginTop: 12,
                                                                                background: primaryColor,
                                                                                borderColor: primaryColor,
                                                                                borderRadius
                                                                            }}
                                                                        >
                                                                            {config.button_text}
                                                                        </button>
                                                                    </div>
                                                                )
                                                            }

                                                        </section>
                                                    );
                                                }

                                                if (block.type === "event_info") {

                                                    const hasContent =
                                                        config.title
                                                        ||
                                                        config.date
                                                        ||
                                                        config.time
                                                        ||
                                                        config.description;

                                                    if (!hasContent) {

                                                        return null;
                                                    }

                                                    return (

                                                        <section
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                ...sectionStyle,
                                                                padding: 22,
                                                                borderBottom: "1px solid #eee"
                                                            }}
                                                        >

                                                            {
                                                                config.title
                                                                &&
                                                                (
                                                                    <h4 style={headingStyle}>
                                                                        {config.title}
                                                                    </h4>
                                                                )
                                                            }

                                                            {
                                                                (
                                                                    config.date
                                                                    ||
                                                                    config.time
                                                                )
                                                                &&
                                                                (
                                                                    <p>
                                                                        {
                                                                            config.date
                                                                            &&
                                                                            <>📅 {config.date}</>
                                                                        }

                                                                        {
                                                                            config.time
                                                                            &&
                                                                            <> {config.time}</>
                                                                        }
                                                                    </p>
                                                                )
                                                            }

                                                            {
                                                                config.description
                                                                &&
                                                                (
                                                                    <p>
                                                                        {config.description}
                                                                    </p>
                                                                )
                                                            }

                                                        </section>
                                                    );
                                                }

                                                if (block.type === "countdown") {

                                                    const countdown =
                                                        getCountdownParts(
                                                            config.target_date
                                                        );

                                                    return (

                                                        <section
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                ...sectionStyle,
                                                                padding: 22,
                                                                borderBottom: "1px solid #eee"
                                                            }}
                                                        >

                                                            {
                                                                config.title
                                                                &&
                                                                (
                                                                    <h4 style={headingStyle}>
                                                                        {config.title}
                                                                    </h4>
                                                                )
                                                            }

                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    justifyContent:
                                                                        blockStyles.text_align === "left"
                                                                            ? "flex-start"
                                                                            : blockStyles.text_align === "right"
                                                                                ? "flex-end"
                                                                                : "center",
                                                                    gap: 10,
                                                                    marginTop: 12,
                                                                    flexWrap: "wrap"
                                                                }}
                                                            >

                                                                {
                                                                    config.show_days !== false
                                                                    &&
                                                                    (
                                                                        <div
                                                                            className="tags_badge"
                                                                            style={{
                                                                                background: primaryColor,
                                                                                color: "#fff",
                                                                                borderRadius
                                                                            }}
                                                                        >
                                                                            <strong>
                                                                                {countdown.days}
                                                                            </strong>
                                                                            {" "}
                                                                            días
                                                                        </div>
                                                                    )
                                                                }

                                                                {
                                                                    config.show_hours !== false
                                                                    &&
                                                                    (
                                                                        <div
                                                                            className="tags_badge"
                                                                            style={{
                                                                                background: primaryColor,
                                                                                color: "#fff",
                                                                                borderRadius
                                                                            }}
                                                                        >
                                                                            <strong>
                                                                                {countdown.hours}
                                                                            </strong>
                                                                            {" "}
                                                                            hs
                                                                        </div>
                                                                    )
                                                                }

                                                                {
                                                                    config.show_minutes !== false
                                                                    &&
                                                                    (
                                                                        <div
                                                                            className="tags_badge"
                                                                            style={{
                                                                                background: primaryColor,
                                                                                color: "#fff",
                                                                                borderRadius
                                                                            }}
                                                                        >
                                                                            <strong>
                                                                                {countdown.minutes}
                                                                            </strong>
                                                                            {" "}
                                                                            min
                                                                        </div>
                                                                    )
                                                                }

                                                            </div>

                                                        </section>
                                                    );
                                                }

                                                if (block.type === "location") {

                                                    const mapsUrl =
                                                        getGoogleMapsEmbedUrl(
                                                            config.maps_url
                                                        );

                                                    const hasContent =
                                                        config.place_name
                                                        ||
                                                        config.address
                                                        ||
                                                        mapsUrl
                                                        ||
                                                        config.button_text;

                                                    if (!hasContent) {

                                                        return null;
                                                    }

                                                    return (

                                                        <section
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                ...sectionStyle,
                                                                padding: 22,
                                                                borderBottom: "1px solid #eee"
                                                            }}
                                                        >

                                                            {
                                                                config.place_name
                                                                &&
                                                                (
                                                                    <h4 style={headingStyle}>
                                                                        {config.place_name}
                                                                    </h4>
                                                                )
                                                            }

                                                            {
                                                                config.address
                                                                &&
                                                                (
                                                                    <p>
                                                                        {config.address}
                                                                    </p>
                                                                )
                                                            }

                                                            {
                                                                mapsUrl
                                                                &&
                                                                (
                                                                    <div
                                                                        style={{
                                                                            borderRadius,
                                                                            overflow: "hidden",
                                                                            marginBottom: 14,
                                                                            border: "1px solid #e5e7eb"
                                                                        }}
                                                                    >

                                                                        <iframe
                                                                            src={mapsUrl}
                                                                            width="100%"
                                                                            height="180"
                                                                            style={{
                                                                                border: 0
                                                                            }}
                                                                            loading="lazy"
                                                                        />

                                                                    </div>
                                                                )
                                                            }

                                                            {
                                                                config.button_text
                                                                &&
                                                                (
                                                                    <button
                                                                        className="tags_btn"
                                                                        style={{
                                                                            background: primaryColor,
                                                                            borderColor: primaryColor,
                                                                            borderRadius
                                                                        }}
                                                                        onClick={() => {

                                                                            if (config.maps_url) {

                                                                                window.open(
                                                                                    config.maps_url,
                                                                                    "_blank"
                                                                                );
                                                                            }
                                                                        }}
                                                                    >
                                                                        {config.button_text}
                                                                    </button>
                                                                )
                                                            }

                                                        </section>
                                                    );
                                                }

                                                if (block.type === "rsvp") {

                                                    const hasContent =
                                                        config.title
                                                        ||
                                                        config.description;

                                                    if (!hasContent) {

                                                        return null;
                                                    }

                                                    return (

                                                        <section
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                ...sectionStyle,
                                                                padding: 22
                                                            }}
                                                        >

                                                            {
                                                                config.title
                                                                &&
                                                                (
                                                                    <h4 style={headingStyle}>
                                                                        {config.title}
                                                                    </h4>
                                                                )
                                                            }

                                                            {
                                                                config.description
                                                                &&
                                                                (
                                                                    <p>
                                                                        {config.description}
                                                                    </p>
                                                                )
                                                            }

                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    gap: 8,
                                                                    justifyContent:
                                                                        blockStyles.text_align === "left"
                                                                            ? "flex-start"
                                                                            : blockStyles.text_align === "right"
                                                                                ? "flex-end"
                                                                                : "center",
                                                                    flexWrap: "wrap"
                                                                }}
                                                            >

                                                                <button
                                                                    className="tags_btn"
                                                                    style={{
                                                                        background: primaryColor,
                                                                        borderColor: primaryColor,
                                                                        borderRadius
                                                                    }}
                                                                >
                                                                    Confirmar
                                                                </button>

                                                                <button className="tags_modal_btn tags_modal_btn_cancel">
                                                                    No asistiré
                                                                </button>

                                                            </div>

                                                        </section>
                                                    );
                                                }

                                                if (block.type === "gallery") {

                                                    const galleryImages =
                                                        Array.isArray(config.image_urls)
                                                            ? config.image_urls
                                                            : Array.isArray(config.images)
                                                                ? config.images
                                                                : [];

                                                    const columns =
                                                        Number(config.columns || 2);

                                                    const gap =
                                                        Number(config.gap || 8);

                                                    const imageHeight =
                                                        Number(config.image_height || 120);

                                                    const activeIndex =
                                                        galleryIndexes[block.id] || 0;

                                                    const activeImage =
                                                        galleryImages[activeIndex];

                                                    const mode =
                                                        config.mode || "grid";

                                                    const hasContent =
                                                        config.title
                                                        ||
                                                        config.subtitle
                                                        ||
                                                        galleryImages.length > 0;

                                                    if (!hasContent) {

                                                        return null;
                                                    }

                                                    return (

                                                        <section
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                ...sectionStyle,
                                                                padding: 22,
                                                                borderBottom: "1px solid #eee"
                                                            }}
                                                        >

                                                            {
                                                                config.title
                                                                &&
                                                                (
                                                                    <h4 style={headingStyle}>
                                                                        {config.title}
                                                                    </h4>
                                                                )
                                                            }

                                                            {
                                                                config.subtitle
                                                                &&
                                                                (
                                                                    <p>
                                                                        {config.subtitle}
                                                                    </p>
                                                                )
                                                            }

                                                            {
                                                                galleryImages.length > 0
                                                                &&
                                                                mode === "grid"
                                                                &&
                                                                (
                                                                    <div
                                                                        style={{
                                                                            display: "grid",
                                                                            gridTemplateColumns:
                                                                                `repeat(${columns}, 1fr)`,
                                                                            gap
                                                                        }}
                                                                    >
                                                                        {
                                                                            galleryImages.map((url, index) => (

                                                                                <img
                                                                                    key={`${url}-${index}`}
                                                                                    src={url}
                                                                                    alt=""
                                                                                    style={{
                                                                                        width: "100%",
                                                                                        height: imageHeight,
                                                                                        objectFit: "cover",
                                                                                        borderRadius
                                                                                    }}
                                                                                />
                                                                            ))
                                                                        }
                                                                    </div>
                                                                )
                                                            }

                                                            {
                                                                galleryImages.length > 0
                                                                &&
                                                                mode === "carousel"
                                                                &&
                                                                (
                                                                    <div
                                                                        style={{
                                                                            position: "relative",
                                                                            overflow: "hidden",
                                                                            borderRadius
                                                                        }}
                                                                    >

                                                                        <img
                                                                            src={activeImage}
                                                                            alt=""
                                                                            style={{
                                                                                width: "100%",
                                                                                height: imageHeight,
                                                                                objectFit: "cover",
                                                                                display: "block"
                                                                            }}
                                                                        />

                                                                        {
                                                                            config.show_arrows !== false
                                                                            &&
                                                                            (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            prevGalleryImage(
                                                                                                block.id,
                                                                                                galleryImages.length
                                                                                            )
                                                                                        }
                                                                                        style={{
                                                                                            position: "absolute",
                                                                                            left: 8,
                                                                                            top: "50%",
                                                                                            transform: "translateY(-50%)",
                                                                                            width: 36,
                                                                                            height: 36,
                                                                                            borderRadius: 999,
                                                                                            border: "none",
                                                                                            background: "rgba(0,0,0,.5)",
                                                                                            color: "#fff",
                                                                                            cursor: "pointer"
                                                                                        }}
                                                                                    >
                                                                                        ‹
                                                                                        ‹
                                                                                    </button>

                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            nextGalleryImage(
                                                                                                block.id,
                                                                                                galleryImages.length
                                                                                            )
                                                                                        }
                                                                                        style={{
                                                                                            position: "absolute",
                                                                                            right: 8,
                                                                                            top: "50%",
                                                                                            transform: "translateY(-50%)",
                                                                                            width: 36,
                                                                                            height: 36,
                                                                                            borderRadius: 999,
                                                                                            border: "none",
                                                                                            background: "rgba(0,0,0,.5)",
                                                                                            color: "#fff",
                                                                                            cursor: "pointer"
                                                                                        }}
                                                                                    >
                                                                                        ›
                                                                                    </button>
                                                                                </>
                                                                            )
                                                                        }

                                                                        {
                                                                            config.show_dots !== false
                                                                            &&
                                                                            (
                                                                                <div
                                                                                    style={{
                                                                                        position: "absolute",
                                                                                        bottom: 8,
                                                                                        left: 0,
                                                                                        right: 0,
                                                                                        display: "flex",
                                                                                        justifyContent: "center",
                                                                                        gap: 5
                                                                                    }}
                                                                                >
                                                                                    {
                                                                                        galleryImages.map((url, index) => (

                                                                                            <span
                                                                                                key={`${url}-dot-${index}`}
                                                                                                onClick={() =>
                                                                                                    setGalleryIndexes(prev => ({

                                                                                                        ...prev,

                                                                                                        [block.id]:
                                                                                                            index
                                                                                                    }))
                                                                                                }
                                                                                                style={{
                                                                                                    width: 7,
                                                                                                    height: 7,
                                                                                                    borderRadius: 999,
                                                                                                    cursor: "pointer",
                                                                                                    background:
                                                                                                        index === activeIndex
                                                                                                            ? "#fff"
                                                                                                            : "rgba(255,255,255,.5)"
                                                                                                }}
                                                                                            />
                                                                                        ))
                                                                                    }
                                                                                </div>
                                                                            )
                                                                        }

                                                                    </div>
                                                                )
                                                            }

                                                        </section>
                                                    );
                                                }

                                                if (block.type === "video") {

                                                    const hasContent =
                                                        config.title
                                                        ||
                                                        config.description
                                                        ||
                                                        config.video_url;

                                                    if (!hasContent) {

                                                        return null;
                                                    }

                                                    return (

                                                        <section
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                ...sectionStyle,
                                                                padding: 22,
                                                                borderBottom: "1px solid #eee"
                                                            }}
                                                        >

                                                            {
                                                                config.title
                                                                &&
                                                                (
                                                                    <h4 style={headingStyle}>
                                                                        {config.title}
                                                                    </h4>
                                                                )
                                                            }

                                                            {
                                                                config.description
                                                                &&
                                                                (
                                                                    <p>
                                                                        {config.description}
                                                                    </p>
                                                                )
                                                            }

                                                            {
                                                                config.video_url
                                                                &&
                                                                (
                                                                    <video
                                                                        src={config.video_url}
                                                                        controls={config.controls !== false}
                                                                        muted={config.muted === true}
                                                                        autoPlay={config.autoplay === true}
                                                                        playsInline
                                                                        style={{
                                                                            width: "100%",
                                                                            borderRadius,
                                                                            marginTop: 12
                                                                        }}
                                                                    />
                                                                )
                                                            }

                                                        </section>
                                                    );
                                                }

                                                if (block.type === "timeline") {

                                                    const items =
                                                        Array.isArray(config.items)
                                                            ? config.items
                                                            : [];

                                                    const hasContent =
                                                        config.title
                                                        ||
                                                        config.subtitle
                                                        ||
                                                        items.length > 0;

                                                    if (!hasContent) {

                                                        return null;
                                                    }

                                                    return (

                                                        <section
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                ...sectionStyle,
                                                                padding: 22,
                                                                borderBottom: "1px solid #eee"
                                                            }}
                                                        >

                                                            {
                                                                config.title
                                                                &&
                                                                (
                                                                    <h4 style={headingStyle}>
                                                                        {config.title}
                                                                    </h4>
                                                                )
                                                            }

                                                            {
                                                                config.subtitle
                                                                &&
                                                                (
                                                                    <p>
                                                                        {config.subtitle}
                                                                    </p>
                                                                )
                                                            }

                                                            <div
                                                                style={{
                                                                    marginTop: 14
                                                                }}
                                                            >

                                                                {
                                                                    items.map((item, index) => (

                                                                        <div
                                                                            key={index}
                                                                            style={{
                                                                                display: "flex",
                                                                                gap: 12,
                                                                                marginBottom: 14,
                                                                                textAlign: "left"
                                                                            }}
                                                                        >

                                                                            {
                                                                                item.time
                                                                                &&
                                                                                (
                                                                                    <div
                                                                                        style={{
                                                                                            minWidth: 60,
                                                                                            fontWeight: 700,
                                                                                            color: primaryColor
                                                                                        }}
                                                                                    >
                                                                                        {item.time}
                                                                                    </div>
                                                                                )
                                                                            }

                                                                            <div>

                                                                                {
                                                                                    item.title
                                                                                    &&
                                                                                    (
                                                                                        <div
                                                                                            style={{
                                                                                                fontWeight: 700
                                                                                            }}
                                                                                        >
                                                                                            {item.title}
                                                                                        </div>
                                                                                    )
                                                                                }

                                                                                {
                                                                                    item.description
                                                                                    &&
                                                                                    (
                                                                                        <div>
                                                                                            {item.description}
                                                                                        </div>
                                                                                    )
                                                                                }

                                                                            </div>

                                                                        </div>
                                                                    ))
                                                                }

                                                            </div>

                                                        </section>
                                                    );
                                                }

                                                if (block.type === "gifts") {

                                                    const hasContent =
                                                        config.title
                                                        ||
                                                        config.description
                                                        ||
                                                        config.alias
                                                        ||
                                                        config.cbu
                                                        ||
                                                        config.external_url;

                                                    if (!hasContent) {

                                                        return null;
                                                    }

                                                    return (

                                                        <section
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                ...sectionStyle,
                                                                padding: 22,
                                                                borderBottom: "1px solid #eee"
                                                            }}
                                                        >

                                                            {
                                                                config.title
                                                                &&
                                                                (
                                                                    <h4 style={headingStyle}>
                                                                        {config.title}
                                                                    </h4>
                                                                )
                                                            }

                                                            {
                                                                config.description
                                                                &&
                                                                (
                                                                    <p>
                                                                        {config.description}
                                                                    </p>
                                                                )
                                                            }

                                                            <div
                                                                style={{
                                                                    border: "1px solid #e5e7eb",
                                                                    borderRadius,
                                                                    padding: 14,
                                                                    marginTop: 12,
                                                                    textAlign: "left"
                                                                }}
                                                            >

                                                                {
                                                                    config.account_holder
                                                                    &&
                                                                    (
                                                                        <div>
                                                                            <strong>Titular:</strong>{" "}
                                                                            {config.account_holder}
                                                                        </div>
                                                                    )
                                                                }

                                                                {
                                                                    config.bank_name
                                                                    &&
                                                                    (
                                                                        <div>
                                                                            <strong>Banco:</strong>{" "}
                                                                            {config.bank_name}
                                                                        </div>
                                                                    )
                                                                }

                                                                {
                                                                    config.alias
                                                                    &&
                                                                    (
                                                                        <div>
                                                                            <strong>Alias:</strong>{" "}
                                                                            {config.alias}
                                                                        </div>
                                                                    )
                                                                }

                                                                {
                                                                    config.cbu
                                                                    &&
                                                                    (
                                                                        <div>
                                                                            <strong>CBU/CVU:</strong>{" "}
                                                                            {config.cbu}
                                                                        </div>
                                                                    )
                                                                }

                                                            </div>

                                                            {
                                                                config.external_url
                                                                &&
                                                                (
                                                                    <button
                                                                        className="tags_btn"
                                                                        style={{
                                                                            marginTop: 12,
                                                                            background: primaryColor,
                                                                            borderColor: primaryColor,
                                                                            borderRadius
                                                                        }}
                                                                    >
                                                                        {
                                                                            config.external_button_text ||
                                                                            "Abrir link"
                                                                        }
                                                                    </button>
                                                                )
                                                            }

                                                        </section>
                                                    );
                                                }

                                                if (block.type === "footer") {

                                                    const links = [
                                                        {
                                                            label: "WhatsApp",
                                                            url: config.whatsapp,
                                                            icon: <FaWhatsapp />
                                                        },
                                                        {
                                                            label: "Instagram",
                                                            url: config.instagram,
                                                            icon: <FaInstagram />
                                                        },
                                                        {
                                                            label: "Facebook",
                                                            url: config.facebook,
                                                            icon: <FaFacebookF />
                                                        },
                                                        {
                                                            label: "Web",
                                                            url: config.website,
                                                            icon: <FiGlobe />
                                                        },
                                                        {
                                                            label: "Email",
                                                            url: config.email,
                                                            icon: <FiMail />
                                                        }
                                                    ].filter(item => item.url);

                                                    const hasContent =
                                                        config.title ||
                                                        config.text ||
                                                        links.length > 0;

                                                    if (!hasContent) {

                                                        return null;
                                                    }

                                                    return (

                                                        <footer
                                                            key={block.id}
                                                            id={`invite-section-${block.id}`}
                                                            style={{
                                                                ...sectionStyle,
                                                                padding: 32,
                                                                borderTop: "1px solid rgba(0,0,0,.08)"
                                                            }}
                                                        >

                                                            {
                                                                config.title
                                                                &&
                                                                (
                                                                    <h4 style={headingStyle}>
                                                                        {config.title}
                                                                    </h4>
                                                                )
                                                            }

                                                            {
                                                                config.text
                                                                &&
                                                                (
                                                                    <p>
                                                                        {config.text}
                                                                    </p>
                                                                )
                                                            }

                                                            {
                                                                links.length > 0
                                                                &&
                                                                (
                                                                    <div
                                                                        style={{
                                                                            display: "flex",
                                                                            justifyContent:
                                                                                config.styles?.text_align === "left"
                                                                                    ? "flex-start"
                                                                                    : config.styles?.text_align === "right"
                                                                                        ? "flex-end"
                                                                                        : "center",
                                                                            gap: 14,
                                                                            flexWrap: "wrap",
                                                                            marginTop: 18
                                                                        }}
                                                                    >
                                                                        {
                                                                            links.map(item => (

                                                                                <button
                                                                                    key={item.label}
                                                                                    type="button"
                                                                                    title={item.label}
                                                                                    onClick={() => {
                                                                                        if (item.url) {
                                                                                            window.open(
                                                                                                item.url,
                                                                                                "_blank"
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        border: "none",
                                                                                        background: "transparent",
                                                                                        color:
                                                                                            config.styles?.text_color ||
                                                                                            textColor,
                                                                                        borderRadius,
                                                                                        padding: 8,
                                                                                        fontSize: 24,
                                                                                        lineHeight: 1,
                                                                                        cursor: "pointer",
                                                                                        display: "inline-flex",
                                                                                        alignItems: "center",
                                                                                        justifyContent: "center"
                                                                                    }}
                                                                                >
                                                                                    {item.icon}
                                                                                </button>
                                                                            ))
                                                                        }
                                                                    </div>
                                                                )
                                                            }

                                                        </footer>
                                                    );
                                                }

                                                return null;
                                            })
                                    }

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

                {
                    showAddBlockModal
                    &&
                    (
                        <div className="tags_modal_overlay">

                            <div
                                className="tags_modal tags_text_normal"
                                style={{
                                    maxWidth: 520
                                }}
                            >

                                <div className="tags_modal_header tags_text_normal">

                                    <h3 className="tags_title">
                                        Agregar bloque
                                    </h3>

                                    <button
                                        className="tags_modal_close"
                                        onClick={() =>
                                            setShowAddBlockModal(false)
                                        }
                                    >
                                        ✕
                                    </button>

                                </div>

                                <div className="tags_modal_body">

                                    <div className="row g-3">

                                        {[
                                            { type: "hero", label: "Portada", icon: "🏞️" },
                                            { type: "event_info", label: "Información", icon: "📅" },
                                            { type: "countdown", label: "Countdown", icon: "⏳" },
                                            { type: "location", label: "Ubicación", icon: "📍" },
                                            { type: "gallery", label: "Galería", icon: "🖼" },
                                            { type: "rsvp", label: "RSVP", icon: "✅" },
                                            { type: "video", label: "Video", icon: "🎬" },
                                            { type: "timeline", label: "Agenda", icon: "🕒" },
                                            { type: "gifts", label: "Regalos", icon: "🎁" },
                                            { type: "footer", label: "Footer", icon: "🔗" },
                                        ].map(item => (

                                            <div
                                                className="col-6"
                                                key={item.type}
                                            >

                                                <button
                                                    type="button"
                                                    className="tags_btn btn_modal"
                                                    style={{
                                                        width: "100%",
                                                        minHeight: 90,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: 8,
                                                        fontSize: 15
                                                    }}
                                                    onClick={() =>
                                                        createBlock(item.type)
                                                    }
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: 26,
                                                            lineHeight: 1
                                                        }}
                                                    >
                                                        {item.icon}
                                                    </span>

                                                    <strong>
                                                        {item.label}
                                                    </strong>
                                                </button>

                                            </div>
                                        ))}

                                    </div>

                                </div>

                            </div>

                        </div>
                    )
                }

                {/* Fin */}

                <div
                    style={{
                        minHeight: 200
                    }}
                />

            </div>

        </div >
    );
}