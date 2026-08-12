// src/app/dashboard/businesses/[id]/qr-page/pageClient.jsx

"use client";

import { useEffect, useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

import "@/app/styles/qr-page.css";

import QRPageSectionsManager
    from "@/app/modules/qr-page/builder/QRPageSectionsManager";

import QRPageRenderer
    from "@/app/modules/qr-page/renderers/QRPageRenderer";

import MediaUploader
    from "@/app/components/MediaUploader";

import QRPageTemplatesManager
    from "@/app/modules/qr-page/builder/QRPageTemplatesManager";

import QRPageProductsManager
    from "@/app/modules/qr-page/builder/QRPageProductsManager";
import TypographyEditor from "@/app/modules/qr-page/builder/TypographyEditor";
import TagsSpinner from "@/app/components/TagsSpinner";



export default function QRPageBuilderClient({
    businessId,
    qrCodeId,
    business,
    session,
    editorTitle = "Editar QR-Page",
    publicUrlOverride = null
}) {

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [qrPage, setQrPage] =
        useState(null);

    const [activeTab, setActiveTab] =
        useState("general");

    const [mobileGroup, setMobileGroup] =
        useState(0);

    const [themes, setThemes] =
        useState([]);

    const tabGroups = [

        {
            title: "⚙️ Configuración",

            items: [

                ["general", "Información"],

                ["contact", "Contacto y redes"]
            ]
        },

        {
            title: "🎨 Diseño",

            items: [

                ["styles", "Apariencia"],

                ["design", "Fuentes y textos"],

                ["templates", "Plantillas Prediseñadas"],

                ["themes", "Paletas de Colores"]
            ]
        },

        {
            title: "🧩 Página",

            items: [

                ["header", "Encabezado"],

                ["builder", "Contenido"],

                ["footer", "Pie de página"]
            ]
        },

        {
            title: "🛍️ Catálogo",

            items: [

                ["products", "Productos y servicios"]
            ]
        },

        {
            title: "👀 Revisar",

            items: [

                ["preview", "Vista previa"]
            ]
        },

        {
            title: "🔎 Google",

            items: [

                ["seo", "Google y buscadores"]
            ]
        }

    ];

    async function loadQRPage() {

        setLoading(true);

        try {

            const res =
                await fetch(
                    `/api/qr-page/get-or-create?businessId=${businessId}&qrCodeId=${qrCodeId}`
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error cargando QR-Page"
                );
            }

            setQrPage(
                data.qrPage
            );

        } catch (err) {

            console.error(err);

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setLoading(false);
        }
    }



    /* Load Principal */
    useEffect(() => {
        loadQRPage();
        loadThemes();
    }, []);

    useEffect(() => {

        const index =

            tabGroups.findIndex(

                group =>

                    group.items.some(

                        ([key]) =>

                            key === activeTab

                    )

            );

        if (index >= 0) {

            setMobileGroup(index);

        }

    }, [activeTab]);


    async function loadThemes() {
        try {

            const res =
                await fetch(
                    "/api/qr-page/themes/list"
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error cargando Temas de color"
                );
            }

            setThemes(
                data.themes || []
            );

        } catch (err) {

            console.error(err);
        }
    }

    function updateTypography(field, value) {

        setQrPage((prev) => ({

            ...prev,

            page: {

                ...prev.page,

                typography_tokens: {

                    ...(prev.page.typography_tokens || {}),

                    [field]: value
                }
            }
        }));
    }

    function updateTypographyGroup(group, value) {

        setQrPage((prev) => ({

            ...prev,

            page: {

                ...prev.page,

                typography_tokens: {

                    ...(prev.page.typography_tokens || {}),

                    [group]: value
                }
            }
        }));
    }

    async function handleApplyTheme(themeId) {

        if (!qrPage?.page?.id) {
            return;
        }

        const confirm =
            await showAlert({
                title: "Aplicar theme",
                text: "Se aplicará este theme visual a toda la QR-Page.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Aplicar",
                cancelButtonText: "Cancelar"
            });

        if (!confirm) {
            return;
        }

        try {

            const res =
                await fetch(
                    "/api/qr-page/themes/apply",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            pageId: qrPage.page.id,
                            themeId
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error aplicando theme"
                );
            }

            showAlert({
                type: "success",
                title: "Theme aplicado",
                text: "El theme fue aplicado correctamente"
            });

            await loadQRPage();

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });
        }
    }

    function updatePageField(field, value) {

        setQrPage((prev) => ({
            ...prev,
            page: {
                ...prev.page,
                [field]: value
            }
        }));
    }

    function updateGlobalStyle(field, value) {

        setQrPage((prev) => ({
            ...prev,
            page: {
                ...prev.page,
                global_styles: {
                    ...(prev.page.global_styles || {}),
                    [field]: value
                }
            }
        }));
    }

    function updateHeaderConfig(field, value) {

        setQrPage((prev) => ({
            ...prev,
            page: {
                ...prev.page,
                header_config: {
                    ...(prev.page.header_config || {}),
                    [field]: value
                }
            }
        }));
    }

    async function handleSave() {

        if (!qrPage?.page) {
            return;
        }

        setSaving(true);

        try {

            const page =
                qrPage.page;

            const res =
                await fetch(
                    "/api/qr-page/update",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            pageId: page.id,

                            slug: page.slug,
                            title: page.title,
                            description: page.description,
                            status: page.status,

                            logo_url: page.logo_url,
                            cover_image_url: page.cover_image_url,

                            whatsapp: page.whatsapp,
                            email: page.email,
                            phone: page.phone,
                            address: page.address,

                            instagram_url: page.instagram_url,
                            facebook_url: page.facebook_url,
                            tiktok_url: page.tiktok_url,
                            youtube_url: page.youtube_url,
                            linkedin_url: page.linkedin_url,
                            website_url: page.website_url,

                            global_styles: page.global_styles,
                            typography_tokens: qrPage.page.typography_tokens,
                            header_config: page.header_config,
                            footer_config: page.footer_config,

                            seo_title: page.seo_title,
                            seo_description: page.seo_description,
                            seo_keywords: page.seo_keywords,
                            seo_image_url: page.seo_image_url,
                            seo_image_og_url: page.seo_image_og_url,
                            canonical_url: page.canonical_url,
                            schema_type: page.schema_type,
                            robots_index: page.robots_index,
                            robots_follow: page.robots_follow
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error guardando QR-Page"
                );
            }

            showAlert({
                type: "success",
                title: "Guardado",
                text: "QR-Page actualizada correctamente"
            });

            await loadQRPage();

        } catch (err) {

            console.error(err);

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setSaving(false);
        }
    }

    async function handlePublish(status) {

        if (!qrPage?.page) {
            return;
        }

        const endpoint =
            status === "published"
                ? "/api/qr-page/publish"
                : "/api/qr-page/unpublish";

        try {

            const res =
                await fetch(
                    endpoint,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            pageId: qrPage.page.id
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error cambiando estado"
                );
            }

            showAlert({
                type: "success",
                title: "Listo",
                text:
                    status === "published"
                        ? "QR-Page publicada"
                        : "QR-Page despublicada"
            });

            await loadQRPage();

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });
        }
    }

    function renderTabButton(key, label) {

        return (
            <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={
                    activeTab === key
                        ? "qr_page_tab active"
                        : "qr_page_tab"
                }
            >
                {label}
            </button>
        );
    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    if (!qrPage?.page) {
        return (
            <div className="qr_page_builder">
                <div className="qr_page_card">
                    No se pudo cargar la QR-Page.
                </div>
            </div>
        );
    }

    const page =
        qrPage.page;

    const publicUrl =
        publicUrlOverride || `/p/${page.slug}`;

    function updateFooterConfig(field, value) {

        setQrPage((prev) => ({
            ...prev,
            page: {
                ...prev.page,
                footer_config: {
                    ...(prev.page.footer_config || {}),
                    [field]: value
                }
            }
        }));
    }

    async function handleResetTheme() {

        const confirm =
            await showAlert({
                title: "Restaurar theme",
                text: "Se quitará el theme aplicado.",
                icon: "warning",
                showCancelButton: true
            });

        if (!confirm) {
            return;
        }

        try {

            const res =
                await fetch(
                    "/api/qr-page/themes/reset",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            pageId:
                                qrPage.page.id
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error
                );
            }

            await loadQRPage();

            showAlert({
                type: "success",
                title: "Theme restaurado"
            });

        } catch (err) {

            showAlert({
                type: "error",
                title: "Error",
                text: err.message
            });
        }
    }

    function updateTypography(field, value) {

        setQrPage((prev) => ({

            ...prev,

            page: {

                ...prev.page,

                typography_tokens: {

                    ...(prev.page.typography_tokens || {}),

                    [field]: value
                }
            }
        }));
    }

    function updateTypographyGroup(group, value) {

        setQrPage((prev) => ({

            ...prev,

            page: {

                ...prev.page,

                typography_tokens: {

                    ...(prev.page.typography_tokens || {}),

                    [group]: value
                }
            }
        }));
    }

    function TabSaveBar() {

        return (
            <div className="qr_page_tab_savebar mt-4 ">

                <button
                    type="button"
                    className=" primary tags_btn py-3 px-2"
                    style={{ fontWeight: "500" }}
                    onClick={handleSave}
                >
                    Guardar cambios
                </button>

            </div>
        );
    }

    function getFontCssValue(font) {

        const fonts = {
            "Inter": "var(--font-inter)",
            "Poppins": "var(--font-poppins)",
            "Montserrat": "var(--font-montserrat)",
            "Raleway": "var(--font-raleway)",
            "Playfair Display": "var(--font-playfair)",
            "Lora": "var(--font-lora)",
            "Oswald": "var(--font-oswald)",
            "Bebas Neue": "var(--font-bebas)"
        };

        return fonts[font] || "var(--font-inter)";
    }

    const activeGroup =

        tabGroups.find(group =>

            group.items.some(

                ([key]) => key === activeTab

            )

        );

    function renderMobileTabs() {

        const group =
            tabGroups[mobileGroup];

        if (!group) return null;

        return (

            <div className="qr_page_mobile_tabs">

                <label>

                    📂 Sección

                </label>

                <select

                    className="qr_page_select mb-2"

                    value={mobileGroup}

                    onChange={(e) =>

                        changeMobileGroup(

                            Number(

                                e.target.value

                            )

                        )

                    }

                >

                    {

                        tabGroups.map(

                            (group, index) => (

                                <option

                                    key={group.title}

                                    value={index}

                                >

                                    {group.title}

                                </option>

                            )

                        )

                    }

                </select>

                <div className="qr_page_mobile_buttons">

                    {

                        group.items.map(

                            ([key, label]) =>

                                renderTabButton(

                                    key,

                                    label

                                )

                        )

                    }

                </div>

            </div>

        );

    }
    function changeMobileGroup(index) {

        setMobileGroup(index);

        const firstTab =
            tabGroups[index]?.items?.[0]?.[0];

        if (firstTab) {

            setActiveTab(firstTab);

        }

    }

    /*  UI  */

    return (
        <div className="qr_page_builder">

            <div className="qr_page_header">

                <div>
                    <h1 className="qr_page_title">
                        {editorTitle}
                    </h1>

                    <p className="qr_page_subtitle">
                        {business.name}
                    </p>
                </div>

                <div className="qr_page_actions">

                    <a
                        href={publicUrl}
                        target="_blank"
                        className="qr_page_btn secondary"
                    >
                        Ver pública
                    </a>

                    {
                        page.status === "published"
                            ? (
                                <button
                                    type="button"
                                    className="qr_page_btn"
                                    onClick={() =>
                                        handlePublish("draft")
                                    }
                                >
                                    Despublicar
                                </button>
                            )
                            : (
                                <button
                                    type="button"
                                    className="qr_page_btn success"
                                    onClick={() =>
                                        handlePublish("published")
                                    }
                                >
                                    Publicar
                                </button>
                            )
                    }

                    <button
                        type="button"
                        className="qr_page_btn"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {
                            saving
                                ? "Guardando..."
                                : "Guardar"
                        }
                    </button>

                </div>

            </div>

            <div className="qr_page_status">
                Estado:{" "}
                <strong>
                    {
                        page.status === "published"
                            ? "Publicada"
                            : "Borrador"
                    }
                </strong>
            </div>

            <div className="qr_page_navigation">

                <div className="qr_page_tabs_desktop mb-3">

                    {

                        tabGroups.map(group => (

                            <div
                                key={group.title}
                                className="qr_page_tab_group"
                            >

                                <div className="qr_page_tab_group_title">

                                    {group.title}

                                </div>

                                {

                                    group.items.map(

                                        ([key, label]) =>

                                            renderTabButton(
                                                key,
                                                label
                                            )

                                    )

                                }

                            </div>

                        ))

                    }

                </div>

                {renderMobileTabs()}

            </div>

            {
                activeTab === "general" && (
                    <div className="qr_page_card">
                        <div className="qr_page_grid">

                            <div className="qr_page_field">
                                <label>Nombre de tu página</label>

                                <small className="qr_page_help">
                                    Es el nombre principal que verán tus visitantes.
                                </small>
                                <input
                                    className="qr_page_input"
                                    value={page.title || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "title",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Dirección Web</label>
                                <input
                                    className="qr_page_input"
                                    value={page.slug || ""}
                                    readOnly
                                />

                                <small className="qr_page_help">

                                    Esta dirección se definió cuando activaste la página y ya no puede modificarse.

                                </small>
                            </div>

                            <div className="qr_page_field full">
                                <label>Descripción</label>
                                <small className="qr_page_help">

                                    Explicá quién sos, qué hacés y qué ofrecés.

                                </small>
                                <textarea
                                    className="qr_page_textarea"
                                    value={page.description || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "description",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Logo</label>
                                <small className="qr_page_help">

                                    Se mostrará en el encabezado.

                                </small>
                                <MediaUploader
                                    businessId={businessId}
                                    value={page.logo_url || ""}
                                    folder="logo"
                                    accept="image/*"
                                    label="Subir logo"
                                    onChange={(media) =>
                                        updatePageField(
                                            "logo_url",
                                            media?.url || null
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Imagen principal</label>
                                <small className="qr_page_help">

                                    Se mostrará en la portada principal.

                                </small>
                                <MediaUploader
                                    businessId={businessId}
                                    value={page.cover_image_url || ""}
                                    folder="cover"
                                    accept="image/*"
                                    label="Subir imagen principal"
                                    onChange={(media) =>
                                        updatePageField(
                                            "cover_image_url",
                                            media?.url || null
                                        )

                                    }
                                />
                            </div>

                        </div>
                        <TabSaveBar />
                    </div>

                )
            }

            {
                activeTab === "contact" && (
                    <div className="qr_page_card">
                        <div className="qr_page_grid">

                            <div className="qr_page_field">
                                <label>WhatsApp</label>
                                <input
                                    className="qr_page_input"
                                    placeholder="3546520243"
                                    value={page.whatsapp || ""}
                                    onChange={(e) =>
                                        updatePageField("whatsapp", e.target.value)
                                    }
                                />
                                <small className="qr_page_help">
                                    Ingresá solo el número local. Ej: 3546520243. Lo convertimos a 549 para WhatsApp.
                                </small>
                            </div>

                            <div className="qr_page_field">
                                <label>Email</label>
                                <input
                                    className="qr_page_input"
                                    value={page.email || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "email",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Teléfono</label>
                                <input
                                    className="qr_page_input"
                                    value={page.phone || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "phone",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Sitio web</label>
                                <input
                                    className="qr_page_input"
                                    placeholder="www.miweb.com.ar"
                                    value={page.website_url || ""}
                                    onChange={(e) =>
                                        updatePageField("website_url", e.target.value)
                                    }
                                />
                                <small className="qr_page_help">
                                    Podés ingresar dominio o URL completa.
                                </small>
                            </div>

                            <div className="qr_page_field full">
                                <label>Dirección</label>
                                <textarea
                                    className="qr_page_textarea"
                                    value={page.address || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "address",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Instagram</label>
                                <input
                                    className="qr_page_input"
                                    placeholder="ecos_del_valle"
                                    value={page.instagram_url || ""}
                                    onChange={(e) =>
                                        updatePageField("instagram_url", e.target.value)
                                    }
                                />
                                <small className="qr_page_help">
                                    Ingresá solo el usuario, sin @ ni URL.
                                </small>
                            </div>

                            <div className="qr_page_field">
                                <label>Facebook</label>
                                <input
                                    className="qr_page_input"
                                    placeholder="ecosdelvalle"
                                    value={page.facebook_url || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "facebook_url",
                                            e.target.value
                                        )
                                    }
                                />

                                <small className="qr_page_help">
                                    Solo usuario o nombre de página.
                                </small>

                            </div>

                            <div className="qr_page_field">
                                <label>TikTok</label>
                                <input
                                    className="qr_page_input"
                                    placeholder="ecosdelvalle"
                                    value={page.tiktok_url || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "tiktok_url",
                                            e.target.value
                                        )
                                    }
                                />

                                <small className="qr_page_help">
                                    Solo usuario, sin @.
                                </small>
                            </div>

                            <div className="qr_page_field">
                                <label>YouTube</label>
                                <input
                                    className="qr_page_input"
                                    placeholder="ecosdelvalle"
                                    value={page.youtube_url || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "youtube_url",
                                            e.target.value
                                        )
                                    }
                                />

                                <small className="qr_page_help">
                                    Usuario o canal de YouTube.
                                </small>
                            </div>

                            <div className="qr_page_field">
                                <label>LinkedIn</label>
                                <input
                                    className="qr_page_input"
                                    placeholder="alejandro-morales"
                                    value={page.linkedin_url || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "linkedin_url",
                                            e.target.value
                                        )
                                    }
                                />

                                <small className="qr_page_help">
                                    Solo identificador del perfil.
                                </small>
                            </div>

                        </div>
                        <TabSaveBar />
                    </div>
                )
            }

            {activeTab === "themes" && (
                <div className="qr_page_card">

                    <h3>Temas de Color</h3>

                    <p className="qr_page_help">
                        Elegí un estilo visual para toda la Página QR-Page o Tags-ID.
                    </p>

                    <div className="qr_page_theme_gallery">
                        {themes.map((theme) => {
                            const tokens =
                                theme.css_tokens || {};

                            const selected =
                                Number(qrPage?.page?.theme_id) === Number(theme.id)
                                ||
                                Number(qrPage?.page?.theme?.id) === Number(theme.id);

                            return (
                                <button
                                    key={theme.id}
                                    type="button"
                                    className={
                                        selected
                                            ? "qr_page_theme_card selected"
                                            : "qr_page_theme_card"
                                    }
                                    onClick={() =>
                                        handleApplyTheme(theme.id)
                                    }
                                >
                                    <div
                                        className="qr_page_theme_preview"
                                        style={{
                                            background: tokens["--qr-bg"] || "#ffffff"
                                        }}
                                    >
                                        <div
                                            className="qr_page_theme_preview_header"
                                            style={{
                                                background:
                                                    tokens["--qr-surface"] || "#ffffff"
                                            }}
                                        />

                                        <div
                                            className="qr_page_theme_preview_card"
                                            style={{
                                                background:
                                                    tokens["--qr-surface"] || "#ffffff",
                                                borderColor:
                                                    tokens["--qr-border"] || "#e5e7eb"
                                            }}
                                        />

                                        <div
                                            className="qr_page_theme_preview_button"
                                            style={{
                                                background:
                                                    tokens["--qr-primary"] || "#111827"
                                            }}
                                        />
                                    </div>

                                    <strong>{theme.name}</strong>
                                    <small>{theme.description}</small>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={handleResetTheme}
                    >
                        Restaurar estilo original
                    </button>

                    <TabSaveBar />

                </div>
            )}

            {
                activeTab === "design" && (

                    <div className="qr_page_card">

                        <h2>
                            Fuentes y Textos
                        </h2>

                        <div className="qr_page_grid_2">

                            <div className="qr_page_field">


                                <div >
                                    <label>Tipo de letra</label>

                                    <div className="qr_page_font_select_row">

                                        <select
                                            className="qr_page_select"
                                            value={
                                                qrPage.page.typography_tokens?.fontFamily || "Inter"
                                            }
                                            onChange={(e) =>
                                                updateTypography(
                                                    "fontFamily",
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="Inter">Inter</option>
                                            <option value="Poppins">Poppins</option>
                                            <option value="Montserrat">Montserrat</option>
                                            <option value="Raleway">Raleway</option>
                                            <option value="Playfair Display">Playfair Display</option>
                                            <option value="Lora">Lora</option>
                                            <option value="Oswald">Oswald</option>
                                            <option value="Bebas Neue">Bebas Neue</option>
                                        </select>

                                        <div
                                            className="qr_page_font_preview_box"
                                            style={{
                                                fontFamily:
                                                    getFontCssValue(
                                                        qrPage.page.typography_tokens?.fontFamily || "Inter"
                                                    )
                                            }}
                                        >
                                            Aa Bb Cc 123
                                        </div>

                                    </div>
                                </div>
                            </div>

                        </div>

                        <TypographyEditor
                            title="H1 - Títulos"
                            value={
                                qrPage.page.typography_tokens?.h1
                            }
                            onChange={(value) =>
                                updateTypographyGroup(
                                    "h1",
                                    value
                                )
                            }
                        />

                        <TypographyEditor
                            title="H2 -Subtítulos"
                            value={
                                qrPage.page.typography_tokens?.h2
                            }
                            onChange={(value) =>
                                updateTypographyGroup(
                                    "h2",
                                    value
                                )
                            }
                        />

                        <TypographyEditor
                            title="H3 Subtítulos Pequeños"
                            value={
                                qrPage.page.typography_tokens?.h3
                            }
                            onChange={(value) =>
                                updateTypographyGroup(
                                    "h3",
                                    value
                                )
                            }
                        />

                        <TypographyEditor
                            title="Body - Texto General"
                            value={
                                qrPage.page.typography_tokens?.body
                            }
                            onChange={(value) =>
                                updateTypographyGroup(
                                    "body",
                                    value
                                )
                            }
                        />

                        <TypographyEditor
                            title="Botones"
                            value={
                                qrPage.page.typography_tokens?.button
                            }
                            onChange={(value) =>
                                updateTypographyGroup(
                                    "button",
                                    value
                                )
                            }
                        />
                        <TabSaveBar />
                    </div>
                )
            }

            {
                activeTab === "header" && (
                    <div className="qr_page_card">
                        <h2>Encabezado</h2>

                        <p className="qr_page_help">
                            Configurá cómo se verá la parte superior de tu página.
                        </p>

                        <div className="qr_page_grid">

                            {/* =========================
                                    HEADER
                            ========================= */}

                            {/* <div className="qr_page_field full">
                                <h3>Header</h3>
                            </div> */}

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.header_config?.showLogo !== false
                                        }
                                        onChange={(e) =>
                                            updateHeaderConfig(
                                                "showLogo",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar logo
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.header_config?.showName !== false
                                        }
                                        onChange={(e) =>
                                            updateHeaderConfig(
                                                "showName",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar nombre
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.header_config?.showMenu !== false
                                        }
                                        onChange={(e) =>
                                            updateHeaderConfig(
                                                "showMenu",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar menú
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.header_config?.sticky === true
                                        }
                                        onChange={(e) =>
                                            updateHeaderConfig(
                                                "sticky",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Header sticky
                                </label>
                            </div>

                            <div>
                                <div className="qr_page_field">
                                    <label>Color fondo header</label>

                                    <div className="qr_page_color_row">

                                        <input
                                            type="color"
                                            className="qr_page_input qr_page_color"
                                            value={
                                                page.header_config?.backgroundColor ||
                                                "#ffffff"
                                            }
                                            onChange={(e) =>
                                                updateHeaderConfig(
                                                    "backgroundColor",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <input
                                            className="qr_page_input"
                                            value={
                                                page.header_config?.backgroundColor ||
                                                "#ffffff"
                                            }
                                            onChange={(e) =>
                                                updateHeaderConfig(
                                                    "backgroundColor",
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>
                                </div>

                                <div className="qr_page_field">
                                    <label>Color texto header</label>

                                    <div className="qr_page_color_row">

                                        <input
                                            type="color"
                                            className="qr_page_input qr_page_color"
                                            value={
                                                page.header_config?.textColor ||
                                                "#ffffff"
                                            }
                                            onChange={(e) =>
                                                updateHeaderConfig(
                                                    "textColor",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <input
                                            className="qr_page_input"
                                            value={
                                                page.header_config?.textColor ||
                                                "#ffffff"
                                            }
                                            onChange={(e) =>
                                                updateHeaderConfig(
                                                    "textColor",
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>
                                </div>
                            </div>


                            <div className="qr_page_field">
                                <label>Ancho máximo logo</label>

                                <input
                                    type="number"
                                    className="qr_page_input"
                                    value={page.header_config?.logoSize || 140}
                                    onChange={(e) =>
                                        updateHeaderConfig(
                                            "logoSize",
                                            Number(e.target.value)
                                        )
                                    }
                                />

                                <label>Radio logo</label>

                                <input
                                    type="number"
                                    className="qr_page_input"
                                    value={page.header_config?.logoRadius || 0}
                                    onChange={(e) =>
                                        updateHeaderConfig(
                                            "logoRadius",
                                            Number(e.target.value)
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Tipo de Menú Desplegable</label>

                                <select
                                    className="qr_page_select"
                                    value={
                                        page.header_config?.menuType ||
                                        "default"
                                    }
                                    onChange={(e) =>
                                        updateHeaderConfig(
                                            "menuType",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="default">
                                        Dropdown superior
                                    </option>

                                    <option value="drawer">
                                        Drawer lateral
                                    </option>

                                    <option value="fullscreen">
                                        Modal fullscreen
                                    </option>
                                </select>
                                {/* Tipo de desplegable */}
                                {
                                    (page.header_config?.menuType || "default") === "default" && (
                                        <div className="mt-3">
                                            <label>Desplegar menú</label>

                                            <select
                                                className="qr_page_select"
                                                value={
                                                    page.header_config?.menuPosition ||
                                                    "top"
                                                }
                                                onChange={(e) =>
                                                    updateHeaderConfig(
                                                        "menuPosition",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="top">
                                                    Desde arriba
                                                </option>

                                                <option value="bottom">
                                                    Desde abajo
                                                </option>
                                            </select>
                                        </div>
                                    )
                                }
                                {
                                    page.header_config?.menuType === "drawer" && (
                                        <div className="qr_page_field">
                                            <label>Posición drawer</label>

                                            <select
                                                className="qr_page_select"
                                                value={
                                                    page.header_config?.drawerPosition ||
                                                    "left"
                                                }
                                                onChange={(e) =>
                                                    updateHeaderConfig(
                                                        "drawerPosition",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="left">
                                                    Izquierda
                                                </option>

                                                <option value="right">
                                                    Derecha
                                                </option>
                                            </select>
                                        </div>
                                    )
                                }

                            </div>
                            <div>
                                <div className="qr_page_field">
                                    <label>Color fondo menú desplegable</label>

                                    <div className="qr_page_color_row">
                                        <input
                                            type="color"
                                            className="qr_page_input qr_page_color"
                                            value={
                                                page.header_config?.menuBackgroundColor ||
                                                page.header_config?.backgroundColor ||
                                                "#ffffff"
                                            }
                                            onChange={(e) =>
                                                updateHeaderConfig(
                                                    "menuBackgroundColor",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <input
                                            className="qr_page_input"
                                            value={
                                                page.header_config?.menuBackgroundColor ||
                                                page.header_config?.backgroundColor ||
                                                "#ffffff"
                                            }
                                            onChange={(e) =>
                                                updateHeaderConfig(
                                                    "menuBackgroundColor",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="qr_page_field">
                                    <label>Color texto menú desplegable</label>

                                    <div className="qr_page_color_row">
                                        <input
                                            type="color"
                                            className="qr_page_input qr_page_color"
                                            value={
                                                page.header_config?.menuTextColor ||
                                                page.header_config?.textColor ||
                                                "#111827"
                                            }
                                            onChange={(e) =>
                                                updateHeaderConfig(
                                                    "menuTextColor",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <input
                                            className="qr_page_input"
                                            value={
                                                page.header_config?.menuTextColor ||
                                                page.header_config?.textColor ||
                                                "#111827"
                                            }
                                            onChange={(e) =>
                                                updateHeaderConfig(
                                                    "menuTextColor",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="qr_page_field full">
                                <h3>Tipografía Header</h3>
                            </div>
                            <TypographyEditor
                                title="Logo / Marca"
                                value={
                                    page.header_config?.typography?.logo
                                }
                                onChange={(value) =>
                                    updateHeaderConfig(
                                        "typography",
                                        {
                                            ...(page.header_config?.typography || {}),
                                            logo: value
                                        }
                                    )
                                }
                            />

                            <TypographyEditor
                                title="Menú"
                                value={
                                    page.header_config?.typography?.menu
                                }
                                onChange={(value) =>
                                    updateHeaderConfig(
                                        "typography",
                                        {
                                            ...(page.header_config?.typography || {}),
                                            menu: value
                                        }
                                    )
                                }
                            />

                        </div>
                        <div className="qr_page_actions mt-5 mb-5">

                            <button
                                type="button"
                                className="qr_page_btn success"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                Guardar cambios
                            </button>

                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                onClick={loadQRPage}
                            >
                                Deshacer
                            </button>

                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                onClick={() =>
                                    updatePageField(
                                        "header_config",
                                        {
                                            showLogo: true,
                                            showName: true,
                                            showMenu: true,
                                            sticky: true,
                                            logoSize: 140,
                                            logoRadius: 0,
                                            logoFit: "contain",
                                            menuType: "default",
                                            backgroundColor: "#ffffff",
                                            textColor: "#111827",
                                            menuBackgroundColor: "#ffffff",
                                            menuTextColor: "#111827",
                                            menuPosition: "top",
                                            drawerPosition: "left",
                                            typography: {
                                                logo: {
                                                    fontSize: "16px",
                                                    fontWeight: "700",
                                                    lineHeight: "1.2"
                                                },
                                                menu: {
                                                    fontSize: "14px",
                                                    fontWeight: "500",
                                                    lineHeight: "1.2"
                                                }
                                            }
                                        }
                                    )
                                }
                            >
                                Cargar default
                            </button>

                        </div>
                    </div>
                )
            }
            {
                activeTab === "footer" && (
                    <div className="qr_page_card">
                        <h2>Pie de Página</h2>

                        <p className="qr_page_help">
                            Configurá la información que aparecerá al final de la página.
                        </p>

                        <div className="qr_page_grid">

                            {/* =========================
                                FOOTER
                                ========================= */}

                            <div className="qr_page_field full">
                                <h3>Footer</h3>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.footer_config?.showFooter !== false
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "showFooter",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar footer
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.footer_config?.showBusinessName !== false
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "showBusinessName",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar nombre
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.footer_config?.showDescription !== false
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "showDescription",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar descripción
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.footer_config?.showContact !== false
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "showContact",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar contacto
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.footer_config?.showSocialLinks !== false
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "showSocialLinks",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar redes
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.footer_config?.showCopyright !== false
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "showCopyright",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar copyright
                                </label>
                            </div>

                            <div className="qr_page_field full">
                                <label>Texto footer</label>

                                <textarea
                                    className="qr_page_textarea"
                                    value={
                                        page.footer_config?.text || ""
                                    }
                                    onChange={(e) =>
                                        updateFooterConfig(
                                            "text",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Color fondo footer</label>

                                <div className="qr_page_color_row">

                                    <input
                                        type="color"
                                        className="qr_page_input qr_page_color"
                                        value={
                                            page.footer_config?.backgroundColor ||
                                            "#111827"
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "backgroundColor",
                                                e.target.value
                                            )
                                        }
                                    />

                                    <input
                                        className="qr_page_input"
                                        value={
                                            page.footer_config?.backgroundColor ||
                                            "#111827"
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "backgroundColor",
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>
                            </div>

                            <div className="qr_page_field">
                                <label>Color texto footer</label>

                                <div className="qr_page_color_row">

                                    <input
                                        type="color"
                                        className="qr_page_input qr_page_color"
                                        value={
                                            page.footer_config?.textColor ||
                                            "#ffffff"
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "textColor",
                                                e.target.value
                                            )
                                        }
                                    />

                                    <input
                                        className="qr_page_input"
                                        value={
                                            page.footer_config?.textColor ||
                                            "#ffffff"
                                        }
                                        onChange={(e) =>
                                            updateFooterConfig(
                                                "textColor",
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>
                            </div>

                            <div className="qr_page_field">
                                <label>Alineación footer</label>

                                <select
                                    className="qr_page_select"
                                    value={
                                        page.footer_config?.alignment ||
                                        "center"
                                    }
                                    onChange={(e) =>
                                        updateFooterConfig(
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
                            <div className="qr_page_field full">
                                <h3>Tipografía Footer</h3>
                            </div>

                            <TypographyEditor
                                title="Título"
                                value={
                                    page.footer_config?.typography?.title
                                }
                                onChange={(value) =>
                                    updateFooterConfig(
                                        "typography",
                                        {
                                            ...(page.footer_config?.typography || {}),
                                            title: value
                                        }
                                    )
                                }
                            />

                            <TypographyEditor
                                title="Texto"
                                value={
                                    page.footer_config?.typography?.text
                                }
                                onChange={(value) =>
                                    updateFooterConfig(
                                        "typography",
                                        {
                                            ...(page.footer_config?.typography || {}),
                                            text: value
                                        }
                                    )
                                }
                            />

                            <TypographyEditor
                                title="Links"
                                value={
                                    page.footer_config?.typography?.links
                                }
                                onChange={(value) =>
                                    updateFooterConfig(
                                        "typography",
                                        {
                                            ...(page.footer_config?.typography || {}),
                                            links: value
                                        }
                                    )
                                }
                            />

                            <TypographyEditor
                                title="Copyright"
                                value={
                                    page.footer_config?.typography?.copy
                                }
                                onChange={(value) =>
                                    updateFooterConfig(
                                        "typography",
                                        {
                                            ...(page.footer_config?.typography || {}),
                                            copy: value
                                        }
                                    )
                                }
                            />
                        </div>

                        <div className="qr_page_actions mt">

                            <button
                                type="button"
                                className="qr_page_btn success"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                Guardar cambios
                            </button>

                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                onClick={loadQRPage}
                            >
                                Deshacer
                            </button>

                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                onClick={() =>
                                    updatePageField(
                                        "footer_config",
                                        {
                                            showFooter: true,
                                            showBusinessName: true,
                                            showDescription: true,
                                            showContact: true,
                                            showSocialLinks: true,
                                            showCopyright: true,
                                            alignment: "center",
                                            backgroundColor: "#111827",
                                            textColor: "#ffffff",
                                            text: "",
                                            typography: {
                                                title: {
                                                    fontSize: "22px",
                                                    fontWeight: "700"
                                                },
                                                text: {
                                                    fontSize: "15px",
                                                    fontWeight: "400"
                                                },
                                                links: {
                                                    fontSize: "15px",
                                                    fontWeight: "500"
                                                },
                                                copy: {
                                                    fontSize: "13px",
                                                    fontWeight: "400"
                                                }
                                            }
                                        }
                                    )
                                }
                            >
                                Cargar default
                            </button>

                        </div>
                    </div>
                )
            }
            {
                activeTab === "styles" && (
                    <div className="qr_page_card">

                        <h3 className="mt-2 mb-5">Estilos Generales de la Página</h3>

                        <div className="qr_page_grid">
                            <div className="qr_page_field">
                                <label>Color de fondo</label>
                                <input
                                    className="qr_page_input qr_page_color"
                                    type="color"
                                    value={
                                        page.global_styles?.backgroundColor ||
                                        "#ffffff"
                                    }
                                    onChange={(e) =>
                                        updateGlobalStyle(
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
                                        page.global_styles?.textColor ||
                                        "#111827"
                                    }
                                    onChange={(e) =>
                                        updateGlobalStyle(
                                            "textColor",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Color principal</label>
                                <input
                                    className="qr_page_input qr_page_color"
                                    type="color"
                                    value={
                                        page.global_styles?.primaryColor ||
                                        "#111827"
                                    }
                                    onChange={(e) =>
                                        updateGlobalStyle(
                                            "primaryColor",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Color secundario</label>
                                <input
                                    className="qr_page_input qr_page_color"
                                    type="color"
                                    value={
                                        page.global_styles?.secondaryColor ||
                                        "#f3f4f6"
                                    }
                                    onChange={(e) =>
                                        updateGlobalStyle(
                                            "secondaryColor",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            {/* <div className="qr_page_field">
                                <label>Tipografía</label>
                                <select
                                    className="qr_page_select"
                                    value={
                                        page.global_styles?.fontFamily ||
                                        "Arial"
                                    }
                                    onChange={(e) =>
                                        updateGlobalStyle(
                                            "fontFamily",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="Arial">
                                        Arial
                                    </option>
                                    <option value="Inter">
                                        Inter
                                    </option>
                                    <option value="Georgia">
                                        Georgia
                                    </option>
                                    <option value="Verdana">
                                        Verdana
                                    </option>
                                </select>
                            </div> */}

                            <div className="qr_page_field">
                                <label>Radio de bordes</label>
                                <input
                                    className="qr_page_input"
                                    value={
                                        page.global_styles?.borderRadius ||
                                        "14px"
                                    }
                                    onChange={(e) =>
                                        updateGlobalStyle(
                                            "borderRadius",
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
                                            page.global_styles?.showFloatingWhatsapp !== false
                                        }
                                        onChange={(e) =>
                                            updateGlobalStyle(
                                                "showFloatingWhatsapp",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar WhatsApp flotante
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            page.global_styles?.showBackToTop !== false
                                        }
                                        onChange={(e) =>
                                            updateGlobalStyle(
                                                "showBackToTop",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar botón volver arriba
                                </label>
                            </div>




                        </div>
                        <TabSaveBar />
                    </div>
                )
            }

            {
                activeTab === "seo" && (

                    <div className="qr_page_card">
                        <div className="qr_page_info_box">

                            Esta configuración ayuda a Google y otros buscadores a entender tu página.

                            Los cambios realizados aquí no modifican el diseño visual.

                        </div>
                        <div className="qr_page_grid">

                            <div className="qr_page_field full">

                                <label>
                                    Tipo de negocio para Google
                                </label>

                                <select
                                    className="qr_page_select"
                                    value={page.schema_type || "auto"}
                                    onChange={(e) =>
                                        updatePageField(
                                            "schema_type",
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="auto">
                                        Automático
                                    </option>

                                    <option value="organization">
                                        Organización / Empresa
                                    </option>

                                    <option value="local_business">
                                        Negocio Local
                                    </option>

                                    <option value="person">
                                        Persona / Profesional
                                    </option>

                                    <option value="professional_service">
                                        Servicios Profesionales
                                    </option>

                                    <option value="store">
                                        Tienda
                                    </option>

                                    <option value="restaurant">
                                        Restaurante
                                    </option>

                                    <option value="hotel">
                                        Hotel / Alojamiento
                                    </option>

                                    <option value="gym">
                                        Gimnasio
                                    </option>

                                    <option value="real_estate_agent">
                                        Inmobiliaria
                                    </option>

                                    <option value="auto_dealer">
                                        Agencia de Autos
                                    </option>

                                    <option value="product_catalog">
                                        Catálogo de Productos
                                    </option>

                                    <option value="service_catalog">
                                        Catálogo de Servicios
                                    </option>
                                </select>

                            </div>

                            <div className="qr_page_field full">
                                <label>Título SEO </label>
                                <input
                                    className="qr_page_input"
                                    value={page.seo_title || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "seo_title",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field full">
                                <label>Descripción SEO</label>
                                <textarea
                                    className="qr_page_textarea"
                                    value={page.seo_description || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "seo_description",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field full">
                                <label>Keywords (claves)</label>
                                <input
                                    className="qr_page_input"
                                    value={page.seo_keywords || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "seo_keywords",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Imagen SEO</label>

                                <MediaUploader
                                    businessId={businessId}
                                    value={page.seo_image_url || ""}
                                    folder="seo"
                                    accept="image/*"
                                    label="Subir imagen SEO"
                                    onChange={(media) => {

                                        updatePageField(
                                            "seo_image_url",
                                            media?.url || null
                                        );

                                        updatePageField(
                                            "seo_image_og_url",
                                            media?.og_url || media?.jpg_url || media?.png_url || null
                                        );
                                    }}
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Canonical URL</label>
                                <input
                                    className="qr_page_input"
                                    value={page.canonical_url || ""}
                                    onChange={(e) =>
                                        updatePageField(
                                            "canonical_url",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={!!page.robots_index}
                                        onChange={(e) =>
                                            updatePageField(
                                                "robots_index",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Indexar en buscadores
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={!!page.robots_follow}
                                        onChange={(e) =>
                                            updatePageField(
                                                "robots_follow",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Seguir enlaces
                                </label>
                            </div>

                        </div>

                        <TabSaveBar />
                    </div>
                )
            }
            {
                activeTab === "builder" && (
                    <QRPageSectionsManager
                        businessId={businessId}
                        pageId={page.id}
                        sections={qrPage.sections || []}
                        products={qrPage.products || []}
                        onReload={loadQRPage}
                    />
                )
            }
            {
                activeTab === "preview" && (
                    <div className="qr_page_preview_shell">
                        <QRPageRenderer
                            page={page}
                            sections={qrPage.sections || []}
                            products={qrPage.products || []}
                            preview={true}
                        />
                    </div>
                )
            }
            {
                activeTab === "templates" && (
                    <QRPageTemplatesManager
                        businessId={businessId}
                        pageId={page.id}
                        onReload={loadQRPage}
                        onApplied={() => setActiveTab("builder")}
                    />
                )
            }
            {
                activeTab === "products" && (
                    <QRPageProductsManager
                        businessId={businessId}
                        pageId={page.id}
                        products={qrPage.products || []}
                        onReload={loadQRPage}
                    />
                )
            }
        </div>

    );
}
