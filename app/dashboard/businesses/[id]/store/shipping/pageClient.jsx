// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/shipping
// Descripción: Administra transportistas de Tags Tienda.
// =====================================

"use client";

import {
    useEffect,
    useState
} from "react";

import {
    useRouter
} from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/styles/tags_store_admin.css";

const defaultCarrierForm = {
    carrierId: null,
    name: "",
    code: "",
    type: "manual",
    logo_url: "",
    tracking_url_template: "",
    api_provider: "",
    api_settings_json: {},
    is_active: 1,
    sort_order: 0
};

const defaultMethodForm = {
    methodId: null,
    carrier_id: "",
    name: "",
    description: "",
    type: "shipping",
    service_code: "",
    delivery_type: "home",
    price: 0,
    free_from: "",
    delivery_days_min: "",
    delivery_days_max: "",
    requires_address: 1,
    requires_zip: 0,
    is_api_rate: 0,
    is_active: 1,
    sort_order: 0
};

const methodTypeLabels = {
    pickup: "Retiro",
    local_delivery: "Entrega local",
    shipping: "Encomienda / correo",
    custom: "Personalizado"
};

const deliveryTypeLabels = {
    pickup: "Retiro",
    home: "Domicilio",
    branch: "Sucursal",
    custom: "Personalizado"
};

const carrierTypeLabels = {
    manual: "Manual",
    api: "API externa",
    pickup: "Retiro en local",
    own_delivery: "Entrega propia"
};

export default function StoreShippingClient({
    businessId
}) {
    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [storeMissing, setStoreMissing] =
        useState(false);

    const [carriers, setCarriers] =
        useState([]);

    const [activeTab, setActiveTab] =
        useState("carriers");

    const [methods, setMethods] =
        useState([]);

    const [methodForm, setMethodForm] =
        useState(defaultMethodForm);

    const [form, setForm] =
        useState(defaultCarrierForm);

    useEffect(() => {

        loadCarriers();
        loadMethods();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId]);

    async function loadCarriers() {
        setLoading(true);

        try {
            const res =
                await fetch(
                    `/api/store/admin/carriers/list?businessId=${businessId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudieron cargar los transportistas"
                );
            }

            setStoreMissing(
                !!data.storeMissing
            );

            setCarriers(
                data.carriers || []
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

    async function loadMethods() {

        try {

            const res =
                await fetch(
                    `/api/store/admin/shipping-methods/list?businessId=${businessId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error
                );
            }

            setMethods(
                data.methods || []
            );

        } catch (err) {

            console.error(err);
        }
    }

    function updateMethodField(field, value) {
        setMethodForm(prev => ({
            ...prev,
            [field]: value
        }));
    }

    function resetMethodForm() {
        setMethodForm(defaultMethodForm);
    }

    function editMethod(method) {
        setMethodForm({
            methodId: method.id,
            carrier_id: method.carrier_id || "",
            name: method.name || "",
            description: method.description || "",
            type: method.type || "shipping",
            service_code: method.service_code || "",
            delivery_type: method.delivery_type || "home",
            price: method.price || 0,
            free_from: method.free_from || "",
            delivery_days_min: method.delivery_days_min || "",
            delivery_days_max: method.delivery_days_max || "",
            requires_address: Number(method.requires_address) === 0 ? 0 : 1,
            requires_zip: Number(method.requires_zip) === 1 ? 1 : 0,
            is_api_rate: Number(method.is_api_rate) === 1 ? 1 : 0,
            is_active: Number(method.is_active) === 0 ? 0 : 1,
            sort_order: method.sort_order || 0
        });
    }

    async function saveMethod() {
        if (!methodForm.name.trim()) {
            showAlert({
                title: "Nombre requerido",
                text: "Ingresá el nombre del método de envío.",
                icon: "warning"
            });

            return;
        }

        try {
            const res = await fetch(
                "/api/store/admin/shipping-methods/save",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        businessId,
                        ...methodForm
                    })
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo guardar el método"
                );
            }

            await loadMethods();
            resetMethodForm();

            showAlert({
                title: "Guardado",
                text: data.message || "Método guardado correctamente.",
                icon: "success",
                timer: 1300
            });

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    async function deleteMethod(method) {
        const confirmed = await showAlert({
            title: "Eliminar método",
            text: `¿Querés eliminar "${method.name}"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar"
        });

        if (!confirmed) {
            return;
        }

        try {
            const res = await fetch(
                `/api/store/admin/shipping-methods/delete?businessId=${businessId}&methodId=${method.id}`,
                {
                    method: "DELETE"
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo eliminar el método"
                );
            }

            await loadMethods();

            showAlert({
                title: "Eliminado",
                text: "Método eliminado correctamente.",
                icon: "success",
                timer: 1200
            });

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    function updateField(field, value) {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    }

    function resetForm() {
        setForm(
            defaultCarrierForm
        );
    }

    function editCarrier(carrier) {
        setForm({
            carrierId: carrier.id,
            name: carrier.name || "",
            code: carrier.code || "",
            type: carrier.type || "manual",
            logo_url: carrier.logo_url || "",
            tracking_url_template: carrier.tracking_url_template || "",
            api_provider: carrier.api_provider || "",
            api_settings_json: carrier.api_settings_json || {},
            is_active: Number(carrier.is_active) === 0 ? 0 : 1,
            sort_order: carrier.sort_order || 0
        });
    }

    async function saveCarrier() {
        if (!form.name.trim()) {
            showAlert({
                title: "Nombre requerido",
                text: "Ingresá el nombre del transportista.",
                icon: "warning"
            });

            return;
        }

        setSaving(true);

        try {
            const res =
                await fetch(
                    "/api/store/admin/carriers/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            ...form
                        })
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo guardar el transportista"
                );
            }

            showAlert({
                title: "Guardado",
                text: data.message || "Transportista guardado correctamente.",
                icon: "success",
                timer: 1400
            });

            resetForm();
            await loadCarriers();

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

    async function deleteCarrier(carrier) {
        const confirmed =
            await showAlert({
                title: "Eliminar transportista",
                text: `¿Querés eliminar "${carrier.name}"?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Eliminar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        try {
            const res =
                await fetch(
                    `/api/store/admin/carriers/delete?businessId=${businessId}&carrierId=${carrier.id}`,
                    {
                        method: "DELETE"
                    }
                );

            const data =
                await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo eliminar el transportista"
                );
            }

            showAlert({
                title: "Eliminado",
                text: "Transportista eliminado correctamente.",
                icon: "success",
                timer: 1200
            });

            await loadCarriers();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    if (storeMissing) {
        return (
            <div className="qr_page_builder">

                <div className="qr_page_header">
                    <div>
                        <h1 className="qr_page_title store_admin_title">
                            <span className="store_admin_title_icon">
                                🚚
                            </span>

                            <span>
                                Envíos
                            </span>
                        </h1>

                        <p className="qr_page_subtitle">
                            Primero necesitás crear la tienda.
                        </p>
                    </div>

                    <div className="qr_page_actions">
                        <button
                            type="button"
                            className="qr_page_btn success"
                            onClick={() =>
                                router.push(
                                    `/dashboard/businesses/${businessId}/store`
                                )
                            }
                        >
                            Ir a Tags Tienda
                        </button>
                    </div>
                </div>

                <div className="qr_page_card">
                    Configurá primero la tienda para poder administrar envíos.
                </div>

            </div>
        );
    }

    return (
        <div className="qr_page_builder">

            <div className="qr_page_header">

                <div>
                    <h1 className="qr_page_title store_admin_title">
                        <span className="store_admin_title_icon">
                            🚚
                        </span>

                        <span>
                            Envíos
                        </span>
                    </h1>

                    <p className="qr_page_subtitle">
                        Administrá transportistas, retiro en local, cadetería propia e integraciones futuras.
                    </p>
                </div>

                <div className="qr_page_actions">
                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/store`
                            )
                        }
                    >
                        Volver a tienda
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={loadCarriers}
                    >
                        Actualizar
                    </button>
                </div>

            </div>

            <div className="store_shipping_tabs">
                <button
                    type="button"
                    className={activeTab === "carriers" ? "active" : ""}
                    onClick={() => setActiveTab("carriers")}
                >
                    Transportistas
                </button>

                <button
                    type="button"
                    className={activeTab === "methods" ? "active" : ""}
                    onClick={() => setActiveTab("methods")}
                >
                    Métodos
                </button>
            </div>
            {activeTab === "carriers" && (
                <div className="store_admin_split">

                    <section className="qr_page_card">

                        <h2 className="qr_page_section_title">
                            {form.carrierId
                                ? "Editar transportista"
                                : "Nuevo transportista"}
                        </h2>

                        <div className="qr_page_grid">

                            <div className="qr_page_field">
                                <label>Nombre</label>

                                <input
                                    className="qr_page_input"
                                    value={form.name}
                                    onChange={(e) =>
                                        updateField(
                                            "name",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ej: Correo Argentino"
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Código interno</label>

                                <input
                                    className="qr_page_input"
                                    value={form.code}
                                    onChange={(e) =>
                                        updateField(
                                            "code",
                                            e.target.value
                                        )
                                    }
                                    placeholder="correo_argentino"
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Tipo</label>

                                <select
                                    className="qr_page_select"
                                    value={form.type}
                                    onChange={(e) =>
                                        updateField(
                                            "type",
                                            e.target.value
                                        )
                                    }
                                >
                                    {Object.entries(carrierTypeLabels).map(([value, label]) => (
                                        <option
                                            key={value}
                                            value={value}
                                        >
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="qr_page_field">
                                <label>Orden</label>

                                <input
                                    className="qr_page_input"
                                    type="number"
                                    value={form.sort_order}
                                    onChange={(e) =>
                                        updateField(
                                            "sort_order",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="qr_page_field full">
                                <label>Logo URL</label>

                                <input
                                    className="qr_page_input"
                                    value={form.logo_url}
                                    onChange={(e) =>
                                        updateField(
                                            "logo_url",
                                            e.target.value
                                        )
                                    }
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="qr_page_field full">
                                <label>URL tracking</label>

                                <input
                                    className="qr_page_input"
                                    value={form.tracking_url_template}
                                    onChange={(e) =>
                                        updateField(
                                            "tracking_url_template",
                                            e.target.value
                                        )
                                    }
                                    placeholder="https://tracking.com/{code}"
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Proveedor API</label>

                                <input
                                    className="qr_page_input"
                                    value={form.api_provider}
                                    onChange={(e) =>
                                        updateField(
                                            "api_provider",
                                            e.target.value
                                        )
                                    }
                                    placeholder="enviopack / andreani / oca"
                                />
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={Number(form.is_active) === 1}
                                        onChange={(e) =>
                                            updateField(
                                                "is_active",
                                                e.target.checked ? 1 : 0
                                            )
                                        }
                                    />

                                    Activo
                                </label>
                            </div>

                        </div>

                        <div className="qr_page_actions mt-4">

                            <button
                                type="button"
                                className="qr_page_btn success"
                                disabled={saving}
                                onClick={saveCarrier}
                            >
                                {saving
                                    ? "Guardando..."
                                    : "Guardar transportista"}
                            </button>

                            {form.carrierId && (
                                <button
                                    type="button"
                                    className="qr_page_btn secondary"
                                    onClick={resetForm}
                                >
                                    Nuevo
                                </button>
                            )}

                        </div>

                    </section>

                    <section className="qr_page_card">

                        <h2 className="qr_page_section_title">
                            Transportistas
                        </h2>

                        <div className="store_shipping_list">

                            {carriers.map(carrier => (
                                <article
                                    key={carrier.id}
                                    className="store_shipping_card"
                                >
                                    <div className="store_shipping_card_head">

                                        {carrier.logo_url ? (
                                            <img
                                                src={carrier.logo_url}
                                                alt={carrier.name}
                                            />
                                        ) : (
                                            <div className="store_shipping_icon">
                                                🚚
                                            </div>
                                        )}

                                        <div>
                                            <h3>
                                                {carrier.name}
                                            </h3>

                                            <p>
                                                {carrierTypeLabels[carrier.type] || carrier.type}
                                            </p>
                                        </div>

                                    </div>

                                    <div className="store_shipping_meta">
                                        <span>
                                            Código: {carrier.code || "-"}
                                        </span>

                                        <span>
                                            Orden: {carrier.sort_order || 0}
                                        </span>

                                        <span>
                                            {Number(carrier.is_active) === 1
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>
                                    </div>

                                    <div className="store_shipping_actions">
                                        <button
                                            type="button"
                                            className="store_admin_small_btn"
                                            onClick={() =>
                                                editCarrier(carrier)
                                            }
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            className="store_admin_danger_btn"
                                            onClick={() =>
                                                deleteCarrier(carrier)
                                            }
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </article>
                            ))}

                            {!carriers.length && (
                                <div className="qr_page_info_box">
                                    Todavía no cargaste transportistas.
                                </div>
                            )}

                        </div>

                    </section>

                </div>
            )}
            {activeTab === "methods" && (
                <div className="store_admin_split">

                    <section className="qr_page_card">

                        <h2 className="qr_page_section_title">
                            {methodForm.methodId
                                ? "Editar método"
                                : "Nuevo método"}
                        </h2>

                        <div className="qr_page_grid">

                            <div className="qr_page_field">
                                <label>Nombre</label>

                                <input
                                    className="qr_page_input"
                                    value={methodForm.name}
                                    onChange={(e) =>
                                        updateMethodField("name", e.target.value)
                                    }
                                    placeholder="Ej: Envío a domicilio"
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Transportista</label>

                                <select
                                    className="qr_page_select"
                                    value={methodForm.carrier_id}
                                    onChange={(e) =>
                                        updateMethodField("carrier_id", e.target.value)
                                    }
                                >
                                    <option value="">
                                        Sin transportista
                                    </option>

                                    {carriers.map(carrier => (
                                        <option
                                            key={carrier.id}
                                            value={carrier.id}
                                        >
                                            {carrier.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="qr_page_field">
                                <label>Tipo</label>

                                <select
                                    className="qr_page_select"
                                    value={methodForm.type}
                                    onChange={(e) =>
                                        updateMethodField("type", e.target.value)
                                    }
                                >
                                    {Object.entries(methodTypeLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="qr_page_field">
                                <label>Tipo de entrega</label>

                                <select
                                    className="qr_page_select"
                                    value={methodForm.delivery_type}
                                    onChange={(e) =>
                                        updateMethodField("delivery_type", e.target.value)
                                    }
                                >
                                    {Object.entries(deliveryTypeLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="qr_page_field">
                                <label>Precio</label>

                                <input
                                    className="qr_page_input"
                                    type="number"
                                    value={methodForm.price}
                                    onChange={(e) =>
                                        updateMethodField("price", e.target.value)
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Gratis desde</label>

                                <input
                                    className="qr_page_input"
                                    type="number"
                                    value={methodForm.free_from}
                                    onChange={(e) =>
                                        updateMethodField("free_from", e.target.value)
                                    }
                                    placeholder="Opcional"
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Días mínimo</label>

                                <input
                                    className="qr_page_input"
                                    type="number"
                                    value={methodForm.delivery_days_min}
                                    onChange={(e) =>
                                        updateMethodField("delivery_days_min", e.target.value)
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Días máximo</label>

                                <input
                                    className="qr_page_input"
                                    type="number"
                                    value={methodForm.delivery_days_max}
                                    onChange={(e) =>
                                        updateMethodField("delivery_days_max", e.target.value)
                                    }
                                />
                            </div>

                            <div className="qr_page_field full">
                                <label>Descripción</label>

                                <textarea
                                    className="qr_page_textarea"
                                    value={methodForm.description}
                                    onChange={(e) =>
                                        updateMethodField("description", e.target.value)
                                    }
                                    placeholder="Detalle visible para el comprador"
                                />
                            </div>

                            <div className="qr_page_field">
                                <label>Orden</label>

                                <input
                                    className="qr_page_input"
                                    type="number"
                                    value={methodForm.sort_order}
                                    onChange={(e) =>
                                        updateMethodField("sort_order", e.target.value)
                                    }
                                />
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={Number(methodForm.requires_address) === 1}
                                        onChange={(e) =>
                                            updateMethodField(
                                                "requires_address",
                                                e.target.checked ? 1 : 0
                                            )
                                        }
                                    />
                                    Requiere dirección
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={Number(methodForm.requires_zip) === 1}
                                        onChange={(e) =>
                                            updateMethodField(
                                                "requires_zip",
                                                e.target.checked ? 1 : 0
                                            )
                                        }
                                    />
                                    Requiere código postal
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={Number(methodForm.is_api_rate) === 1}
                                        onChange={(e) =>
                                            updateMethodField(
                                                "is_api_rate",
                                                e.target.checked ? 1 : 0
                                            )
                                        }
                                    />
                                    Cotización por API
                                </label>
                            </div>

                            <div className="qr_page_field">
                                <label className="qr_page_checkbox">
                                    <input
                                        type="checkbox"
                                        checked={Number(methodForm.is_active) === 1}
                                        onChange={(e) =>
                                            updateMethodField(
                                                "is_active",
                                                e.target.checked ? 1 : 0
                                            )
                                        }
                                    />
                                    Activo
                                </label>
                            </div>

                        </div>

                        <div className="qr_page_actions mt-4">

                            <button
                                type="button"
                                className="qr_page_btn success"
                                onClick={saveMethod}
                            >
                                Guardar método
                            </button>

                            {methodForm.methodId && (
                                <button
                                    type="button"
                                    className="qr_page_btn secondary"
                                    onClick={resetMethodForm}
                                >
                                    Nuevo
                                </button>
                            )}

                        </div>

                    </section>

                    <section className="qr_page_card">

                        <h2 className="qr_page_section_title">
                            Métodos creados
                        </h2>

                        <div className="store_shipping_list">

                            {methods.map(method => (
                                <article
                                    key={method.id}
                                    className="store_shipping_card"
                                >
                                    <h3>
                                        {method.name}
                                    </h3>

                                    <p>
                                        {method.carrier_name || "Sin transportista"}
                                    </p>

                                    <div className="store_shipping_meta">

                                        <span>
                                            {deliveryTypeLabels[method.delivery_type] || method.delivery_type}
                                        </span>

                                        <span>
                                            ${Number(method.price || 0).toLocaleString("es-AR")}
                                        </span>

                                        {method.free_from && (
                                            <span>
                                                Gratis desde ${Number(method.free_from).toLocaleString("es-AR")}
                                            </span>
                                        )}

                                        <span>
                                            {Number(method.is_active) === 1
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>

                                    </div>

                                    <div className="store_shipping_actions">

                                        <button
                                            type="button"
                                            className="store_admin_small_btn"
                                            onClick={() =>
                                                editMethod(method)
                                            }
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            className="store_admin_danger_btn"
                                            onClick={() =>
                                                deleteMethod(method)
                                            }
                                        >
                                            Eliminar
                                        </button>

                                    </div>
                                </article>
                            ))}

                            {!methods.length && (
                                <div className="qr_page_info_box">
                                    Todavía no cargaste métodos de envío.
                                </div>
                            )}

                        </div>

                    </section>

                </div>
            )}

        </div>
    );
}