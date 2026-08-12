"use client";

import { useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

import MediaUploader
    from "@/app/components/MediaUploader";
import { themeValueLabel } from "../lib/editorLabels";


export default function QRPageBlockEditor({
    businessId,
    pageId,
    section,
    block,
    products = [],
    onClose,
    onReload
}) {

    const [content, setContent] =
        useState(block.content_json || {});

    const [styles, setStyles] =
        useState(block.styles_json || {});

    const [saving, setSaving] =
        useState(false);

    const catalogCategories = products
        .map((product) => String(product.category || "").trim())
        .filter(Boolean)
        .filter((category, index, categories) => categories.indexOf(category) === index);


    /* const fontSizes = [
        "12px", "14px", "16px", "18px", "20px", "24px",
        "28px", "32px", "38px", "42px", "48px", "56px",
        "64px", "72px"
    ]; */
    const fontSizes = [
        ["", "Por defecto: 16px"],
        ["12px", "12px"],
        ["14px", "14px"],
        ["16px", "16px"],
        ["18px", "18px"],
        ["20px", "20px"],
        ["24px", "24px"],
        ["28px", "28px"],
        ["32px", "32px"],
        ["38px", "38px"],
        ["42px", "42px"],
        ["48px", "48px"],
        ["56px", "56px"],
        ["64px", "64px"],
        ["72px", "72px"]
    ];

    const fontWeights = [
        ["", "Por defecto: 400"],
        ["300", "Light"],
        ["400", "Regular"],
        ["500", "Medium"],
        ["600", "Semi Bold"],
        ["700", "Bold"],
        ["800", "Extra Bold"],
        ["900", "Black"]
    ];

    const lineHeights = [
        ["", "Por defecto: 1.5"],
        ["1", "Compacto"],
        ["1.2", "Ajustado"],
        ["1.5", "Normal"],
        ["1.8", "Amplio"],
        ["2", "Muy amplio"]
    ];

    const letterSpacings = [
        ["", "Por defecto: 0px"],
        ["-2px", "Muy compacto"],
        ["-1px", "Compacto"],
        ["0px", "Normal"],
        ["1px", "Amplio"],
        ["2px", "Muy amplio"]
    ];

    const [initialContent] =
        useState(
            structuredClone(
                block.content_json || {}
            )
        );

    const [initialStyles] =
        useState(
            structuredClone(
                block.styles_json || {}
            )
        );


    function updateContent(field, value) {
        setContent((prev) => ({
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

    function toggleStyle(field, activeValue, inactiveValue = "") {
        setStyles((prev) => ({
            ...prev,
            [field]:
                prev[field] === activeValue
                    ? inactiveValue
                    : activeValue
        }));
    }

    function updateItem(index, field, value) {
        const items =
            Array.isArray(content.items)
                ? content.items
                : [];

        const nextItems =
            items.map((item, i) =>
                i === index
                    ? { ...item, [field]: value }
                    : item
            );

        updateContent("items", nextItems);
    }

    function addItem(item) {
        const items =
            Array.isArray(content.items)
                ? content.items
                : [];

        updateContent("items", [
            ...items,
            item
        ]);
    }

    function removeItem(index) {
        const items =
            Array.isArray(content.items)
                ? content.items
                : [];

        updateContent(
            "items",
            items.filter((_, i) => i !== index)
        );
    }

    function updateStringItem(index, value) {
        const items =
            Array.isArray(content.items)
                ? content.items
                : [];

        const nextItems =
            items.map((item, i) =>
                i === index ? value : item
            );

        updateContent("items", nextItems);
    }

    async function handleSave() {

        setSaving(true);

        try {

            const res =
                await fetch(
                    "/api/qr-page/blocks/update",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            pageId,
                            sectionId: section.id,
                            blockId: block.id,
                            type: block.type,
                            is_visible: block.is_visible,
                            content_json: content,
                            styles_json: styles
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error guardando bloque"
                );
            }

            showAlert({
                type: "success",
                title: "Guardado",
                text: "Bloque actualizado"
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

    function TypographyPartEditor({
    part,
    label
}) {

    const value =
        getTypographyPart(part);

    return (
        <div className="qr_page_typography_part">

            <h4>{label}</h4>

            <div className="qr_page_grid_4">

                <div>
                    <label>Tamaño</label>

                    <select
                        className="qr_page_select"
                        value={value.fontSize || ""}
                        onChange={(e) =>
                            updateTypographyPart(
                                part,
                                "fontSize",
                                e.target.value
                            )
                        }
                    >
                        {
                            fontSizes.map(([value, label]) => (
                                <option
                                    key={value || "default-size"}
                                    value={value}
                                >
                                    {label}
                                </option>
                            ))
                        }
                    </select>
                </div>

                <div className="mt-2">
                    <label>Peso</label>

                    <select
                        className="qr_page_select"
                        value={value.fontWeight || ""}
                        onChange={(e) =>
                            updateTypographyPart(
                                part,
                                "fontWeight",
                                e.target.value
                            )
                        }
                    >
                        {
                            fontWeights.map(([value, label]) => (
                                <option
                                    key={value || "default-weight"}
                                    value={value}
                                >
                                    {label}
                                </option>
                            ))
                        }
                    </select>
                </div>

                <div className="mt-2">
                    <label>Interlineado</label>

                    <select
                        className="qr_page_select"
                        value={value.lineHeight || ""}
                        onChange={(e) =>
                            updateTypographyPart(
                                part,
                                "lineHeight",
                                e.target.value
                            )
                        }
                    >
                        {
                            lineHeights.map(([value, label]) => (
                                <option
                                    key={value || "default-line"}
                                    value={value}
                                >
                                    {label}
                                </option>
                            ))
                        }
                    </select>
                </div>

                <div className="mt-2">
                    <label>Espaciado</label>

                    <select
                        className="qr_page_select"
                        value={value.letterSpacing || ""}
                        onChange={(e) =>
                            updateTypographyPart(
                                part,
                                "letterSpacing",
                                e.target.value
                            )
                        }
                    >
                        {
                            letterSpacings.map(([value, label]) => (
                                <option
                                    key={value || "default-spacing"}
                                    value={value}
                                >
                                    {label}
                                </option>
                            ))
                        }
                    </select>
                </div>

            </div>

        </div>
    );
}

    function renderContentFields() {

        if (block.type === "vcard") {

            return (
                <div className="qr_page_field full">
                    <label>Texto botón</label>

                    <input
                        className="qr_page_input"
                        value={
                            content.buttonLabel ||
                            "Guardar contacto"
                        }
                        onChange={(e) =>
                            updateContent(
                                "buttonLabel",
                                e.target.value
                            )
                        }
                    />

                    <div className="qr_page_empty small">
                        Los datos del contacto se generan automáticamente desde la tarjeta de perfil y los datos generales de la QR-Page.
                    </div>
                </div>
            );
        }

        if (block.type === "profile_card") {
            return (
                <>
                    <div className="qr_page_field full">
                        <label>Foto de perfil</label>

                        <MediaUploader
                            businessId={businessId}
                            value={content.photo_url || ""}
                            folder="blocks/profile"
                            accept="image/*"
                            label="Subir foto"
                            onChange={(media) =>
                                updateContent(
                                    "photo_url",
                                    media?.url || ""
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Nombre</label>
                        <input
                            className="qr_page_input"
                            value={content.name || ""}
                            onChange={(e) =>
                                updateContent("name", e.target.value)
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Cargo / especialidad</label>
                        <input
                            className="qr_page_input"
                            value={content.jobTitle || ""}
                            onChange={(e) =>
                                updateContent("jobTitle", e.target.value)
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Empresa / marca</label>
                        <input
                            className="qr_page_input"
                            value={content.company || ""}
                            onChange={(e) =>
                                updateContent("company", e.target.value)
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Bio</label>
                        <textarea
                            className="qr_page_textarea"
                            value={content.bio || ""}
                            onChange={(e) =>
                                updateContent("bio", e.target.value)
                            }
                        />
                    </div>

                </>
            );
        }

        if (block.type === "profile_qr") {
            return (
                <>
                    <div className="qr_page_field full">
                        <label>Título</label>

                        <input
                            className="qr_page_input"
                            value={content.title || ""}
                            onChange={(e) =>
                                updateContent(
                                    "title",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Texto</label>

                        <textarea
                            className="qr_page_textarea"
                            value={content.text || ""}
                            onChange={(e) =>
                                updateContent(
                                    "text",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label className="qr_page_checkbox">
                            <input
                                type="checkbox"
                                checked={
                                    content.showUrl !== false
                                }
                                onChange={(e) =>
                                    updateContent(
                                        "showUrl",
                                        e.target.checked
                                    )
                                }
                            />
                            Mostrar URL
                        </label>
                    </div>
                </>
            );
        }

        if (block.type === "social_actions") {
            return (
                <>
                    {
                        [
                            ["showWhatsapp", "Mostrar WhatsApp"],
                            ["showPhone", "Mostrar llamada"],
                            ["showEmail", "Mostrar email"],
                            ["showWebsite", "Mostrar web"],
                            ["showLinkedin", "Mostrar LinkedIn"],
                            ["showInstagram", "Mostrar Instagram"]
                        ].map(([field, label]) => (
                            <div
                                key={field}
                                className="qr_page_field"
                            >
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={content[field] !== false}
                                        onChange={(e) =>
                                            updateContent(
                                                field,
                                                e.target.checked
                                            )
                                        }
                                    />
                                    {label}
                                </label>
                            </div>
                        ))
                    }
                </>
            );
        }

        if (block.type === "share_profile") {
            return (
                <div className="qr_page_field full">
                    <label>Texto botón</label>

                    <input
                        className="qr_page_input"
                        value={content.buttonLabel || ""}
                        onChange={(e) =>
                            updateContent(
                                "buttonLabel",
                                e.target.value
                            )
                        }
                    />
                </div>
            );
        }

        if (block.type === "web_section") {
            const paragraphs = Array.isArray(content.paragraphs) ? content.paragraphs : [];
            const images = Array.isArray(content.images) ? content.images.slice(0, 10) : [];
            const move = (field, index, direction) => {
                const values = [...(Array.isArray(content[field]) ? content[field] : [])];
                const target = direction === "up" ? index - 1 : index + 1;
                if (target < 0 || target >= values.length) return;
                [values[index], values[target]] = [values[target], values[index]];
                updateContent(field, values);
            };
            return <>
                <div className="qr_page_field"><label>Título</label><input className="qr_page_input" value={content.title || ""} onChange={e => updateContent("title", e.target.value)} /></div>
                <div className="qr_page_field"><label>Subtítulo</label><input className="qr_page_input" value={content.subtitle || ""} onChange={e => updateContent("subtitle", e.target.value)} /></div>
                <div className="qr_page_field full"><label>Texto destacado</label><textarea className="qr_page_textarea" value={content.highlightedText || ""} onChange={e => updateContent("highlightedText", e.target.value)} /></div>
                <div className="qr_page_field full"><label>Párrafos</label>{paragraphs.map((paragraph, index) => <div className="qr_page_repeater_item column" key={index}><textarea className="qr_page_textarea" value={paragraph} onChange={e => updateContent("paragraphs", paragraphs.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} /><div className="qr_page_small_actions"><button type="button" onClick={() => move("paragraphs", index, "up")} disabled={index === 0}>↑</button><button type="button" onClick={() => move("paragraphs", index, "down")} disabled={index === paragraphs.length - 1}>↓</button><button type="button" className="danger" onClick={() => updateContent("paragraphs", paragraphs.filter((_, itemIndex) => itemIndex !== index))}>Eliminar</button></div></div>)}<button type="button" className="qr_page_btn secondary" onClick={() => updateContent("paragraphs", [...paragraphs, ""])}>+ Agregar párrafo</button></div>
                <div className="qr_page_field"><label>Presentación de imágenes</label><select className="qr_page_select" value={content.imageLayout === "carousel" ? "carousel" : "grid"} onChange={e => updateContent("imageLayout", e.target.value)}><option value="grid">Grilla</option><option value="carousel">Carrusel</option></select></div>
                <div className="qr_page_field full"><label>Imágenes ({images.length}/10)</label>{images.length < 10 && <MediaUploader businessId={businessId} value="" module="qr-page" variant="gallery" entityId={block.id} accept="image/*" label="Agregar imagen" onChange={media => { if (media?.url && images.length < 10) updateContent("images", [...images, { url: media.url, alt: "", storagePath: media.storagePath || "" }]); }} />}{images.map((image, index) => <div className="qr_page_gallery_editor_item" key={`${image.url}-${index}`}><img src={image.url} alt={image.alt || ""} /><div className="qr_page_gallery_editor_body"><input className="qr_page_input" value={image.alt || ""} placeholder="Texto alternativo" onChange={e => updateContent("images", images.map((item, itemIndex) => itemIndex === index ? { ...item, alt: e.target.value } : item))} /><div className="qr_page_small_actions"><button type="button" onClick={() => move("images", index, "up")} disabled={index === 0}>↑</button><button type="button" onClick={() => move("images", index, "down")} disabled={index === images.length - 1}>↓</button><button type="button" className="danger" onClick={() => updateContent("images", images.filter((_, itemIndex) => itemIndex !== index))}>Eliminar</button></div></div></div>)}</div>
            </>;
        }

        if (block.type === "text") {
            return (
                <>
                    <div className="qr_page_field">
                        <label>Título</label>
                        <input
                            className="qr_page_input"
                            value={content.title || ""}
                            onChange={(e) =>
                                updateContent(
                                    "title",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Texto</label>
                        <textarea
                            className="qr_page_textarea"
                            value={content.text || ""}
                            onChange={(e) =>
                                updateContent(
                                    "text",
                                    e.target.value
                                )
                            }
                        />
                    </div>
                </>
            );
        }

        if (block.type === "image") {
            return (
                <>
                    <div className="qr_page_field full">
                        <label>Imagen</label>

                        <MediaUploader
                            businessId={businessId}
                            value={content.image_url || ""}
                            folder="blocks/images"
                            accept="image/*"
                            label="Subir imagen"
                            onChange={(media) =>
                                updateContent(
                                    "image_url",
                                    media?.url || null
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Texto alternativo</label>
                        <input
                            className="qr_page_input"
                            value={content.alt || ""}
                            onChange={(e) =>
                                updateContent(
                                    "alt",
                                    e.target.value
                                )
                            }
                        />
                    </div>
                </>
            );
        }

        if (block.type === "video") {
            return (
                <div className="qr_page_field full">
                    <label>Video</label>

                    <MediaUploader
                        businessId={businessId}
                        value={content.video_url || ""}
                        folder="blocks/videos"
                        accept="video/*"
                        label="Subir video"
                        onChange={(media) =>
                            updateContent(
                                "video_url",
                                media?.url || null
                            )
                        }
                    />
                </div>
            );
        }

        if (block.type === "button") {
            return (
                <>
                    <div className="qr_page_field">
                        <label>Texto del botón</label>
                        <input
                            className="qr_page_input"
                            value={content.label || ""}
                            onChange={(e) =>
                                updateContent(
                                    "label",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>URL</label>
                        <input
                            className="qr_page_input"
                            value={content.url || ""}
                            onChange={(e) =>
                                updateContent(
                                    "url",
                                    e.target.value
                                )
                            }
                        />
                    </div>
                </>
            );
        }

        if (block.type === "whatsapp") {
            return (
                <>
                    <div className="qr_page_field">
                        <label>Texto del botón</label>
                        <input
                            className="qr_page_input"
                            value={content.label || ""}
                            onChange={(e) =>
                                updateContent(
                                    "label",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>WhatsApp</label>

                        <input
                            className="qr_page_input"
                            placeholder="3546520243"
                            value={content.phone || ""}
                            onChange={(e) =>
                                updateContent(
                                    "phone",
                                    e.target.value
                                )
                            }
                        />

                        <small className="qr_page_help">
                            Ingresá solo el número local. Nosotros agregamos automáticamente 549 para WhatsApp.
                        </small>
                    </div>

                    <div className="qr_page_field full">
                        <label>Mensaje</label>
                        <textarea
                            className="qr_page_textarea"
                            value={content.message || ""}
                            onChange={(e) =>
                                updateContent(
                                    "message",
                                    e.target.value
                                )
                            }
                        />
                    </div>
                </>
            );
        }

        if (block.type === "social_links") {
            return (
                <>
                    {
                        [
                            [
                                "instagram",
                                "Instagram",
                                "ecos_del_valle",
                                "Solo usuario, sin @ ni URL."
                            ],

                            [
                                "facebook",
                                "Facebook",
                                "ecosdelvalle",
                                "Solo nombre de página o usuario."
                            ],

                            [
                                "tiktok",
                                "TikTok",
                                "ecosdelvalle",
                                "Solo usuario, sin @."
                            ],

                            [
                                "youtube",
                                "YouTube",
                                "ecosdelvalle",
                                "Usuario o canal de YouTube."
                            ],

                            [
                                "linkedin",
                                "LinkedIn",
                                "alejandro-morales",
                                "Solo identificador del perfil."
                            ],

                            [
                                "website",
                                "Sitio web",
                                "www.miweb.com.ar",
                                "Podés ingresar dominio o URL completa."
                            ]
                        ].map(([field, label, placeholder, helper]) => (
                            <div
                                key={field}
                                className="qr_page_field"
                            >
                                <label>{label}</label>

                                <input
                                    className="qr_page_input"
                                    placeholder={placeholder}
                                    value={content[field] || ""}
                                    onChange={(e) =>
                                        updateContent(
                                            field,
                                            e.target.value
                                        )
                                    }
                                />

                                <small className="qr_page_help">
                                    {helper}
                                </small>

                            </div>
                        ))
                    }
                </>
            );
        }

        if (block.type === "custom_links") {

            const items =
                Array.isArray(content.items)
                    ? content.items
                    : [];

            return (
                <div className="qr_page_field full">

                    <label>Título</label>

                    <input
                        className="qr_page_input"
                        value={content.title || ""}
                        onChange={(e) =>
                            updateContent(
                                "title",
                                e.target.value
                            )
                        }
                    />

                    <label style={{ marginTop: 16 }}>
                        Enlaces
                    </label>

                    {
                        items.map((item, index) => (
                            <div
                                key={index}
                                className="qr_page_repeater_item column"
                            >

                                <input
                                    className="qr_page_input"
                                    placeholder="Etiqueta"
                                    value={item.label || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "label",
                                            e.target.value
                                        )
                                    }
                                />

                                <input
                                    className="qr_page_input"
                                    placeholder={
                                        item.icon === "tiktok"
                                            ? "usuario TikTok sin @"
                                            : item.icon === "youtube"
                                                ? "usuario o canal YouTube"
                                                : item.icon === "x"
                                                    ? "usuario X / Twitter sin @"
                                                    : item.icon === "telegram"
                                                        ? "usuario Telegram sin @"
                                                        : "www.miweb.com.ar o URL"
                                    }
                                    value={item.url || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "url",
                                            e.target.value
                                        )
                                    }
                                />
                                <small className="qr_page_help">

                                    {
                                        item.icon === "tiktok"
                                            ? "Ej: ecosdelvalle → tiktok.com/@ecosdelvalle"
                                            : item.icon === "youtube"
                                                ? "Ej: ecosdelvalle → youtube.com/@ecosdelvalle"
                                                : item.icon === "x"
                                                    ? "Ej: ecosdelvalle → x.com/ecosdelvalle"
                                                    : item.icon === "telegram"
                                                        ? "Ej: ecosdelvalle → t.me/ecosdelvalle"
                                                        : "Podés ingresar dominio o URL completa."
                                    }

                                </small>

                                <select
                                    className="qr_page_select"
                                    value={item.icon || "link"}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "icon",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="link">
                                        Link
                                    </option>

                                    <option value="tiktok">
                                        TikTok
                                    </option>

                                    <option value="x">
                                        X / Twitter
                                    </option>

                                    <option value="youtube">
                                        YouTube
                                    </option>

                                    <option value="telegram">
                                        Telegram
                                    </option>
                                </select>

                                <button
                                    type="button"
                                    className="qr_page_btn danger"
                                    onClick={() =>
                                        removeItem(index)
                                    }
                                >
                                    Eliminar enlace
                                </button>

                            </div>
                        ))
                    }

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            addItem({
                                label: "Nuevo enlace",
                                url: "",
                                icon: "link"
                            })
                        }
                    >
                        + Agregar enlace
                    </button>

                </div>
            );
        }

        if (block.type === "map") {
            return (
                <>
                    <div className="qr_page_field full">
                        <label>Dirección</label>
                        <input
                            className="qr_page_input"
                            value={content.address || ""}
                            onChange={(e) =>
                                updateContent(
                                    "address",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Embed URL de Google Maps</label>
                        <input
                            className="qr_page_input"
                            value={content.embed_url || ""}
                            onChange={(e) =>
                                updateContent(
                                    "embed_url",
                                    e.target.value
                                )
                            }
                        />
                    </div>
                </>
            );
        }

        if (block.type === "spacer") {
            return (
                <div className="qr_page_field">
                    <label>Alto en px</label>
                    <input
                        className="qr_page_input"
                        type="number"
                        value={content.height || 32}
                        onChange={(e) =>
                            updateContent(
                                "height",
                                Number(e.target.value)
                            )
                        }
                    />
                </div>
            );
        }

        if (block.type === "feature_list") {

            const items =
                Array.isArray(content.items)
                    ? content.items
                    : [];

            return (
                <div className="qr_page_field full">
                    <label>Beneficios / características</label>

                    {
                        items.map((item, index) => (
                            <div
                                key={index}
                                className="qr_page_repeater_item"
                            >
                                <input
                                    className="qr_page_input"
                                    value={item || ""}
                                    onChange={(e) =>
                                        updateStringItem(
                                            index,
                                            e.target.value
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="qr_page_btn danger"
                                    onClick={() =>
                                        removeItem(index)
                                    }
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))
                    }

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            addItem("Nuevo beneficio")
                        }
                    >
                        + Agregar beneficio
                    </button>
                </div>
            );
        }

        if (block.type === "bullet_list") {

            const items =
                Array.isArray(content.items)
                    ? content.items
                    : [];

            return (

                <div className="qr_page_field full">

                    <label>Título</label>

                    <input
                        className="qr_page_input"
                        value={content.title || ""}
                        onChange={(e) =>
                            updateContent(
                                "title",
                                e.target.value
                            )
                        }
                    />

                    <label style={{ marginTop: 16 }}>
                        Icono
                    </label>

                    <select
                        className="qr_page_select"
                        value={content.icon || "check"}
                        onChange={(e) =>
                            updateContent(
                                "icon",
                                e.target.value
                            )
                        }
                    >
                        <option value="check">✓ Check</option>
                        <option value="dot">● Punto</option>
                        <option value="arrow">→ Flecha</option>
                        <option value="star">★ Estrella</option>
                        <option value="heart">♥ Corazón</option>
                        <option value="bolt">⚡ Rayo</option>
                    </select>

                    <label style={{ marginTop: 16 }}>
                        Color icono
                    </label>

                    <input
                        type="color"
                        className="qr_page_input qr_page_color"
                        value={
                            content.iconColor ||
                            "#2563eb"
                        }
                        onChange={(e) =>
                            updateContent(
                                "iconColor",
                                e.target.value
                            )
                        }
                    />

                    <label style={{ marginTop: 16 }}>
                        Sangría izquierda
                    </label>

                    <select
                        className="qr_page_select"
                        value={styles.listIndent || "0px"}
                        onChange={(e) =>
                            updateStyle(
                                "listIndent",
                                e.target.value
                            )
                        }
                    >
                        <option value="0px">Sin sangría</option>
                        <option value="24px">Suave</option>
                        <option value="48px">Media</option>
                        <option value="80px">Amplia</option>
                        <option value="100px">100px</option>
                        <option value="120px">120px</option>
                        <option value="160px">160px</option>
                        <option value="200px">200px</option>
                        <option value="300px">300px</option>
                    </select>

                    <label style={{ marginTop: 16 }}>
                        Viñetas
                    </label>

                    {
                        items.map((item, index) => (

                            <div
                                key={index}
                                className="qr_page_repeater_item"
                            >

                                <input
                                    className="qr_page_input"
                                    value={item || ""}
                                    onChange={(e) =>
                                        updateStringItem(
                                            index,
                                            e.target.value
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="qr_page_btn danger"
                                    onClick={() =>
                                        removeItem(index)
                                    }
                                >
                                    Eliminar
                                </button>

                            </div>

                        ))
                    }

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            addItem(
                                "Nueva viñeta"
                            )
                        }
                    >
                        + Agregar viñeta
                    </button>

                </div>

            );
        }

        if (block.type === "cards") {

            const items =
                Array.isArray(content.items)
                    ? content.items
                    : [];

            return (
                <div className="qr_page_field full">
                    <label>Tarjetas</label>

                    {
                        items.map((item, index) => (
                            <div
                                key={index}
                                className="qr_page_repeater_item column"
                            >
                                <input
                                    className="qr_page_input"
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

                                <textarea
                                    className="qr_page_textarea"
                                    placeholder="Descripción"
                                    value={item.text || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "text",
                                            e.target.value
                                        )
                                    }
                                />

                                <MediaUploader
                                    businessId={businessId}
                                    value={item.image_url || ""}
                                    folder="blocks/cards"
                                    accept="image/*"
                                    label="Imagen tarjeta"
                                    onChange={(media) =>
                                        updateItem(
                                            index,
                                            "image_url",
                                            media?.url || ""
                                        )
                                    }
                                />

                                <input
                                    className="qr_page_input"
                                    placeholder="Texto botón"
                                    value={item.button_label || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "button_label",
                                            e.target.value
                                        )
                                    }
                                />

                                <input
                                    className="qr_page_input"
                                    placeholder="URL botón"
                                    value={item.button_url || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "button_url",
                                            e.target.value
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="qr_page_btn danger"
                                    onClick={() =>
                                        removeItem(index)
                                    }
                                >
                                    Eliminar tarjeta
                                </button>
                            </div>
                        ))
                    }

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            addItem({
                                title: "Nueva tarjeta",
                                text: "Descripción de la tarjeta.",
                                image_url: "",
                                button_label: "",
                                button_url: ""
                            })
                        }
                    >
                        + Agregar tarjeta
                    </button>
                </div>
            );
        }

        if (block.type === "contact_info") {
            return (
                <>
                    {
                        [
                            ["showWhatsapp", "Mostrar WhatsApp"],
                            ["showPhone", "Mostrar teléfono"],
                            ["showEmail", "Mostrar email"],
                            ["showAddress", "Mostrar dirección"]
                        ].map(([field, label]) => (
                            <div
                                key={field}
                                className="qr_page_field"
                            >
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={content[field] !== false}
                                        onChange={(e) =>
                                            updateContent(
                                                field,
                                                e.target.checked
                                            )
                                        }
                                    />
                                    {label}
                                </label>
                            </div>
                        ))
                    }
                </>
            );
        }
        if (block.type === "faq") {

            const items =
                Array.isArray(content.items)
                    ? content.items
                    : [];

            return (
                <div className="qr_page_field full">
                    <label>Preguntas frecuentes</label>

                    {
                        items.map((item, index) => (
                            <div
                                key={index}
                                className="qr_page_repeater_item column"
                            >
                                <input
                                    className="qr_page_input"
                                    placeholder="Pregunta"
                                    value={item.question || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "question",
                                            e.target.value
                                        )
                                    }
                                />

                                <textarea
                                    className="qr_page_textarea"
                                    placeholder="Respuesta"
                                    value={item.answer || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "answer",
                                            e.target.value
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="qr_page_btn danger"
                                    onClick={() =>
                                        removeItem(index)
                                    }
                                >
                                    Eliminar pregunta
                                </button>
                            </div>
                        ))
                    }

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            addItem({
                                question: "Nueva pregunta",
                                answer: "Respuesta."
                            })
                        }
                    >
                        + Agregar pregunta
                    </button>
                </div>
            );
        }
        if (block.type === "testimonials") {

            const items =
                Array.isArray(content.items)
                    ? content.items
                    : [];

            return (
                <div className="qr_page_field full">
                    <label>Testimonios</label>

                    {
                        items.map((item, index) => (
                            <div
                                key={index}
                                className="qr_page_repeater_item column"
                            >
                                <input
                                    className="qr_page_input"
                                    placeholder="Nombre"
                                    value={item.name || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "name",
                                            e.target.value
                                        )
                                    }
                                />

                                <input
                                    className="qr_page_input"
                                    placeholder="Rol / descripción"
                                    value={item.role || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "role",
                                            e.target.value
                                        )
                                    }
                                />

                                <textarea
                                    className="qr_page_textarea"
                                    placeholder="Texto del testimonio"
                                    value={item.text || ""}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "text",
                                            e.target.value
                                        )
                                    }
                                />

                                <MediaUploader
                                    businessId={businessId}
                                    value={item.image_url || ""}
                                    folder="blocks/testimonials"
                                    accept="image/*"
                                    label="Imagen"
                                    onChange={(media) =>
                                        updateItem(
                                            index,
                                            "image_url",
                                            media?.url || ""
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="qr_page_btn danger"
                                    onClick={() =>
                                        removeItem(index)
                                    }
                                >
                                    Eliminar testimonio
                                </button>
                            </div>
                        ))
                    }

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            addItem({
                                name: "Nombre",
                                role: "",
                                text: "Testimonio del cliente.",
                                image_url: ""
                            })
                        }
                    >
                        + Agregar testimonio
                    </button>
                </div>
            );
        }
        if (block.type === "pricing_cards") {

            const items =
                Array.isArray(content.items)
                    ? content.items
                    : [];

            return (
                <div className="qr_page_field full">
                    <label>Planes / precios</label>

                    {
                        items.map((item, index) => (
                            <div
                                key={index}
                                className="qr_page_repeater_item column"
                            >
                                <input
                                    className="qr_page_input"
                                    placeholder="Título"
                                    value={item.title || ""}
                                    onChange={(e) =>
                                        updateItem(index, "title", e.target.value)
                                    }
                                />

                                <input
                                    className="qr_page_input"
                                    placeholder="Precio"
                                    value={item.price || ""}
                                    onChange={(e) =>
                                        updateItem(index, "price", e.target.value)
                                    }
                                />

                                <textarea
                                    className="qr_page_textarea"
                                    placeholder="Características, una por línea"
                                    value={
                                        Array.isArray(item.features)
                                            ? item.features.join("\n")
                                            : ""
                                    }
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "features",
                                            e.target.value
                                                .split("\n")
                                                .filter(Boolean)
                                        )
                                    }
                                />

                                <input
                                    className="qr_page_input"
                                    placeholder="Texto botón"
                                    value={item.button_label || ""}
                                    onChange={(e) =>
                                        updateItem(index, "button_label", e.target.value)
                                    }
                                />

                                <input
                                    className="qr_page_input"
                                    placeholder="URL botón"
                                    value={item.button_url || ""}
                                    onChange={(e) =>
                                        updateItem(index, "button_url", e.target.value)
                                    }
                                />

                                <button
                                    type="button"
                                    className="qr_page_btn danger"
                                    onClick={() => removeItem(index)}
                                >
                                    Eliminar plan
                                </button>
                            </div>
                        ))
                    }

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            addItem({
                                title: "Nuevo plan",
                                price: "$0",
                                features: ["Característica 1"],
                                button_label: "Consultar",
                                button_url: ""
                            })
                        }
                    >
                        + Agregar plan
                    </button>
                </div>
            );
        }
        if (block.type === "cta") {
            return (
                <>
                    <div className="qr_page_field full">
                        <label>Título</label>
                        <input
                            className="qr_page_input"
                            value={content.title || ""}
                            onChange={(e) =>
                                updateContent("title", e.target.value)
                            }
                        />
                    </div>

                    <div className="qr_page_field full">
                        <label>Texto</label>
                        <textarea
                            className="qr_page_textarea"
                            value={content.text || ""}
                            onChange={(e) =>
                                updateContent("text", e.target.value)
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>Texto botón</label>
                        <input
                            className="qr_page_input"
                            value={content.buttonLabel || ""}
                            onChange={(e) =>
                                updateContent("buttonLabel", e.target.value)
                            }
                        />
                    </div>

                    <div className="qr_page_field">
                        <label>URL botón</label>
                        <input
                            className="qr_page_input"
                            value={content.buttonUrl || ""}
                            onChange={(e) =>
                                updateContent("buttonUrl", e.target.value)
                            }
                        />
                    </div>
                </>
            );
        }
        if (block.type === "stats") {

            const items =
                Array.isArray(content.items)
                    ? content.items
                    : [];

            return (
                <div className="qr_page_field full">
                    <label>Estadísticas</label>

                    {
                        items.map((item, index) => (
                            <div
                                key={index}
                                className="qr_page_repeater_item column"
                            >
                                <input
                                    className="qr_page_input"
                                    placeholder="Valor"
                                    value={item.value || ""}
                                    onChange={(e) =>
                                        updateItem(index, "value", e.target.value)
                                    }
                                />

                                <input
                                    className="qr_page_input"
                                    placeholder="Etiqueta"
                                    value={item.label || ""}
                                    onChange={(e) =>
                                        updateItem(index, "label", e.target.value)
                                    }
                                />

                                <button
                                    type="button"
                                    className="qr_page_btn danger"
                                    onClick={() => removeItem(index)}
                                >
                                    Eliminar estadística
                                </button>
                            </div>
                        ))
                    }

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            addItem({
                                value: "+100",
                                label: "Clientes"
                            })
                        }
                    >
                        + Agregar estadística
                    </button>
                </div>
            );
        }
        if (block.type === "team") {

            const items =
                Array.isArray(content.items)
                    ? content.items
                    : [];

            return (
                <div className="qr_page_field full">
                    <label>Equipo</label>

                    {
                        items.map((item, index) => (
                            <div
                                key={index}
                                className="qr_page_repeater_item column"
                            >
                                <input
                                    className="qr_page_input"
                                    placeholder="Nombre"
                                    value={item.name || ""}
                                    onChange={(e) =>
                                        updateItem(index, "name", e.target.value)
                                    }
                                />

                                <input
                                    className="qr_page_input"
                                    placeholder="Cargo / especialidad"
                                    value={item.role || ""}
                                    onChange={(e) =>
                                        updateItem(index, "role", e.target.value)
                                    }
                                />

                                <MediaUploader
                                    businessId={businessId}
                                    value={item.image_url || ""}
                                    folder="blocks/team"
                                    accept="image/*"
                                    label="Foto"
                                    onChange={(media) =>
                                        updateItem(
                                            index,
                                            "image_url",
                                            media?.url || ""
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="qr_page_btn danger"
                                    onClick={() => removeItem(index)}
                                >
                                    Eliminar persona
                                </button>
                            </div>
                        ))
                    }

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            addItem({
                                name: "Nombre Apellido",
                                role: "Cargo o especialidad",
                                image_url: ""
                            })
                        }
                    >
                        + Agregar persona
                    </button>
                </div>
            );
        }


        if (block.type === "divider") {
            return (
                <div className="qr_page_empty small">
                    Separador simple. Podés ajustar estilos abajo.
                </div>
            );
        }

        if (block.type === "catalog") {
            return (
                <>
                    <div className="qr_page_field">
                        <label>Texto superior</label>
                        <input className="qr_page_input" value={content.eyebrow ?? "CATÁLOGO"} onChange={(e) => updateContent("eyebrow", e.target.value)} />
                    </div>

                    <div className="qr_page_field">
                        <label>Título</label>
                        <input className="qr_page_input" value={content.title ?? "Productos y servicios"} onChange={(e) => updateContent("title", e.target.value)} />
                    </div>

                    <div className="qr_page_field full">
                        <label>Subtítulo</label>
                        <input className="qr_page_input" value={content.subtitle || ""} onChange={(e) => updateContent("subtitle", e.target.value)} />
                    </div>

                    <div className="qr_page_field full">
                        <label>Texto destacado</label>
                        <textarea className="qr_page_textarea" value={content.highlightedText || ""} onChange={(e) => updateContent("highlightedText", e.target.value)} />
                    </div>

                    <div className="qr_page_field full">
                        <label>Párrafos <small>Separalos con una línea vacía.</small></label>
                        <textarea className="qr_page_textarea" value={(Array.isArray(content.paragraphs) ? content.paragraphs : []).join("\n\n")} onChange={(e) => updateContent("paragraphs", e.target.value.split(/\n\s*\n/))} />
                    </div>

                    <div className="qr_page_field">
                        <label>Mostrar</label>

                        <select
                            className="qr_page_select"
                            value={content.category || "all"}
                            onChange={(e) =>
                                updateContent(
                                    "category",
                                    e.target.value
                                )
                            }
                        >
                            <option value="all">
                                Todo
                            </option>

                            <option value="products">
                                Productos
                            </option>

                            <option value="services">
                                Servicios
                            </option>

                            <option value="featured">
                                Destacados
                            </option>

                            <option value="offers">
                                Ofertas
                            </option>

                            {catalogCategories
                                .filter((category) => !["products", "services", "featured", "offers"].includes(category))
                                .map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="qr_page_field">
                        <label>Texto del buscador</label>
                        <input className="qr_page_input" value={content.searchPlaceholder || ""} placeholder="Buscar por producto o categoría" onChange={(e) => updateContent("searchPlaceholder", e.target.value)} />
                    </div>

                    <div className="qr_page_field">
                        <label>Opción para todas las categorías</label>
                        <input className="qr_page_input" value={content.allCategoriesLabel || ""} placeholder="Todos" onChange={(e) => updateContent("allCategoriesLabel", e.target.value)} />
                    </div>

                    <div className="qr_page_empty small">
                        Este bloque muestra los productos o servicios según la categoría seleccionada.
                    </div>
                </>
            );
        }

        if (block.type === "gallery") {

            const images =
                Array.isArray(content.images)
                    ? content.images
                    : [];
            const maxImages = Number(content.maxImages) > 0
                ? Number(content.maxImages)
                : null;

            function addGalleryImage(media) {

                if (!media?.url) {
                    return;
                }

                if (maxImages && images.length >= maxImages) {
                    showAlert({
                        type: "warning",
                        title: "Límite alcanzado",
                        text: `Esta galería admite hasta ${maxImages} imágenes.`
                    });
                    return;
                }

                updateContent(
                    "images",
                    [
                        ...images,
                        {
                            url: media.url,
                            alt: ""
                        }
                    ]
                );
            }

            function updateGalleryImage(index, field, value) {

                const nextImages =
                    images.map((image, i) =>
                        i === index
                            ? {
                                ...image,
                                [field]: value
                            }
                            : image
                    );

                updateContent(
                    "images",
                    nextImages
                );
            }

            function removeGalleryImage(index) {

                const nextImages =
                    images.filter((_, i) =>
                        i !== index
                    );

                updateContent(
                    "images",
                    nextImages
                );
            }

            function moveGalleryImage(index, direction) {

                const targetIndex =
                    direction === "up"
                        ? index - 1
                        : index + 1;

                if (
                    targetIndex < 0 ||
                    targetIndex >= images.length
                ) {
                    return;
                }

                const nextImages =
                    [...images];

                const current =
                    nextImages[index];

                nextImages[index] =
                    nextImages[targetIndex];

                nextImages[targetIndex] =
                    current;

                updateContent(
                    "images",
                    nextImages
                );
            }

            return (
                <div className="qr_page_field full">

                    <label>Galería</label>

                        {(!maxImages || images.length < maxImages) && <MediaUploader
                        businessId={businessId}
                        value=""
                        folder="blocks/gallery"
                        accept="image/*"
                        label="Agregar imagen"
                        onChange={addGalleryImage}
                        />}

                        {maxImages && (
                            <p className="qr_page_help">
                                {images.length} de {maxImages} imágenes
                            </p>
                        )}

                    {
                        !images.length && (
                            <div className="qr_page_empty small">
                                Todavía no agregaste imágenes.
                            </div>
                        )
                    }

                    {
                        images.map((image, index) => (
                            <div
                                key={`${image.url}-${index}`}
                                className="qr_page_gallery_editor_item"
                            >

                                <img
                                    src={image.url}
                                    alt={image.alt || ""}
                                />

                                <div className="qr_page_gallery_editor_body">

                                    <input
                                        className="qr_page_input"
                                        value={image.alt || ""}
                                        placeholder="Texto alternativo"
                                        onChange={(e) =>
                                            updateGalleryImage(
                                                index,
                                                "alt",
                                                e.target.value
                                            )
                                        }
                                    />

                                    <div className="qr_page_small_actions">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                moveGalleryImage(
                                                    index,
                                                    "up"
                                                )
                                            }
                                            disabled={index === 0}
                                        >
                                            ↑
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                moveGalleryImage(
                                                    index,
                                                    "down"
                                                )
                                            }
                                            disabled={
                                                index ===
                                                images.length - 1
                                            }
                                        >
                                            ↓
                                        </button>

                                        <button
                                            type="button"
                                            className="danger"
                                            onClick={() =>
                                                removeGalleryImage(
                                                    index
                                                )
                                            }
                                        >
                                            Eliminar
                                        </button>

                                    </div>

                                </div>

                            </div>
                        ))
                    }

                </div>
            );
        }

        return (
            <div className="qr_page_empty small">
                Tipo de bloque sin editor específico.
            </div>
        );
    }

    function updateTypographyPart(part, field, value) {

        setStyles((prev) => ({
            ...prev,
            typography: {
                ...(prev.typography || {}),
                [part]: {
                    ...((prev.typography || {})[part] || {}),
                    [field]: value
                }
            }
        }));
    }

    function getTypographyPart(part) {

        return (
            styles.typography?.[part] || {}
        );
    }

    /* Reset Estilos del Bloque */
    function resetBlockStyles() {

        setStyles({});
    }
    /* Deshacer Cambios */
    function undoChanges() {

        setContent(
            structuredClone(initialContent)
        );

        setStyles(
            structuredClone(initialStyles)
        );
    }

    function getTypographyPartsByBlockType(type) {

        const map = {
            profile_card: [
                ["title", "Nombre / título"],
                ["subtitle", "Cargo / subtítulo"],
                ["meta", "Empresa / detalle"],
                ["text", "Descripción"]
            ],

            catalog: [
                ["title", "Título producto"],
                ["text", "Descripción"],
                ["price", "Precio"],
                ["oldPrice", "Precio anterior"],
                ["meta", "Descuento / etiqueta"],
                ["button", "Botón"]
            ],

            text: [
                ["title", "Título"],
                ["text", "Texto"]
            ],

            cards: [
                ["title", "Título tarjeta"],
                ["text", "Texto tarjeta"],
                ["button", "Botón"]
            ],

            feature_list: [
                ["text", "Ítems"]
            ],

            bullet_list: [

                ["title", "Título"],

                ["text", "Viñetas"]

            ],

            stats: [
                ["title", "Valor"],
                ["text", "Etiqueta"]
            ],

            custom_links: [
                ["title", "Título"],
                ["button", "Links"]
            ],

            social_actions: [
                ["button", "Botones"]
            ],

            vcard: [
                ["button", "Botón"]
            ],

            share_profile: [
                ["button", "Botón"]
            ],

            profile_qr: [
                ["title", "Título"],
                ["text", "Texto"],
                ["button", "Botón"]
            ],

            cta: [
                ["title", "Título"],
                ["text", "Texto"],
                ["button", "Botón"]
            ],

            faq: [
                ["title", "Pregunta"],
                ["text", "Respuesta"]
            ],

            testimonials: [
                ["title", "Nombre"],
                ["subtitle", "Rol"],
                ["text", "Testimonio"]
            ],

            pricing_cards: [
                ["title", "Título"],
                ["price", "Precio"],
                ["text", "Características"],
                ["button", "Botón"]
            ],

            contact_info: [
                ["text", "Datos de contacto"]
            ],

            team: [
                ["title", "Nombre"],
                ["subtitle", "Cargo"]
            ]
        };

        return map[type] || [
            ["text", "Texto"]
        ];
    }

    function renderSpacingFields() {

        const spacingOptions = [
            "", "0px", "10px", "20px", "30px",
            "40px", "60px", "80px", "100px",
            "120px", "180px", "240px", "300px"
        ];

        return (
            <>
                {
                    [
                        ["marginTop", "Margen superior"],
                        ["marginBottom", "Margen inferior"],
                        ["marginLeft", "Margen izquierdo"],
                        ["marginRight", "Margen derecho"],
                        ["padding", "Padding interno"]
                    ].map(([field, label]) => (
                        <div
                            key={field}
                            className="qr_page_field"
                        >
                            <label>{label}</label>

                            <select
                                className="qr_page_select"
                                value={styles[field] || ""}
                                onChange={(e) =>
                                    updateStyle(
                                        field,
                                        e.target.value
                                    )
                                }
                            >
                                {
                                    spacingOptions.map((value) => (
                                        <option
                                            key={value || "default"}
                                            value={value}
                                        >
                                            {
                                                value || "Por defecto: 0px"
                                            }
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                    ))
                }
            </>
        );
    }


    /*  UI  */

    return (
        <div className="qr_page_modal_overlay">

            <div className="qr_page_modal">

                <div className="qr_page_modal_header">
                    <div>
                        <h3>
                            Editar bloque
                        </h3>

                        <p>
                            Tipo: {block.type}
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
                    {renderContentFields()}
                    <div className="qr_page_field full">
                    </div>

                    <div className="qr_page_field">
                        <h3>Tipografía</h3>


                        {
                            getTypographyPartsByBlockType(
                                block.type
                            ).map(([part, label]) => (
                                <TypographyPartEditor
                                    key={part}
                                    part={part}
                                    label={label}
                                />
                            ))
                        }
                    </div>
                    <div>
                        {
                            block.type !== "faq" && (
                                <div div className="qr_page_field">
                                    <div >

                                        <label>Color de texto</label>

                                        <div className="qr_page_color_row">
                                            <input
                                                className="qr_page_input qr_page_color"
                                                type="color"
                                                value={styles.textColor || "#111827"}
                                                onChange={(e) =>
                                                    updateStyle("textColor", e.target.value)
                                                }
                                            />

                                            <input
                                                className="qr_page_input"
                                                value={styles.textColor || "#111827"}
                                                onChange={(e) =>
                                                    updateStyle("textColor", e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <label>Color de fondo</label>

                                        <div className="qr_page_color_row">
                                            <input
                                                className="qr_page_input qr_page_color"
                                                type="color"
                                                value={styles.backgroundColor || "#ffffff"}
                                                onChange={(e) =>
                                                    updateStyle("backgroundColor", e.target.value)
                                                }
                                            />

                                            <input
                                                className="qr_page_input"
                                                value={styles.backgroundColor || "#ffffff"}
                                                onChange={(e) =>
                                                    updateStyle("backgroundColor", e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        <div className="qr_page_field full">
                            <h3>Espaciado</h3>
                        </div>

                        {renderSpacingFields()}

                        {
                            block.type === "bullet_list" && (

                                <div className="mt-2">

                                    <label>Alineación</label>

                                    <select

                                        className="qr_page_select"

                                        value={
                                            styles.alignment || "left"
                                        }

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

                            )
                        }
                        {
                            block.type === "faq" && (
                                <>

                                    <div className="qr_page_typography_part mt-3">
                                        <h4>
                                            Colores pregunta
                                        </h4>



                                        <div >
                                            <label>Color texto pregunta</label>

                                            <div className="qr_page_color_row">
                                                <input
                                                    className="qr_page_input qr_page_color"
                                                    type="color"
                                                    value={styles.questionTextColor || "#111827"}
                                                    onChange={(e) =>
                                                        updateStyle("questionTextColor", e.target.value)
                                                    }
                                                />

                                                <input
                                                    className="qr_page_input"
                                                    value={styles.questionTextColor || "#111827"}
                                                    onChange={(e) =>
                                                        updateStyle("questionTextColor", e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <label>Color fondo pregunta</label>

                                            <div className="qr_page_color_row">
                                                <input
                                                    className="qr_page_input qr_page_color"
                                                    type="color"
                                                    value={styles.questionBackgroundColor || "#ffffff"}
                                                    onChange={(e) =>
                                                        updateStyle("questionBackgroundColor", e.target.value)
                                                    }
                                                />

                                                <input
                                                    className="qr_page_input"
                                                    value={styles.questionBackgroundColor || "#ffffff"}
                                                    onChange={(e) =>
                                                        updateStyle("questionBackgroundColor", e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="qr_page_typography_part">
                                        <h4>
                                            Colores respuesta
                                        </h4>


                                        <div >
                                            <label>Color texto respuesta</label>

                                            <div className="qr_page_color_row">
                                                <input
                                                    className="qr_page_input qr_page_color"
                                                    type="color"
                                                    value={styles.answerTextColor || "#4b5563"}
                                                    onChange={(e) =>
                                                        updateStyle("answerTextColor", e.target.value)
                                                    }
                                                />

                                                <input
                                                    className="qr_page_input"
                                                    value={styles.answerTextColor || "#4b5563"}
                                                    onChange={(e) =>
                                                        updateStyle("answerTextColor", e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-2" >
                                            <label>Color fondo respuesta</label>

                                            <div className="qr_page_color_row">
                                                <input
                                                    className="qr_page_input qr_page_color"
                                                    type="color"
                                                    value={styles.answerBackgroundColor || "#ffffff"}
                                                    onChange={(e) =>
                                                        updateStyle("answerBackgroundColor", e.target.value)
                                                    }
                                                />

                                                <input
                                                    className="qr_page_input"
                                                    value={styles.answerBackgroundColor || "#ffffff"}
                                                    onChange={(e) =>
                                                        updateStyle("answerBackgroundColor", e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </>
                            )
                        }
                    </div>

                </div>

                <div className="qr_page_actions mt">
                    <button
                        type="button"
                        className="qr_page_btn success"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Guardando..." : "Guardar bloque"}
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={undoChanges}
                    >
                        Deshacer
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={resetBlockStyles}
                    >
                        Restaurar estilos
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
