// =====================================
// PAGE CLIENT: app/dashboard/businesses/[id]/portal/pageClient.js
// Descripción: Administra configuración básica del Portal Público.
// =====================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "../../../../modules/portal/styles/portalAdmin.css"
import "../../../../styles/qr-page.css"

import showAlert from "@/app/components/showAlert";

import "@/app/styles/tags_dashboard.css";
import "@/app/styles/tagsModals.css";
import TagsSpinner from "@/app/components/TagsSpinner";
import PortalHeaderEditor from "@/app/modules/portal/components/PortalHeaderEditor";
import PortalFooterEditor from "@/app/modules/portal/components/PortalFooterEditor";


export default function PortalAdminClient({
    businessId
}) {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [portal, setPortal] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [themes, setThemes] = useState([]);

    const [title, setTitle] = useState("");
    const [status, setStatus] = useState("draft");
    const [homeRouteId, setHomeRouteId] = useState("");

    const [description, setDescription] = useState("");
    const [logoUrl, setLogoUrl] = useState("");

    const [hideChildHeaders, setHideChildHeaders] = useState(true);
    const [hideChildFooters, setHideChildFooters] = useState(true);
    const [businessIdentity, setBusinessIdentity] = useState({});
    const [activeTab, setActiveTab] = useState("identity");
    const [headerConfig, setHeaderConfig] = useState({});
    const [footerConfig, setFooterConfig] = useState({});


    useEffect(() => {
        loadPortal();
        loadThemes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId]);

    function parseThemeTokens(theme) {
        try {
            return typeof theme?.css_tokens === "string"
                ? JSON.parse(theme.css_tokens)
                : theme?.css_tokens || {};
        } catch {
            return {};
        }
    }

    function getThemeTokensByCode(themeCode, themeRows = []) {
        const theme =
            themeRows.find(item =>
                item.code === themeCode
            );

        return parseThemeTokens(theme);
    }

    function getDefaultHeaderConfig(tokens = {}) {
        return {
            showLogo: true,
            showTitle: true,
            showSubtitle: false,
            showMenu: true,
            showWhatsapp: false,
            sticky: true,
            transparent: false,
            showCta: false,
            drawerPosition: "right",
            align: "left",
            height: "",
            maxWidth: "1180px",
            backgroundColor: tokens["--qr-surface"] || "#ffffff",
            textColor: tokens["--qr-text"] || "#111827",
            hoverColor: tokens["--qr-primary"] || "#0F9D58",
            buttonColor: tokens["--qr-primary"] || "#0F9D58",
            buttonTextColor: tokens["--qr-primary-text"] || "#ffffff",
            typography: {
                title: {
                    fontSize: "16px",
                    fontWeight: "900",
                    lineHeight: "1.1",
                    letterSpacing: "0px",
                    fontStyle: "normal",
                    textDecoration: "none",
                    textAlign: "left"
                },
                subtitle: {
                    fontSize: "12px",
                    fontWeight: "400",
                    lineHeight: "1.5",
                    letterSpacing: "0px",
                    fontStyle: "normal",
                    textDecoration: "none",
                    textAlign: "left"
                },
                menu: {
                    fontSize: "14px",
                    fontWeight: "700",
                    lineHeight: "1.5",
                    letterSpacing: "0px",
                    fontStyle: "normal",
                    textDecoration: "none",
                    textAlign: "left"
                }
            }
        };
    }

    function getDefaultFooterConfig(tokens = {}) {
        return {
            showLogo: true,
            showTitle: true,
            showDescription: true,
            showMenu: true,
            showSocials: true,
            showContact: true,
            showCopyright: true,
            showPoweredBy: true,
            showTopBorder: true,
            columns: "3",
            align: "left",
            logoPosition: "top",
            backgroundColor:
                tokens["--qr-footer-bg"] ||
                tokens["--qr-text"] ||
                "#183226",
            textColor:
                tokens["--qr-footer-text"] ||
                tokens["--qr-bg"] ||
                "#f4faf6",
            linkColor:
                tokens["--qr-footer-link"] ||
                tokens["--qr-primary"] ||
                "#7ee2a8",
            hoverColor: tokens["--qr-primary-hover"] || tokens["--qr-primary"] || "#0F9D58",
            typography: {
                title: {
                    fontSize: "16px",
                    fontWeight: "900",
                    lineHeight: "1.2",
                    letterSpacing: "0px",
                    fontStyle: "normal",
                    textDecoration: "none",
                    textAlign: "left"
                },
                text: {
                    fontSize: "14px",
                    fontWeight: "400",
                    lineHeight: "1.5",
                    letterSpacing: "0px",
                    fontStyle: "normal",
                    textDecoration: "none",
                    textAlign: "left"
                },
                copyright: {
                    fontSize: "13px",
                    fontWeight: "400",
                    lineHeight: "1.5",
                    letterSpacing: "0px",
                    fontStyle: "normal",
                    textDecoration: "none",
                    textAlign: "left"
                }
            }
        };
    }

    function mergePortalConfig(defaultConfig, savedConfig = {}) {
        return {
            ...defaultConfig,
            ...savedConfig,
            typography: {
                ...(defaultConfig.typography || {}),
                ...(savedConfig.typography || {})
            }
        };
    }

    async function loadPortal() {
        setLoading(true);

        try {
            const res = await fetch(
                `/api/portal/admin/get?businessId=${businessId}`
            );

            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudo cargar el Portal Público"
                );
            }

            const portalData = data.portal || null;
            const routeData = Array.isArray(data.routes)
                ? data.routes
                : [];

            setPortal(portalData);
            setRoutes(routeData);
            setBusinessIdentity(data.business || {});

            setTitle(portalData?.title || "");
            setStatus(portalData?.status || "draft");

            setDescription(portalData?.description || "");
            setLogoUrl(data.business?.logo_url || portalData?.logo_url || "");

            setHeaderConfig(portalData?.header_config || {});
            setFooterConfig(portalData?.footer_config || {});

            setHideChildHeaders(Number(portalData?.hide_child_headers) === 1);
            setHideChildFooters(Number(portalData?.hide_child_footers) === 1);

            const homeRoute = routeData.find(
                route => Number(route.is_home) === 1
            );

            setHomeRouteId(
                homeRoute?.id ? String(homeRoute.id) : ""
            );

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        } finally {
            setLoading(false);
        }
    }

    async function loadThemes() {

        try {

            const res =
                await fetch("/api/qr-page/themes/list");

            const data =
                await res.json().catch(() => null);

            const rows =
                Array.isArray(data?.themes)
                    ? data.themes
                    : Array.isArray(data?.data)
                        ? data.data
                        : [];

            setThemes(rows);

        } catch {

            setThemes([]);

        }

    }

    async function handleThemeSelect(theme) {
        const confirm = await showAlert({
            title: "Aplicar tema al Portal",
            text: `Se cambiará el tema de color a "${theme.name}" y se aplicará a todas las páginas del Portal para mantener el sitio homogéneo.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Aplicar tema",
            cancelButtonText: "Cancelar"
        });

        if (!confirm) {
            return;
        }

        setPortal(prev => ({
            ...prev,
            theme_id: theme.id,
            theme_code: theme.code
        }));

        const response = await fetch("/api/portal/admin/apply-theme", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                businessId,
                themeId: theme.id
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            showAlert({
                title: "No se pudo aplicar el tema",
                text: payload.error || "La configuraciÃ³n no pudo actualizarse.",
                icon: "error"
            });
            return;
        }

        await loadPortal();

        showAlert({
            title: "Tema aplicado",
            text: "El tema fue aplicado al Portal y a todas sus páginas.",
            icon: "success"
        });
    }

    async function savePortal() {
        setSaving(true);

        try {
            const res = await fetch(
                "/api/portal/admin/save",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        businessId,
                        title,
                        status,
                        homeRouteId: homeRouteId || null,
                        description,
                        logoUrl,
                        themeId: portal?.theme_id || null,
                        themeCode: portal?.theme_code || null,
                        hideChildHeaders,
                        hideChildFooters,
                        businessIdentity,
                        headerConfig,
                        footerConfig
                    })
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo guardar el Portal Público"
                );
            }

            showAlert({
                title: "Portal guardado",
                text: "Los cambios fueron guardados correctamente.",
                icon: "success"
            });

            loadPortal();

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

    if (loading) {
        return (
            <div className="tags_dashboard_page">
                <TagsSpinner />
            </div>
        );
    }

    async function resizeImageToWebp(file, minSide = 500, quality = 0.86) {
        const imageBitmap = await createImageBitmap(file);

        const { width, height } = imageBitmap;

        const minOriginalSide =
            Math.min(width, height);

        const scale =
            minOriginalSide > minSide
                ? minSide / minOriginalSide
                : 1;

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
            imageBitmap,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const blob = await new Promise((resolve) =>
            canvas.toBlob(
                resolve,
                "image/webp",
                quality
            )
        );

        return new File(
            [blob],
            "portal-logo.webp",
            {
                type: "image/webp"
            }
        );
    }

    async function uploadPortalLogo(file) {
        const optimizedFile =
            await resizeImageToWebp(file);

        const formData =
            new FormData();

        formData.append(
            "file",
            optimizedFile
        );

        formData.append(
            "folder",
            `portal/${businessId}/logo`
        );

        const res =
            await fetch(
                "/api/files/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(
                data.error ||
                "No se pudo subir el logo"
            );
        }

        setLogoUrl(
            data.file_url
        );
        setBusinessIdentity(prev => ({
            ...prev,
            logo_url: data.file_url
        }));
    }

    async function handleLogoChange(e) {

        const file =
            e.target.files?.[0];

        if (!file) {
            return;
        }

        try {

            await uploadPortalLogo(file);

            showAlert({
                title: "Logo cargado",
                text: "El logo fue cargado correctamente.",
                icon: "success"
            });

        } catch (err) {

            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        } finally {
            e.target.value = "";
        }
    }

    function updateBusinessIdentity(field, value) {
        setBusinessIdentity(prev => ({
            ...prev,
            [field]: value
        }));
    }

    async function toggleRouteNav(route) {
        await fetch("/api/portal/admin/routes/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                businessId,
                routeId: route.id,
                showInNav: Number(route.show_in_nav) === 1 ? 0 : 1
            })
        });

        await loadPortal();
    }

    const currentTheme =
        themes.find(theme =>
            theme.code === portal?.theme_code
        );

    let themeTokens = {};

    try {
        themeTokens =
            typeof currentTheme?.css_tokens === "string"
                ? JSON.parse(currentTheme.css_tokens)
                : currentTheme?.css_tokens || {};
    } catch {
        themeTokens = {};
    }

    /*  UI  */

    return (
        <div className="tags_dashboard_page">

            <div className="tags_dashboard_hero">
                <div>
                    <h1 className="tags_dashboard_title">
                        Portal Público
                    </h1>

                    <p className="tags_dashboard_subtitle">
                        Configuración general del sitio público unificado.
                    </p>
                </div>

                <button
                    type="button"
                    className="tags_dashboard_stats_btn"
                    onClick={() =>
                        router.push(`/dashboard/businesses/${businessId}`)
                    }
                >
                    Volver
                </button>
            </div>

            <div className="tags_portal_admin_tabs mt-4">
                <button
                    type="button"
                    className={activeTab === "identity" ? "active" : ""}
                    onClick={() => setActiveTab("identity")}
                >
                    Datos del cliente
                </button>

                <button
                    type="button"
                    className={activeTab === "appearance" ? "active" : ""}
                    onClick={() => setActiveTab("appearance")}
                >
                    Configuración
                </button>
                <button
                    type="button"
                    className={activeTab === "pages" ? "active" : ""}
                    onClick={() => setActiveTab("pages")}
                >
                    Páginas del Portal
                </button>
            </div>

            {activeTab === "identity" && (
                <>
                    {/* acá van logo + datos globales del cliente */}
                    <div className="tags_dashboard_client_card mt-4">

                        <div className="tags_modal_group">
                            <label className="tags_modal_label">
                                Título del Portal
                            </label>

                            <input
                                className="tags_modal_input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: Ingematec Argentina"
                            />
                        </div>

                        <div className="tags_modal_group mt-3">
                            <label className="tags_modal_label">
                                Descripción del Portal
                            </label>

                            <textarea
                                className="tags_modal_input"
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej: Aplicaciones, servicios y tienda online del negocio."
                            />
                        </div>

                        <div className="tags_modal_group mt-3">
                            <label className="tags_modal_label">
                                Logo del negocio
                            </label>

                            <div className="tags_portal_admin_logo_box">

                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt="Logo del negocio"
                                        className="tags_portal_admin_logo_preview"
                                    />
                                ) : (
                                    <div className="tags_portal_admin_logo_empty">
                                        Sin logo
                                    </div>
                                )}

                                <div className="tags_portal_admin_logo_actions">
                                    <label className="tags_btn rounded tags_text_normal">
                                        Subir logo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            hidden
                                            onChange={handleLogoChange}
                                        />
                                    </label>

                                    <p className="tags_portal_admin_logo_hint">
                                        Se optimiza a WebP. Solo se reduce si supera 500px en su lado menor.
                                    </p>
                                </div>

                            </div>
                            <div className="tags_portal_admin_card mt-4">
                                <div className="tags_portal_admin_card_header">
                                    <div>
                                        <h2>Datos globales del cliente</h2>
                                        <p>
                                            Esta información alimentará todas las páginas del Portal.
                                        </p>
                                    </div>
                                </div>

                                <div className="tags_portal_admin_grid_2">

                                    <div className="tags_modal_group">
                                        <label className="tags_modal_label">Nombre público</label>
                                        <input
                                            className="tags_modal_input"
                                            value={businessIdentity.display_name || ""}
                                            onChange={(e) =>
                                                updateBusinessIdentity("display_name", e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="tags_modal_group">
                                        <label className="tags_modal_label">Email</label>
                                        <input
                                            className="tags_modal_input"
                                            value={businessIdentity.email || ""}
                                            onChange={(e) =>
                                                updateBusinessIdentity("email", e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="tags_modal_group">
                                        <label className="tags_modal_label">Teléfono</label>
                                        <input
                                            className="tags_modal_input"
                                            value={businessIdentity.phone || ""}
                                            onChange={(e) =>
                                                updateBusinessIdentity("phone", e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="tags_modal_group">
                                        <label className="tags_modal_label">WhatsApp</label>
                                        <input
                                            className="tags_modal_input"
                                            value={businessIdentity.whatsapp || ""}
                                            onChange={(e) =>
                                                updateBusinessIdentity("whatsapp", e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="tags_modal_group full">
                                        <label className="tags_modal_label">Descripción</label>
                                        <textarea
                                            className="tags_modal_input"
                                            rows={3}
                                            value={businessIdentity.description || ""}
                                            onChange={(e) =>
                                                updateBusinessIdentity("description", e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="tags_modal_group full">
                                        <label className="tags_modal_label">Dirección</label>
                                        <input
                                            className="tags_modal_input"
                                            value={businessIdentity.address || ""}
                                            onChange={(e) =>
                                                updateBusinessIdentity("address", e.target.value)
                                            }
                                        />
                                    </div>

                                    {[
                                        ["website_url", "Sitio web"],
                                        ["instagram_url", "Instagram"],
                                        ["facebook_url", "Facebook"],
                                        ["tiktok_url", "TikTok"],
                                        ["youtube_url", "YouTube"],
                                        ["linkedin_url", "LinkedIn"],
                                        ["google_reviews_url", "Google Reviews"],
                                        ["maps_url", "Google Maps"]
                                    ].map(([field, label]) => (
                                        <div className="tags_modal_group" key={field}>
                                            <label className="tags_modal_label">{label}</label>
                                            <input
                                                className="tags_modal_input"
                                                value={businessIdentity[field] || ""}
                                                onChange={(e) =>
                                                    updateBusinessIdentity(field, e.target.value)
                                                }
                                            />
                                        </div>
                                    ))}

                                </div>
                            </div>
                        </div>



                        {/*  Guardar */}

                        <div className="tags_modal_actions mt-4">
                            <button
                                type="button"
                                className="tags_modal_btn tags_modal_btn_success"
                                disabled={saving}
                                onClick={savePortal}
                            >
                                {saving ? "Guardando..." : "Guardar Portal"}
                            </button>
                        </div>

                    </div>
                </>
            )}

            {activeTab === "appearance" && (
                <>
                    <div className="tags_portal_admin_card mt-4">
                        <div className="tags_portal_admin_card_header">
                            <div>
                                <h2>Configuración general del Portal</h2>
                                <p>
                                    Definí publicación, home y comportamiento de las páginas internas.
                                </p>
                            </div>
                        </div>


                        {/* REnder Público */}
                        <div className="tags_modal_group mt-3">
                            <label className="tags_modal_label">
                                Render público
                            </label>

                            <label className="d-flex gap-2 align-items-center">
                                <input
                                    type="checkbox"
                                    checked={hideChildHeaders}
                                    onChange={(e) => setHideChildHeaders(e.target.checked)}
                                />
                                Ocultar headers propios de páginas internas
                            </label>

                            <label className="d-flex gap-2 align-items-center mt-2">
                                <input
                                    type="checkbox"
                                    checked={hideChildFooters}
                                    onChange={(e) => setHideChildFooters(e.target.checked)}
                                />
                                Ocultar footers propios de páginas internas
                            </label>
                        </div>

                        <div className="tags_modal_group mt-3">
                            <label className="tags_modal_label">
                                Estado
                            </label>

                            <select
                                className="tags_modal_input"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="draft">Borrador</option>
                                <option value="published">Publicado</option>

                            </select>
                        </div>

                        <div className="tags_modal_group mt-3">
                            <label className="tags_modal_label">
                                Página principal
                            </label>

                            <select
                                className="tags_modal_input"
                                value={homeRouteId}
                                onChange={(e) => setHomeRouteId(e.target.value)}
                            >
                                <option value="">
                                    Sin definir
                                </option>

                                {routes.map((route) => (
                                    <option
                                        key={route.id}
                                        value={route.id}
                                    >
                                        {route.label || route.title || route.path || `Ruta ${route.id}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Themes */}
                    <div className="tags_modal_group mt-3">
                        <label className="tags_modal_label">
                            Tema visual
                        </label>

                        <div className="client_reviews_theme_scroller">
                            {themes.map((theme) => {
                                let tokens = {};

                                try {
                                    tokens =
                                        typeof theme.css_tokens === "string"
                                            ? JSON.parse(theme.css_tokens)
                                            : theme.css_tokens || {};
                                } catch {
                                    tokens = {};
                                }

                                const selected =
                                    String(portal?.theme_code || "") === String(theme.code || "");

                                return (
                                    <button
                                        key={theme.id}
                                        type="button"
                                        className={
                                            selected
                                                ? "client_reviews_theme_card selected"
                                                : "client_reviews_theme_card"
                                        }
                                        onClick={() => handleThemeSelect(theme)}
                                    >
                                        <div
                                            className="qr_page_theme_preview"
                                            style={{
                                                background:
                                                    tokens["--qr-bg"] || "#ffffff"
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
                    </div>
                    <button
                        type="button"
                        className="tags_modal_btn tags_modal_btn_secondary"
                        onClick={() => {
                            setHeaderConfig({});
                            setFooterConfig({});
                        }}
                    >
                        Restaurar apariencia del tema
                    </button>
                    {/*  */}
                    <div className="tags_modal_actions mt-4">
                        <button
                            type="button"
                            className="tags_modal_btn tags_modal_btn_secondary"
                            onClick={() => {
                                const tokens =
                                    getThemeTokensByCode(
                                        portal?.theme_code,
                                        themes
                                    );

                                setHeaderConfig(
                                    getDefaultHeaderConfig(tokens)
                                );

                                setFooterConfig(
                                    getDefaultFooterConfig(tokens)
                                );
                            }}
                        >
                            Cargar valores por defecto
                        </button>

                        <button
                            type="button"
                            className="tags_modal_btn tags_modal_btn_success"
                            disabled={saving}
                            onClick={savePortal}
                        >
                            {saving ? "Guardando..." : "Guardar configuración"}
                        </button>
                    </div>
                    {/* acá van tema + header + footer + render público */}
                    <PortalHeaderEditor
                        value={headerConfig}
                        themeTokens={themeTokens}
                        onChange={setHeaderConfig}
                    />

                    <PortalFooterEditor
                        value={footerConfig}
                        themeTokens={themeTokens}
                        onChange={setFooterConfig}
                    />
                </>
            )}
            {activeTab === "pages" && (
                <div className="tags_portal_section mt-4">

                    <div className="tags_portal_section_header">
                        <div>
                            <h2>Páginas del Portal</h2>
                            <p>
                                Definí qué páginas aparecen en la navegación pública del Portal.
                            </p>
                        </div>
                    </div>

                    <div className="tags_dashboard_table_card">
                        <div className="tags_dashboard_table_scroll">
                            <table className="tags_dashboard_table">
                                <thead>
                                    <tr>
                                        <th>Mostrar</th>
                                        <th>Nombre</th>
                                        <th>Ruta</th>
                                        <th>Tipo</th>
                                        <th>Home</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {routes.length > 0 ? (
                                        routes.map((route) => (
                                            <tr key={route.id}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={Number(route.show_in_nav) === 1}
                                                        onChange={() => toggleRouteNav(route)}
                                                    />
                                                </td>

                                                <td>
                                                    {route.label || route.title || "-"}
                                                </td>

                                                <td>
                                                    {route.path || route.slug || "-"}
                                                </td>

                                                <td>
                                                    {route.page_type || route.type || "-"}
                                                </td>

                                                <td>
                                                    {Number(route.is_home) === 1
                                                        ? "Sí"
                                                        : "-"}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5}>
                                                No hay rutas configuradas todavía.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
