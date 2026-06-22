// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store
// Descripción: Builder de administración de Tags Tienda.
// =====================================

"use client";

import "@/app/styles/tags_store_admin.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";
import MediaUploader from "@/app/components/MediaUploader";



import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

const emptyStore = {
    id: null,
    business_id: null,
    page_id: null,

    slug: "",
    name: "",
    description: "",

    logo_url: "",
    cover_url: "",

    whatsapp: "",
    email: "",
    address: "",

    currency: "ARS",
    status: "draft",

    seo_title: "",
    seo_description: "",

    settings_json: {},
    styles_json: {}
};

function createSlug(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

export default function StoreAdminClient({
    businessId,
    session,
    isAdmin
}) {


    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [store, setStore] = useState(null);
    const [form, setForm] = useState(emptyStore);

    const [activeTab, setActiveTab] = useState("general");
    const [mobileGroup, setMobileGroup] = useState(0);

    const [themes, setThemes] =
        useState([]);

    const [loadingThemes, setLoadingThemes] =
        useState(false);

    const tabGroups = [
        {
            title: "⚙️ Configuración",
            items: [
                ["general", "Información"],
                ["contact", "Contacto"]
            ]
        },
        {
            title: "🎨 Diseño",
            items: [
                ["styles", "Apariencia"]
            ]
        },
        {
            title: "🛍️ Tienda",
            items: [
                ["catalog", "Catálogo"],
                ["orders", "Pedidos"],
                ["shipping", "Envíos"],
                ["payments", "Pagos"]
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

    useEffect(() => {
        loadStore();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId]);

    useEffect(() => {
        const index =
            tabGroups.findIndex(group =>
                group.items.some(([key]) =>
                    key === activeTab
                )
            );

        if (index >= 0) {
            setMobileGroup(index);
        }
    }, [activeTab]);
    useEffect(() => {
        loadThemes();
    }, []);

    async function loadStore() {
        setLoading(true);

        try {
            const res =
                await fetch(
                    `/api/store/admin/get?businessId=${businessId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "Error cargando Tags Tienda"
                );
            }

            const loadedStore =
                data.store || null;

            setStore(loadedStore);

            if (loadedStore) {
                setForm({
                    ...emptyStore,
                    ...loadedStore,
                    settings_json:
                        loadedStore.settings_json || {},
                    styles_json:
                        loadedStore.styles_json || {}
                });
            } else {
                setForm({
                    ...emptyStore,
                    business_id: businessId
                });
            }

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

    function updateFormField(field, value) {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    }

    function updateStyleField(field, value) {
        setForm(prev => ({
            ...prev,
            styles_json: {
                ...(prev.styles_json || {}),
                [field]: value
            }
        }));
    }

    function updateSettingField(field, value) {
        setForm(prev => ({
            ...prev,
            settings_json: {
                ...(prev.settings_json || {}),
                [field]: value
            }
        }));
    }

    function handleNameChange(value) {
        setForm(prev => ({
            ...prev,
            name: value,
            slug: prev.id
                ? prev.slug
                : createSlug(value)
        }));
    }

    async function handleSave(options = {}) {
        if (!form.name) {
            showAlert({
                title: "Nombre requerido",
                text: "Ingresá el nombre de la tienda.",
                icon: "error"
            });

            return;
        }

        if (!form.slug) {
            showAlert({
                title: "URL requerida",
                text: "Ingresá la URL pública de la tienda.",
                icon: "error"
            });

            return;
        }

        setSaving(true);

        try {
            const res =
                await fetch(
                    "/api/store/admin/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            storeId: form.id,

                            name: form.name,
                            slug: form.slug,
                            description: form.description,

                            logo_url: form.logo_url,
                            cover_url: form.cover_url,

                            whatsapp: form.whatsapp,
                            email: form.email,
                            address: form.address,

                            currency: form.currency,
                            status: options.overrideStatus || form.status,

                            seo_title: form.seo_title,
                            seo_description: form.seo_description,

                            settings_json:
                                form.settings_json || {},

                            styles_json:
                                form.styles_json || {}
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Error guardando Tags Tienda"
                );
            }

            showAlert({
                type: "success",
                title: "Guardado",
                text: data.message || "Tienda guardada correctamente"
            });

            if (options.overrideStatus) {
                updateFormField("status", options.overrideStatus);
            }

            await loadStore();

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

    async function handlePublish(nextStatus) {
        await handleSave({
            overrideStatus: nextStatus
        });
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

    function changeMobileGroup(index) {
        setMobileGroup(index);

        const firstTab =
            tabGroups[index]?.items?.[0]?.[0];

        if (firstTab) {
            setActiveTab(firstTab);
        }
    }

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
                            Number(e.target.value)
                        )
                    }
                >
                    {tabGroups.map((group, index) => (
                        <option
                            key={group.title}
                            value={index}
                        >
                            {group.title}
                        </option>
                    ))}
                </select>

                <div className="qr_page_mobile_buttons">
                    {group.items.map(([key, label]) =>
                        renderTabButton(key, label)
                    )}
                </div>

            </div>
        );
    }

    function TabSaveBar() {
        return (
            <div className="qr_page_tab_savebar mt-4">
                <button
                    type="button"
                    className="primary tags_btn py-3 px-2"
                    style={{
                        fontWeight: "500"
                    }}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {
                        saving
                            ? "Guardando..."
                            : "Guardar cambios"
                    }
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    const publicUrl =
        form.slug
            ? `/p/${form.slug}`
            : "#";

    async function loadThemes() {
        setLoadingThemes(true);

        try {
            const res =
                await fetch(
                    "/api/store/admin/themes/list",
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudieron cargar los themes"
                );
            }

            setThemes(data.themes || []);

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setLoadingThemes(false);
        }
    }

    function applyTheme(theme) {
        setForm(prev => ({
            ...prev,

            settings_json: {
                ...(prev.settings_json || {}),
                themeId: theme.id,
                themeCode: theme.code
            },

            styles_json: {
                ...(prev.styles_json || {}),
                ...(theme.storeStyles || {})
            }
        }));
    }


    /*  UI */

    return (
        <div className="qr_page_builder">

            <div className="qr_page_header">

                <div>
                    <h1 className="qr_page_title store_admin_title">
                        <span className="store_admin_title_icon">
                            🛍️
                        </span>

                        <span>
                            Tags Tienda
                        </span>
                    </h1>

                    <p className="qr_page_subtitle">
                        Tienda online profesional conectada a QR.
                    </p>
                </div>

                <div className="qr_page_actions">

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}`
                            )
                        }
                    >
                        Volver
                    </button>

                    <a
                        href={publicUrl}
                        target="_blank"
                        className="qr_page_btn secondary"
                    >
                        Ver tienda
                    </a>

                    {
                        form.status === "published"
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
                        form.status === "published"
                            ? "Publicada"
                            : form.status === "disabled"
                                ? "Deshabilitada"
                                : "Borrador"
                    }
                </strong>
            </div>

            <div className="qr_page_navigation">

                <div className="qr_page_tabs_desktop mb-3">
                    {tabGroups.map(group => (
                        <div
                            key={group.title}
                            className="qr_page_tab_group"
                        >
                            <div className="qr_page_tab_group_title">
                                {group.title}
                            </div>

                            {group.items.map(([key, label]) =>
                                renderTabButton(key, label)
                            )}
                        </div>
                    ))}
                </div>

                {renderMobileTabs()}

            </div>

            {
                activeTab === "general" && (
                    <div className="qr_page_card">

                        <div className="qr_page_grid">

                            <div className="qr_page_field">
                                <label>Nombre de la tienda</label>

                                <small className="qr_page_help">
                                    Es el nombre principal que verán tus clientes.
                                </small>

                                <input
                                    className="qr_page_input"
                                    value={form.name || ""}
                                    onChange={(e) =>
                                        handleNameChange(e.target.value)
                                    }
                                    placeholder="Ej: Tienda Los Reartes"
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Dirección web</label>

                                <input
                                    className="qr_page_input"
                                    value={form.slug || ""}
                                    readOnly={!!form.id}
                                    onChange={(e) =>
                                        updateFormField(
                                            "slug",
                                            createSlug(e.target.value)
                                        )
                                    }
                                    placeholder="mi-tienda"
                                />

                                <small className="qr_page_help">
                                    La tienda se verá en /p/{form.slug || "mi-tienda"}.
                                    Una vez creada, no conviene modificar esta URL.
                                </small>
                            </div>

                            <div className="qr_page_field full">
                                <label>Descripción</label>

                                <small className="qr_page_help">
                                    Contá qué vende la tienda, qué la diferencia y cómo comprar.
                                </small>

                                <textarea
                                    className="qr_page_textarea"
                                    value={form.description || ""}
                                    onChange={(e) =>
                                        updateFormField(
                                            "description",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Logo</label>

                                <small className="qr_page_help">
                                    Se mostrará en el encabezado de la tienda.
                                </small>

                                <MediaUploader
                                    businessId={businessId}
                                    value={form.logo_url || ""}
                                    folder="store/logo"
                                    accept="image/*"
                                    label="Subir logo"
                                    onChange={(media) =>
                                        updateFormField(
                                            "logo_url",
                                            media?.url || null
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Imagen de portada</label>

                                <small className="qr_page_help">
                                    Se mostrará como imagen principal de la tienda.
                                </small>

                                <MediaUploader
                                    businessId={businessId}
                                    value={form.cover_url || ""}
                                    folder="store/cover"
                                    accept="image/*"
                                    label="Subir portada"
                                    onChange={(media) =>
                                        updateFormField(
                                            "cover_url",
                                            media?.url || null
                                        )
                                    }
                                />
                            </div>
                            {/* permitir o No Stock Negativo */}
                            <label className="qr_page_checkbox">
                                <input
                                    type="checkbox"
                                    checked={form.settings_json?.allowNegativeStock === true}
                                    onChange={(e) =>
                                        updateSettingField(
                                            "allowNegativeStock",
                                            e.target.checked
                                        )
                                    }
                                />

                                Permitir vender aunque no haya stock
                            </label>

                            <div className="qr_page_field">
                                <label>Moneda</label>

                                <select
                                    className="qr_page_select"
                                    value={form.currency || "ARS"}
                                    onChange={(e) =>
                                        updateFormField(
                                            "currency",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="ARS">ARS</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>

                            <div className="qr_page_field">
                                <label>Estado</label>

                                <select
                                    className="qr_page_select"
                                    value={form.status || "draft"}
                                    onChange={(e) =>
                                        updateFormField(
                                            "status",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="draft">
                                        Borrador
                                    </option>

                                    <option value="published">
                                        Publicada
                                    </option>

                                    <option value="disabled">
                                        Deshabilitada
                                    </option>
                                </select>
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
                                    value={form.whatsapp || ""}
                                    onChange={(e) =>
                                        updateFormField(
                                            "whatsapp",
                                            e.target.value
                                        )
                                    }
                                />

                                <small className="qr_page_help">
                                    Número donde llegarán los pedidos.
                                </small>
                            </div>

                            <div className="qr_page_field">
                                <label>Email</label>

                                <input
                                    className="qr_page_input"
                                    value={form.email || ""}
                                    onChange={(e) =>
                                        updateFormField(
                                            "email",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field full">
                                <label>Dirección</label>

                                <textarea
                                    className="qr_page_textarea"
                                    value={form.address || ""}
                                    onChange={(e) =>
                                        updateFormField(
                                            "address",
                                            e.target.value
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
                activeTab === "styles" && (
                    <div className="qr_page_card">

                        <h3 className="mt-2 mb-2">
                            Apariencia de la tienda
                        </h3>

                        <p className="qr_page_subtitle mb-4">
                            Elegí una plantilla visual para aplicar colores, fondos, bordes y sombras de forma consistente.
                        </p>

                        <div className="store_theme_scroller">

                            {loadingThemes && (
                                <div className="qr_page_info_box">
                                    Cargando themes...
                                </div>
                            )}

                            {!loadingThemes && themes.map(theme => {
                                const selected =
                                    Number(form.settings_json?.themeId) === Number(theme.id);

                                const styles =
                                    theme.storeStyles || {};

                                return (
                                    <button
                                        key={theme.id}
                                        type="button"
                                        className={
                                            selected
                                                ? "store_theme_card selected"
                                                : "store_theme_card"
                                        }
                                        onClick={() =>
                                            applyTheme(theme)
                                        }
                                        style={{
                                            "--theme-bg": styles.backgroundColor || "#f8fafc",
                                            "--theme-surface": styles.surfaceColor || "#ffffff",
                                            "--theme-text": styles.textColor || "#111827",
                                            "--theme-muted": styles.mutedColor || "#64748b",
                                            "--theme-border": styles.borderColor || "#e5e7eb",
                                            "--theme-primary": styles.primaryColor || "#16a34a"
                                        }}
                                    >
                                        <span className="store_theme_preview">
                                            <span />
                                            <span />
                                            <span />
                                        </span>

                                        <strong>
                                            {theme.name}
                                        </strong>

                                        <small>
                                            {theme.description || theme.code}
                                        </small>
                                    </button>
                                );
                            })}

                        </div>

                        <div className="qr_page_grid mt-4">

                            <div className="qr_page_field">
                                <label>Radio de bordes</label>

                                <input
                                    className="qr_page_input"
                                    value={
                                        form.styles_json?.borderRadius ||
                                        "18px"
                                    }
                                    onChange={(e) =>
                                        updateStyleField(
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
                                            form.settings_json?.showSearch !== false
                                        }
                                        onChange={(e) =>
                                            updateSettingField(
                                                "showSearch",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar buscador
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            form.settings_json?.showCategories !== false
                                        }
                                        onChange={(e) =>
                                            updateSettingField(
                                                "showCategories",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar categorías
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            form.settings_json?.showWhatsappButton !== false
                                        }
                                        onChange={(e) =>
                                            updateSettingField(
                                                "showWhatsappButton",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Mostrar botón WhatsApp
                                </label>
                            </div>

                        </div>

                        <TabSaveBar />

                    </div>
                )
            }

            {
                activeTab === "catalog" && (
                    <div className="qr_page_card">

                        <h2>Catálogo</h2>

                        <p className="qr_page_help">
                            Administrá categorías, productos, variantes, precios e imágenes.
                        </p>

                        <div className="qr_page_actions mt-4">

                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                disabled={!form.id}
                                onClick={() =>
                                    router.push(
                                        `/dashboard/businesses/${businessId}/store/categories`
                                    )
                                }
                            >
                                Categorías
                            </button>

                            <button
                                type="button"
                                className="qr_page_btn success"
                                disabled={!form.id}
                                onClick={() =>
                                    router.push(
                                        `/dashboard/businesses/${businessId}/store/products`
                                    )
                                }
                            >
                                Productos
                            </button>

                        </div>

                        {!form.id && (
                            <div className="qr_page_info_box mt-4">
                                Primero guardá la tienda para poder cargar productos.
                            </div>
                        )}

                    </div>
                )
            }

            {
                activeTab === "orders" && (
                    <div className="qr_page_card">

                        <h2>Pedidos</h2>

                        <p className="qr_page_help">
                            Gestioná pedidos generados desde WhatsApp o checkout.
                        </p>

                        <div className="qr_page_actions mt-4">
                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                disabled={!form.id}
                                onClick={() =>
                                    router.push(
                                        `/dashboard/businesses/${businessId}/store/orders`
                                    )
                                }
                            >
                                Ver pedidos
                            </button>
                        </div>

                        {!form.id && (
                            <div className="qr_page_info_box mt-4">
                                Primero guardá la tienda para poder recibir pedidos.
                            </div>
                        )}

                    </div>
                )
            }

            {
                activeTab === "shipping" && (
                    <div className="qr_page_card">

                        <h2>Envíos</h2>

                        <p className="qr_page_help">
                            Configurá transportistas, métodos de entrega, costos, tracking y logística.
                        </p>

                        <div className="qr_page_actions mt-4">
                            <button
                                type="button"
                                className="qr_page_btn secondary"
                                disabled={!form.id}
                                onClick={() =>
                                    router.push(
                                        `/dashboard/businesses/${businessId}/store/shipping`
                                    )
                                }
                            >
                                Administrar envíos
                            </button>
                        </div>

                        {!form.id && (
                            <div className="qr_page_info_box mt-4">
                                Primero guardá la tienda para poder configurar envíos.
                            </div>
                        )}

                    </div>
                )
            }

            {
                activeTab === "payments" && (
                    <div className="qr_page_card">

                        <h2>Pagos</h2>

                        <p className="qr_page_help">
                            Configurá Mercado Pago, transferencia bancaria y efectivo o pago a convenir.
                        </p>

                        <div className="qr_page_actions mt-4">
                            <button
                                type="button"
                                className="qr_page_btn success"
                                disabled={!form.id}
                                onClick={() =>
                                    router.push(
                                        `/dashboard/businesses/${businessId}/store/payments`
                                    )
                                }
                            >
                                Administrar pagos
                            </button>
                        </div>

                        {!form.id && (
                            <div className="qr_page_info_box mt-4">
                                Primero guardá la tienda para poder configurar pagos.
                            </div>
                        )}

                    </div>
                )
            }

            {
                activeTab === "preview" && (
                    <div className="qr_page_card">

                        <h2>Vista previa</h2>

                        <div
                            className="qr_page_preview_shell"
                            style={{
                                background:
                                    form.styles_json?.backgroundColor || "#ffffff",
                                color:
                                    form.styles_json?.textColor || "#111827",
                                borderRadius:
                                    form.styles_json?.borderRadius || "18px",
                                overflow: "hidden"
                            }}
                        >
                            {form.cover_url && (
                                <img
                                    src={form.cover_url}
                                    alt=""
                                    style={{
                                        width: "100%",
                                        maxHeight: 260,
                                        objectFit: "cover"
                                    }}
                                />
                            )}

                            <div
                                style={{
                                    padding: 24
                                }}
                            >
                                {form.logo_url && (
                                    <img
                                        src={form.logo_url}
                                        alt=""
                                        style={{
                                            width: 86,
                                            height: 86,
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                            marginBottom: 16
                                        }}
                                    />
                                )}

                                <h1>
                                    {form.name || "Nombre de la tienda"}
                                </h1>

                                <p>
                                    {form.description || "Descripción de la tienda."}
                                </p>

                                <button
                                    type="button"
                                    className="qr_page_btn success"
                                >
                                    Ver productos
                                </button>
                            </div>
                        </div>

                    </div>
                )
            }

            {
                activeTab === "seo" && (
                    <div className="qr_page_card">

                        <div className="qr_page_info_box">
                            Esta configuración ayuda a Google y otros buscadores a entender la tienda.
                        </div>

                        <div className="qr_page_grid">

                            <div className="qr_page_field full">
                                <label>Título SEO</label>

                                <input
                                    className="qr_page_input"
                                    value={form.seo_title || ""}
                                    onChange={(e) =>
                                        updateFormField(
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
                                    value={form.seo_description || ""}
                                    onChange={(e) =>
                                        updateFormField(
                                            "seo_description",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                        </div>

                        <TabSaveBar />

                    </div>
                )
            }

        </div>
    );
}