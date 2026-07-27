"use client";

import {
    useEffect,
    useState
} from "react";
import {
    useRouter,
    useSearchParams
} from "next/navigation";
import {
    FaArrowLeft,
    FaClock,
    FaCog,
    FaCreditCard,
    FaMapMarkerAlt,
    FaSave,
    FaStore,
    FaTrash,
    FaUtensils
} from "react-icons/fa";

import TagsSpinner
    from "@/app/components/TagsSpinner";
import showAlert
    from "@/app/components/showAlert";
import MediaUploader
    from "@/app/components/MediaUploader";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";
import "@/app/modules/resto/styles/resto-settings.css";

const TABS = [
    ["identity", "Identidad y contacto", FaStore],
    ["location", "Ubicación", FaMapMarkerAlt],
    ["operation", "Operación y horarios", FaClock],
    ["orders", "Pedidos y cocina", FaUtensils],
    ["payments", "Pagos y cuentas", FaCreditCard]
];

const DAYS = [
    ["monday", "Lunes"],
    ["tuesday", "Martes"],
    ["wednesday", "Miércoles"],
    ["thursday", "Jueves"],
    ["friday", "Viernes"],
    ["saturday", "Sábado"],
    ["sunday", "Domingo"]
];

const EMPTY = {
    identity: {
        name: "",
        description: "",
        logo_url: ""
    },
    configuration: {
        contact: {
            email: "",
            whatsapp: "",
            phone: "",
            instagram: "",
            website: ""
        },
        location: {
            address: "",
            city: "",
            province: "",
            postal_code: "",
            country: "Argentina",
            reference: ""
        },
        operation: {
            timezone: "America/Argentina/Buenos_Aires",
            opening_hours: {},
            staff_alerts_enabled: true
        },
        order_rules: {
            table_requires_activation: true,
            online_requires_confirmation: true,
            require_customer_name: true,
            allow_customer_notes: true
        },
        kitchen: {
            auto_refresh_seconds: 10,
            preparation_warning_minutes: 20,
            preparation_critical_minutes: 35
        },
        payment: {
            currency: "ARS",
            accept_cash: true,
            accept_transfer: true,
            accept_card: true,
            accept_mercado_pago: true
        },
        service_modes: {
            table: { enabled: true },
            takeaway: { enabled: true },
            delivery: { enabled: false }
        },
        bank_accounts: []
    }
};

function mergeLoaded(result) {
    const serviceModes =
        result.configuration?.service_modes || {};
    const normalizeMode =
        (value, fallback) => ({
            enabled:
                typeof value === "object"
                    ? value?.enabled !== false
                    : value === undefined
                        ? fallback
                        : value === true
        });

    return {
        identity: {
            ...EMPTY.identity,
            name: result.store?.name || "",
            description: result.store?.description || "",
            logo_url: result.store?.logo_url || ""
        },
        configuration: {
            contact: {
                ...EMPTY.configuration.contact,
                email: result.store?.email || "",
                whatsapp: result.store?.whatsapp || "",
                ...result.configuration?.contact
            },
            location: {
                ...EMPTY.configuration.location,
                address: result.store?.address || "",
                ...result.configuration?.location
            },
            operation: {
                ...EMPTY.configuration.operation,
                ...result.configuration?.operation
            },
            order_rules: {
                ...EMPTY.configuration.order_rules,
                ...result.configuration?.order_rules
            },
            kitchen: {
                ...EMPTY.configuration.kitchen,
                ...result.configuration?.kitchen
            },
            payment: {
                ...EMPTY.configuration.payment,
                currency: result.store?.currency || "ARS",
                ...result.configuration?.payment
            },
            service_modes: {
                table:
                    normalizeMode(
                        serviceModes.table,
                        true
                    ),
                takeaway:
                    normalizeMode(
                        serviceModes.takeaway,
                        true
                    ),
                delivery:
                    normalizeMode(
                        serviceModes.delivery,
                        false
                    )
            },
            bank_accounts:
                result.configuration?.bank_accounts || []
        }
    };
}

export default function RestoSettingsClient({
    businessId,
    canManage = false
}) {
    const router = useRouter();
    const searchParams =
        useSearchParams();
    const [activeTab, setActiveTab] =
        useState(() => {
            const requestedTab =
                searchParams.get(
                    "tab"
                );

            return TABS.some(
                ([key]) =>
                    key ===
                    requestedTab
            )
                ? requestedTab
                : "identity";
        });
    const [form, setForm] =
        useState(EMPTY);
    const [loading, setLoading] =
        useState(true);
    const [saving, setSaving] =
        useState(false);

    useEffect(() => {
        load();
        // eslint-disable-next-line
    }, []);

    async function load() {
        try {
            const response =
                await fetch(
                    `/api/resto/admin/settings?businessId=${encodeURIComponent(businessId)}`,
                    { cache: "no-store" }
                );
            const result =
                await response.json();
            if (!response.ok) {
                throw new Error(result?.error);
            }
            setForm(mergeLoaded(result));
        } catch (error) {
            showAlert({
                icon: "error",
                title: "Configuración",
                text: error.message
            });
        } finally {
            setLoading(false);
        }
    }

    function setIdentity(key, value) {
        setForm(current => ({
            ...current,
            identity: {
                ...current.identity,
                [key]: value
            }
        }));
    }

    function setSection(section, key, value) {
        setForm(current => ({
            ...current,
            configuration: {
                ...current.configuration,
                [section]: {
                    ...current.configuration[section],
                    [key]: value
                }
            }
        }));
    }

    function setMode(mode, enabled) {
        setSection(
            "service_modes",
            mode,
            {
                ...form.configuration.service_modes[mode],
                enabled
            }
        );
    }

    function setDay(day, key, value) {
        const hours =
            form.configuration.operation.opening_hours || {};
        setSection(
            "operation",
            "opening_hours",
            {
                ...hours,
                [day]: {
                    enabled:
                        hours[day]?.enabled ?? false,
                    open:
                        hours[day]?.open || "09:00",
                    close:
                        hours[day]?.close || "23:00",
                    [key]: value
                }
            }
        );
    }

    function addAccount() {
        setForm(current => ({
            ...current,
            configuration: {
                ...current.configuration,
                bank_accounts: [
                    ...current.configuration.bank_accounts,
                    {
                        id: `new-${Date.now()}`,
                        label: "",
                        holder: "",
                        bank: "",
                        alias: "",
                        cbu: "",
                        currency: "ARS",
                        is_active: true
                    }
                ]
            }
        }));
    }

    function updateAccount(index, key, value) {
        setForm(current => ({
            ...current,
            configuration: {
                ...current.configuration,
                bank_accounts:
                    current.configuration.bank_accounts.map(
                        (account, accountIndex) =>
                            accountIndex === index
                                ? {
                                    ...account,
                                    [key]: value
                                }
                                : account
                    )
            }
        }));
    }

    function removeAccount(index) {
        setForm(current => ({
            ...current,
            configuration: {
                ...current.configuration,
                bank_accounts:
                    current.configuration.bank_accounts.filter(
                        (_, accountIndex) =>
                            accountIndex !== index
                    )
            }
        }));
    }

    async function save() {
        setSaving(true);
        try {
            const response =
                await fetch(
                    "/api/resto/admin/settings",
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
            const result =
                await response.json();
            if (!response.ok) {
                throw new Error(result?.error);
            }
            showAlert({
                icon: "success",
                title: "Configuración guardada",
                text: "Los cambios operativos ya están disponibles.",
                timer: 1400
            });
            router.refresh();
        } catch (error) {
            showAlert({
                icon: "error",
                title: "Configuración",
                text: error.message
            });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    return (
        <main className="tags_resto_settings_page">
            <header className="tags_resto_settings_header">
                <div>
                    <FaCog />
                    <div>
                        <h1>Configuración del restaurante</h1>
                        <p>Datos institucionales y reglas operativas. No modifica el diseño de la página.</p>
                    </div>
                </div>
                <div>
                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/resto`
                            )
                        }
                    >
                        <FaArrowLeft /> Volver
                    </button>
                    {canManage && (
                        <button
                            type="button"
                            className="tags_resto_btn tags_resto_btn_success"
                            disabled={saving}
                            onClick={save}
                        >
                            <FaSave /> Guardar cambios
                        </button>
                    )}
                </div>
            </header>

            <nav className="tags_resto_settings_tabs">
                {TABS.map(([key, label, Icon]) => (
                    <button
                        key={key}
                        type="button"
                        className={activeTab === key ? "active" : ""}
                        onClick={() => setActiveTab(key)}
                    >
                        <Icon /> {label}
                    </button>
                ))}
            </nav>

            <section className="tags_resto_settings_panel">
                {activeTab === "identity" && (
                    <>
                        <PanelTitle title="Identidad del restaurante" text="Información institucional y canales de contacto." />
                        <div className="tags_resto_settings_grid">
                            <Field label="Nombre" value={form.identity.name} onChange={value => setIdentity("name", value)} />
                            <Field label="Descripción" value={form.identity.description} onChange={value => setIdentity("description", value)} />
                            <Field label="Email" value={form.configuration.contact.email} onChange={value => setSection("contact", "email", value)} />
                            <Field label="WhatsApp" value={form.configuration.contact.whatsapp} onChange={value => setSection("contact", "whatsapp", value)} />
                            <Field label="Teléfono alternativo" value={form.configuration.contact.phone} onChange={value => setSection("contact", "phone", value)} />
                            <Field label="Instagram" value={form.configuration.contact.instagram} onChange={value => setSection("contact", "instagram", value)} />
                            <Field label="Sitio web" value={form.configuration.contact.website} onChange={value => setSection("contact", "website", value)} />
                            <div className="tags_resto_settings_field is-full">
                                <span>Logo institucional</span>
                                <MediaUploader
                                    businessId={businessId}
                                    value={form.identity.logo_url}
                                    folder="resto/logo"
                                    accept="image/*"
                                    label="Subir logo"
                                    onChange={media =>
                                        setIdentity(
                                            "logo_url",
                                            media?.url || ""
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "location" && (
                    <>
                        <PanelTitle title="Ubicación y domicilio" text="Datos físicos utilizados por clientes, retiro y delivery." />
                        <div className="tags_resto_settings_grid">
                            <Field label="Dirección" value={form.configuration.location.address} onChange={value => setSection("location", "address", value)} wide />
                            <Field label="Ciudad" value={form.configuration.location.city} onChange={value => setSection("location", "city", value)} />
                            <Field label="Provincia" value={form.configuration.location.province} onChange={value => setSection("location", "province", value)} />
                            <Field label="Código postal" value={form.configuration.location.postal_code} onChange={value => setSection("location", "postal_code", value)} />
                            <Field label="País" value={form.configuration.location.country} onChange={value => setSection("location", "country", value)} />
                            <Field label="Referencia para llegar" value={form.configuration.location.reference} onChange={value => setSection("location", "reference", value)} wide />
                        </div>
                    </>
                )}

                {activeTab === "operation" && (
                    <>
                        <PanelTitle title="Modalidades y horarios" text="Define qué formas de atención ofrece el restaurante." />
                        <div className="tags_resto_settings_grid">
                            <Field
                                label="Zona horaria"
                                value={form.configuration.operation.timezone}
                                onChange={value =>
                                    setSection(
                                        "operation",
                                        "timezone",
                                        value
                                    )
                                }
                            />
                        </div>
                        <div className="tags_resto_settings_checks">
                            <Check label="Consumo en el lugar" checked={form.configuration.service_modes.table?.enabled !== false} onChange={value => setMode("table", value)} />
                            <Check label="Retiro" checked={form.configuration.service_modes.takeaway?.enabled === true} onChange={value => setMode("takeaway", value)} />
                            <Check label="Delivery" checked={form.configuration.service_modes.delivery?.enabled === true} onChange={value => setMode("delivery", value)} />
                        </div>
                        <div className="tags_resto_settings_hours">
                            {DAYS.map(([day, label]) => {
                                const value =
                                    form.configuration.operation.opening_hours?.[day] || {};
                                return (
                                    <div key={day}>
                                        <Check label={label} checked={value.enabled === true} onChange={checked => setDay(day, "enabled", checked)} />
                                        <input type="time" value={value.open || "09:00"} disabled={!value.enabled} onChange={event => setDay(day, "open", event.target.value)} />
                                        <span>a</span>
                                        <input type="time" value={value.close || "23:00"} disabled={!value.enabled} onChange={event => setDay(day, "close", event.target.value)} />
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {activeTab === "orders" && (
                    <>
                        <PanelTitle title="Reglas de pedidos y cocina" text="Comportamiento operativo compartido por cliente, mozo, pedidos y cocina." />
                        <div className="tags_resto_settings_checks">
                            <Check label="Alertas internas para el personal" checked={form.configuration.operation.staff_alerts_enabled !== false} onChange={value => setSection("operation", "staff_alerts_enabled", value)} />
                            <Check label="Las mesas requieren habilitación del personal" checked={form.configuration.order_rules.table_requires_activation !== false} onChange={value => setSection("order_rules", "table_requires_activation", value)} />
                            <Check label="Retiro y delivery requieren confirmación" checked={form.configuration.order_rules.online_requires_confirmation !== false} onChange={value => setSection("order_rules", "online_requires_confirmation", value)} />
                            <Check label="Solicitar nombre del cliente" checked={form.configuration.order_rules.require_customer_name !== false} onChange={value => setSection("order_rules", "require_customer_name", value)} />
                            <Check label="Permitir observaciones del cliente" checked={form.configuration.order_rules.allow_customer_notes !== false} onChange={value => setSection("order_rules", "allow_customer_notes", value)} />
                        </div>
                        <div className="tags_resto_settings_grid mt">
                            <NumberField label="Refresco de cocina (segundos)" value={form.configuration.kitchen.auto_refresh_seconds} onChange={value => setSection("kitchen", "auto_refresh_seconds", value)} />
                            <NumberField label="Alerta de demora (minutos)" value={form.configuration.kitchen.preparation_warning_minutes} onChange={value => setSection("kitchen", "preparation_warning_minutes", value)} />
                            <NumberField label="Demora crítica (minutos)" value={form.configuration.kitchen.preparation_critical_minutes} onChange={value => setSection("kitchen", "preparation_critical_minutes", value)} />
                        </div>
                    </>
                )}

                {activeTab === "payments" && (
                    <>
                        <PanelTitle title="Pagos y cuentas bancarias" text="Métodos aceptados y cuentas disponibles para transferencias." />
                        <div className="tags_resto_settings_grid">
                            <Field
                                label="Moneda operativa"
                                value={form.configuration.payment.currency}
                                onChange={value =>
                                    setSection(
                                        "payment",
                                        "currency",
                                        value.toUpperCase()
                                    )
                                }
                            />
                        </div>
                        <div className="tags_resto_settings_checks">
                            <Check label="Efectivo" checked={form.configuration.payment.accept_cash !== false} onChange={value => setSection("payment", "accept_cash", value)} />
                            <Check label="Transferencia" checked={form.configuration.payment.accept_transfer !== false} onChange={value => setSection("payment", "accept_transfer", value)} />
                            <Check label="Tarjeta" checked={form.configuration.payment.accept_card !== false} onChange={value => setSection("payment", "accept_card", value)} />
                            <Check label="Mercado Pago" checked={form.configuration.payment.accept_mercado_pago !== false} onChange={value => setSection("payment", "accept_mercado_pago", value)} />
                        </div>
                        <div className="tags_resto_settings_accounts_header">
                            <h3>Cuentas y alias</h3>
                            <button type="button" className="tags_resto_btn tags_resto_btn_primary" onClick={addAccount}>Agregar cuenta</button>
                        </div>
                        <div className="tags_resto_settings_accounts">
                            {form.configuration.bank_accounts.map((account, index) => (
                                <article key={account.id || index}>
                                    <Field label="Nombre de referencia" value={account.label} onChange={value => updateAccount(index, "label", value)} />
                                    <Field label="Titular" value={account.holder} onChange={value => updateAccount(index, "holder", value)} />
                                    <Field label="Banco / billetera" value={account.bank} onChange={value => updateAccount(index, "bank", value)} />
                                    <Field label="Alias" value={account.alias} onChange={value => updateAccount(index, "alias", value)} />
                                    <Field label="CBU / CVU" value={account.cbu} onChange={value => updateAccount(index, "cbu", value)} />
                                    <Check label="Cuenta activa" checked={account.is_active !== false} onChange={value => updateAccount(index, "is_active", value)} />
                                    <button type="button" className="tags_resto_btn tags_resto_btn_danger" onClick={() => removeAccount(index)}><FaTrash /> Eliminar</button>
                                </article>
                            ))}
                            {form.configuration.bank_accounts.length === 0 && (
                                <p className="tags_resto_settings_empty">Todavía no hay cuentas cargadas.</p>
                            )}
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

function PanelTitle({ title, text }) {
    return <header className="tags_resto_settings_panel_title"><h2>{title}</h2><p>{text}</p></header>;
}

function Field({ label, value, onChange, wide = false }) {
    return <label className={`tags_resto_settings_field${wide ? " is-full" : ""}`}><span>{label}</span><input type="text" value={value || ""} onChange={event => onChange(event.target.value)} /></label>;
}

function NumberField({ label, value, onChange }) {
    return <label className="tags_resto_settings_field"><span>{label}</span><input type="number" min="1" value={value || ""} onChange={event => onChange(Number(event.target.value))} /></label>;
}

function Check({ label, checked, onChange }) {
    return <label className="tags_resto_settings_check"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
}
