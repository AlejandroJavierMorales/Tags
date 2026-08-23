// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store
// Descripción: Builder de administración de Tags Tienda.
// =====================================

"use client";

import "@/app/styles/tags_store_admin.css";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";
import MediaUploader from "@/app/components/MediaUploader";
import AiChatSurfaceSettings from "@/app/modules/ai-chat/components/admin/AiChatSurfaceSettings";

import StoreCouponsTab
    from "@/app/modules/store/components/admin/StoreCouponsTab";
import StoreSectionsManager
    from "@/app/modules/store/components/admin/builder/StoreSectionsManager";

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
    const searchParams =
        useSearchParams();

    const initialTab =
        searchParams.get("tab");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [store, setStore] = useState(null);
    const [form, setForm] = useState(emptyStore);

    const [sections, setSections] =
        useState([]);

    const [blocks, setBlocks] =
        useState([]);

    const [activeTab, setActiveTab] =
        useState(initialTab || "general");
    const [mobileGroup, setMobileGroup] = useState(0);

    const [themes, setThemes] =
        useState([]);

    const [loadingThemes, setLoadingThemes] =
        useState(false);

    const tabGroups = [
        {
            title: "⚙️ General",
            items: [
                ["general", "Información", "ready"],
                ["contact", "Contacto", "ready"],
                ["chatbot", "Chatbot con IA", "ready"]
            ]
        },
        {
            title: "🎨 Diseño",
            items: [
                ["styles", "Apariencia", "ready"],
                ["builder", "Constructor", "ready"]
            ]
        },
        {
            title: "📦 Catálogo",
            items: [
                ["products", "Productos", "ready"],
                ["categories", "Categorías", "ready"],
                ["coupons", "Cupones", "ready"]
            ]
        },
        {
            title: "📊 Inventario",
            items: [
                ["stock", "Resumen de stock", "ready"],
                ["inventory", "Actualización de inventario", "ready"],
                ["retained", "Productos retenidos", "ready"],
                ["stockMovements", "Movimientos", "soon"]
            ]
        },
        {
            title: "🧾 Pedidos",
            items: [
                ["orders", "Pedidos", "ready"],
                ["productReviews", "Reseñas de productos", "ready"],
                ["orderTracking", "Seguimiento", "ready"],
                ["abandonedOrders", "Pedidos abandonados", "ready"],
                ["customers", "Clientes", "soon"]
            ]
        },
        {
            title: "🚚 Envíos",
            items: [
                ["shipping", "Métodos y transportistas", "ready"],
                ["shippingQuotes", "Cotización en tiempo real", "soon"]
            ]
        },
        {
            title: "💳 Pagos",
            items: [
                ["payments", "Mercado Pago y transferencia", "ready"],
                ["billing", "Facturación", "soon"]
            ]
        },
        {
            title: "🔎 SEO",
            items: [
                ["seo", "Google y buscadores", "ready"]
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

            setSections(data.sections || []);

            setBlocks(data.blocks || []);

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
                            logo_storage_path: form.logo_storage_path,
                            logo_og_storage_path: form.logo_og_storage_path,

                            cover_url: form.cover_url,
                            cover_storage_path: form.cover_storage_path,
                            cover_og_storage_path: form.cover_og_storage_path,

                            whatsapp: form.whatsapp,
                            email: form.email,
                            address: form.address,

                            currency: form.currency,
                            status: options.overrideStatus || form.status,

                            seo_title: form.seo_title,
                            seo_description: form.seo_description,

                            settings_json: form.settings_json || {},
                            styles_json: form.styles_json || {}
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

    function getStoreRoute(key) {
        const routes = {
            products:
                `/dashboard/businesses/${businessId}/store/products?from=products`,
            categories:
                `/dashboard/businesses/${businessId}/store/categories?from=categories`,
            stock:
                `/dashboard/businesses/${businessId}/store/stock?from=stock`,
            inventory:
                `/dashboard/businesses/${businessId}/store/inventory?from=inventory`,
            retained:
                `/dashboard/businesses/${businessId}/store/stock?from=retained`,
            orders:
                `/dashboard/businesses/${businessId}/store/orders?from=orders`,
            abandonedOrders:
                `/dashboard/businesses/${businessId}/store/stock?from=abandonedOrders`,
            shipping:
                `/dashboard/businesses/${businessId}/store/shipping?from=shipping`,
            payments:
                `/dashboard/businesses/${businessId}/store/payments?from=payments`,
            coupons:
                `/dashboard/businesses/${businessId}/store/coupons?from=coupons`,
            productReviews:
                `/dashboard/businesses/${businessId}/store/product-reviews?from=productReviews`,
        };

        if (key === "orderTracking") {
            return form.slug
                ? `/p/${form.slug}/orders/track`
                : null;
        }

        return routes[key] || null;
    }

    function isInternalStoreTab(key) {
        return [
            "general",
            "contact",
            "styles",
            "builder",
            "seo"
        ].includes(key);
    }

    function handleStoreNavItem(key, label, status = "ready") {
        if (status === "soon") {
            showPendingFeature(label);
            return;
        }

        if (isInternalStoreTab(key)) {
            setActiveTab(key);
            return;
        }

        if (!form.id && key !== "orderTracking") {
            showAlert({
                title: "Primero guardá la tienda",
                text: "Para usar esta sección primero tenés que guardar la tienda.",
                icon: "info"
            });

            return;
        }

        const route =
            getStoreRoute(key);

        if (!route) {
            showAlert({
                title: "No disponible",
                text: "Esta sección todavía no tiene una ruta disponible.",
                icon: "info"
            });

            return;
        }

        router.push(route);
    }

    function renderTabButton(key, label, status = "ready") {
        const isSoon =
            status === "soon";

        const isInternal =
            isInternalStoreTab(key);

        return (
            <button
                key={key}
                type="button"
                onClick={() =>
                    handleStoreNavItem(
                        key,
                        label,
                        status
                    )
                }
                className={[
                    "qr_page_tab",
                    isInternal && activeTab === key ? "active" : "",
                    isSoon ? "store_admin_tab_soon" : ""
                ].filter(Boolean).join(" ")}
            >
                <span>
                    {label}
                </span>

                {
                    isSoon && (
                        <small className="store_admin_tab_badge">
                            Pendiente
                        </small>
                    )
                }
            </button>
        );
    }

    function changeMobileGroup(index) {
        setMobileGroup(index);

        const firstItem =
            tabGroups[index]?.items?.[0];

        if (!firstItem) {
            return;
        }

        const [key, label, status] =
            firstItem;

        if (status === "soon") {
            setActiveTab("");
            return;
        }

        if (isInternalStoreTab(key)) {
            setActiveTab(key);
            return;
        }

        setActiveTab("");
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
                    {group.items.map(([key, label, status]) =>
                        renderTabButton(key, label, status)
                    )}
                </div>

            </div>
        );
    }

    function showPendingFeature(label) {
        showAlert({
            title: "Funcionalidad pendiente",
            text: `${label} está planificado para una próxima etapa de Tags Tienda.`,
            icon: "info"
        });
    }

    function FeatureActionButton({
        label,
        description,
        status = "ready",
        variant = "secondary",
        disabled = false,
        onClick
    }) {
        const isSoon =
            status === "soon";

        return (
            <button
                type="button"
                className={[
                    "store_admin_feature_action",
                    variant,
                    isSoon ? "soon" : ""
                ].filter(Boolean).join(" ")}
                disabled={disabled && !isSoon}
                onClick={() => {
                    if (isSoon) {
                        showPendingFeature(label);
                        return;
                    }

                    if (onClick) {
                        onClick();
                    }
                }}
            >
                <strong>
                    {label}
                </strong>

                {
                    description && (
                        <small>
                            {description}
                        </small>
                    )
                }

                <span className="store_admin_feature_status">
                    {
                        isSoon
                            ? "Pendiente"
                            : "Disponible"
                    }
                </span>
            </button>
        );
    }

    function MissingStoreNotice({
        text = "Primero guardá la tienda para poder usar esta sección."
    }) {
        if (form.id) {
            return null;
        }

        return (
            <div className="qr_page_info_box mt-4">
                {text}
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

    async function applyTheme(theme) {

        if (!form.page_id) {
            showAlert({
                title: "Primero guardá la tienda",
                text: "Para aplicar un theme primero la tienda debe estar creada.",
                icon: "info"
            });

            return;
        }

        const confirm =
            await showAlert({
                title: "Aplicar theme",
                text: "Se aplicará este theme visual a la tienda.",
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
                            pageId: form.page_id,
                            themeId: theme.id
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo aplicar el theme"
                );
            }

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

            showAlert({
                title: "Theme aplicado",
                text: "El theme fue aplicado correctamente.",
                icon: "success"
            });

            await loadStore();

        } catch (err) {

            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        }

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

                    {/* <button
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
                    </button> */}

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

                            {group.items.map(([key, label, status]) =>
                                renderTabButton(key, label, status)
                            )}
                        </div>
                    ))}
                </div>

                {renderMobileTabs()}

            </div>
            {
                !activeTab && (
                    <div className="qr_page_card">
                        <div className="qr_page_info_box">
                            Elegí una opción de la sección seleccionada.
                        </div>
                    </div>
                )
            }

            {
                activeTab === "chatbot" && (
                    <AiChatSurfaceSettings businessId={businessId} surfaceType="store" surfaceId={form.id} surfaceLabel="la Tienda" />
                )
            }
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

                                <div className="qr_page_field">
                                    <label>Logo</label>

                                    <small className="qr_page_help">
                                        Se mostrará en el encabezado de la tienda.
                                    </small>

                                    <MediaUploader
                                        businessId={businessId}
                                        value={form.logo_url || ""}
                                        module="store"
                                        variant="logo"
                                        fileName="logo"
                                        replace
                                        previousStoragePath={form.logo_storage_path || ""}
                                        previousOgStoragePath={form.logo_og_storage_path || ""}
                                        accept="image/*"
                                        label="Subir logo"
                                        onChange={(media) => {

                                            updateFormField(
                                                "logo_url",
                                                media?.url || null
                                            );

                                            updateFormField(
                                                "logo_storage_path",
                                                media?.storagePath || null
                                            );

                                            updateFormField(
                                                "logo_og_storage_path",
                                                media?.ogStoragePath || null
                                            );

                                        }}
                                    />
                                </div>
                            </div>

                            <div className="qr_page_field">
                                <label>Imagen de portada</label>

                                <small className="qr_page_help">
                                    Se mostrará como imagen principal de la tienda.
                                </small>

                                <div className="qr_page_field">
                                    <label>Imagen de portada</label>

                                    <small className="qr_page_help">
                                        Se mostrará como imagen principal de la tienda.
                                    </small>

                                    <MediaUploader
                                        businessId={businessId}
                                        value={form.cover_url || ""}
                                        module="store"
                                        variant="hero"
                                        fileName="cover"
                                        replace
                                        previousStoragePath={form.cover_storage_path || ""}
                                        previousOgStoragePath={form.cover_og_storage_path || ""}
                                        accept="image/*"
                                        label="Subir portada"
                                        onChange={(media) => {

                                            updateFormField(
                                                "cover_url",
                                                media?.url || null
                                            );

                                            updateFormField(
                                                "cover_storage_path",
                                                media?.storagePath || null
                                            );

                                            updateFormField(
                                                "cover_og_storage_path",
                                                media?.ogStoragePath || null
                                            );

                                        }}
                                    />
                                </div>
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
                                <label>Catálogo: Productos por página</label>
                                <select
                                    className="qr_page_select"
                                    value={form.settings_json?.productsPerPage || 12}
                                    onChange={(e) =>
                                        updateSettingField(
                                            "productsPerPage",
                                            Number(e.target.value)
                                        )
                                    }
                                >
                                    <option value={12}>12 productos</option>
                                    <option value={24}>24 productos</option>
                                    <option value={36}>36 productos</option>
                                </select>
                            </div>

                            <div className="qr_page_field">
                                <label>Inventario: Stock mínimo para alerta</label>
                                <input
                                    className="qr_page_input"
                                    type="number"
                                    min="0"
                                    value={form.settings_json?.minStockAlert ?? 5}
                                    onChange={(e) =>
                                        updateSettingField(
                                            "minStockAlert",
                                            Number(e.target.value)
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Inventario: Horas para liberar stock retenido</label>
                                <select
                                    className="qr_page_select"
                                    value={form.settings_json?.stockHoldHours || 72}
                                    onChange={(e) =>
                                        updateSettingField(
                                            "stockHoldHours",
                                            Number(e.target.value)
                                        )
                                    }
                                >
                                    <option value={24}>24 horas</option>
                                    <option value={48}>48 horas</option>
                                    <option value={72}>72 horas</option>
                                    <option value={96}>96 horas</option>
                                    <option value={168}>7 días</option>
                                </select>

                                <small className="qr_page_help">
                                    Si un pedido queda pendiente de pago o confirmación, el stock retenido se libera automáticamente después de este tiempo.
                                </small>
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
            {/* Tab Builder */}
            {
                activeTab === "builder" && (
                    <>
                        <StoreSectionsManager
                            businessId={businessId}
                            store={form}
                            storeId={form.id}
                            sections={sections}
                            blocks={blocks}
                            onReload={loadStore}
                        />


                    </>
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

            {
                activeTab === "coupons" && (
                    <StoreCouponsTab
                        businessId={businessId}
                    />
                )
            }

            <style jsx global>{`
                .store_admin_feature_grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 14px;
                }

                .store_admin_feature_action {
                    border: 1px solid #d1d5db;
                    background: #ffffff;
                    color: #111827;
                    border-radius: 14px;
                    padding: 16px;
                    text-align: left;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    min-height: 118px;
                    transition: .2s;
                }

                .store_admin_feature_action:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 26px rgba(15,23,42,.08);
                }

                .store_admin_feature_action.success {
                    border-color: #bbf7d0;
                    background: #f0fdf4;
                }

                .store_admin_feature_action.secondary {
                    background: #ffffff;
                }

                .store_admin_feature_action.soon {
                    border-color: #fde68a;
                    background: #fffbeb;
                    color: #92400e;
                }

                .store_admin_feature_action small {
                    color: #64748b;
                    line-height: 1.35;
                }

                .store_admin_feature_action.soon small {
                    color: #92400e;
                }

                .store_admin_feature_status {
                    margin-top: auto;
                    font-size: .75rem;
                    font-weight: 700;
                    opacity: .8;
                }

                .store_admin_tab_soon {
                    border-color: #fde68a !important;
                    background: #fffbeb !important;
                    color: #92400e !important;
                }

                .store_admin_tab_badge {
                    display: block;
                    font-size: .68rem;
                    line-height: 1;
                    opacity: .85;
                    margin-top: 4px;
                }
            `}</style>

        </div>
    );
}
