// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/payments
// Descripción: Configuración de medios de pago.
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

const defaultSettings = {
    mercado_pago: {
        provider: "mercado_pago",
        is_active: 0,
        public_key: "",
        access_token: "",
        account_email: "",
        account_name: "",
        settings_json: {}
    },

    manual_transfer: {
        provider: "manual_transfer",
        is_active: 0,
        public_key: "",
        access_token: "",
        account_email: "",
        account_name: "",
        settings_json: {
            alias: "",
            cbu: "",
            holder: ""
        }
    },

    cash: {
        provider: "cash",
        is_active: 0,
        public_key: "",
        access_token: "",
        account_email: "",
        account_name: "",
        settings_json: {
            message: "Pagar al retirar"
        }
    }
};

export default function StorePaymentsClient({
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

    const [settings, setSettings] =
        useState(defaultSettings);

    useEffect(() => {

        loadSettings();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId]);

    async function loadSettings() {

        setLoading(true);

        try {

            const res =
                await fetch(
                    `/api/store/admin/payments/get?businessId=${businessId}`,
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

            setStoreMissing(
                !!data.storeMissing
            );

            const next =
                structuredClone(
                    defaultSettings
                );

            (data.settings || [])
                .forEach(item => {

                    next[
                        item.provider
                    ] = {
                        ...next[item.provider],
                        ...item,
                        settings_json: {
                            ...next[item.provider]
                                .settings_json,
                            ...(item.settings_json || {})
                        }
                    };
                });

            setSettings(next);

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

    function updateProviderField(
        provider,
        field,
        value
    ) {

        setSettings(prev => ({
            ...prev,
            [provider]: {
                ...prev[provider],
                [field]: value
            }
        }));
    }

    function updateProviderJson(
        provider,
        field,
        value
    ) {

        setSettings(prev => ({
            ...prev,
            [provider]: {
                ...prev[provider],
                settings_json: {
                    ...prev[provider]
                        .settings_json,
                    [field]: value
                }
            }
        }));
    }

    async function saveProvider(
        provider
    ) {

        setSaving(true);

        try {

            const res =
                await fetch(
                    "/api/store/admin/payments/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            ...settings[provider]
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

            showAlert({
                title: "Guardado",
                text:
                    data.message ||
                    "Configuración actualizada",
                icon: "success",
                timer: 1200
            });

            await loadSettings();

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
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    if (storeMissing) {
        return (
            <div className="qr_page_builder">

                <div className="qr_page_card">

                    <h2>
                        Primero debés crear la tienda
                    </h2>

                </div>

            </div>
        );
    }
        return (
        <div className="qr_page_builder">

            <div className="qr_page_header">
                <div>
                    <h1 className="qr_page_title store_admin_title">
                        <span className="store_admin_title_icon">💳</span>
                        <span>Pagos</span>
                    </h1>

                    <p className="qr_page_subtitle">
                        Configurá los medios de pago disponibles para la tienda.
                    </p>
                </div>

                <div className="qr_page_actions">
                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(`/dashboard/businesses/${businessId}/store?tab=payments`)
                        }
                    >
                        Volver
                    </button>
                </div>
            </div>

            <div className="store_admin_split">

                <section className="qr_page_card">
                    <h2 className="qr_page_section_title">
                        Mercado Pago
                    </h2>

                    <div className="qr_page_grid">
                        <div className="qr_page_field">
                            <label className="qr_page_checkbox">
                                <input
                                    type="checkbox"
                                    checked={Number(settings.mercado_pago.is_active) === 1}
                                    onChange={(e) =>
                                        updateProviderField(
                                            "mercado_pago",
                                            "is_active",
                                            e.target.checked ? 1 : 0
                                        )
                                    }
                                />
                                Habilitar Mercado Pago
                            </label>
                        </div>

                        <div className="qr_page_field">
                            <label>Cuenta / titular</label>
                            <input
                                className="qr_page_input"
                                value={settings.mercado_pago.account_name || ""}
                                onChange={(e) =>
                                    updateProviderField(
                                        "mercado_pago",
                                        "account_name",
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="qr_page_field">
                            <label>Email de cuenta</label>
                            <input
                                className="qr_page_input"
                                value={settings.mercado_pago.account_email || ""}
                                onChange={(e) =>
                                    updateProviderField(
                                        "mercado_pago",
                                        "account_email",
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="qr_page_field full">
                            <label>Public Key</label>
                            <input
                                className="qr_page_input"
                                value={settings.mercado_pago.public_key || ""}
                                onChange={(e) =>
                                    updateProviderField(
                                        "mercado_pago",
                                        "public_key",
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="qr_page_field full">
                            <label>Access Token</label>
                            <input
                                className="qr_page_input"
                                type="password"
                                value={settings.mercado_pago.access_token || ""}
                                onChange={(e) =>
                                    updateProviderField(
                                        "mercado_pago",
                                        "access_token",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="qr_page_actions mt-4">
                        <button
                            type="button"
                            className="qr_page_btn success"
                            disabled={saving}
                            onClick={() => saveProvider("mercado_pago")}
                        >
                            Guardar Mercado Pago
                        </button>
                    </div>
                </section>

                <section className="qr_page_card">
                    <h2 className="qr_page_section_title">
                        Medios activos
                    </h2>

                    <div className="store_shipping_list">
                        {Object.values(settings).map(item => (
                            <article
                                key={item.provider}
                                className="store_shipping_card"
                            >
                                <h3>
                                    {item.provider === "mercado_pago"
                                        ? "Mercado Pago"
                                        : item.provider === "manual_transfer"
                                            ? "Transferencia"
                                            : "Efectivo / A convenir"}
                                </h3>

                                <div className="store_shipping_meta">
                                    <span>
                                        {Number(item.is_active) === 1
                                            ? "Activo"
                                            : "Inactivo"}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="qr_page_card">
                    <h2 className="qr_page_section_title">
                        Transferencia bancaria
                    </h2>

                    <div className="qr_page_grid">
                        <div className="qr_page_field">
                            <label className="qr_page_checkbox">
                                <input
                                    type="checkbox"
                                    checked={Number(settings.manual_transfer.is_active) === 1}
                                    onChange={(e) =>
                                        updateProviderField(
                                            "manual_transfer",
                                            "is_active",
                                            e.target.checked ? 1 : 0
                                        )
                                    }
                                />
                                Habilitar transferencia
                            </label>
                        </div>

                        <div className="qr_page_field">
                            <label>Titular</label>
                            <input
                                className="qr_page_input"
                                value={settings.manual_transfer.settings_json?.holder || ""}
                                onChange={(e) =>
                                    updateProviderJson(
                                        "manual_transfer",
                                        "holder",
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="qr_page_field">
                            <label>Alias</label>
                            <input
                                className="qr_page_input"
                                value={settings.manual_transfer.settings_json?.alias || ""}
                                onChange={(e) =>
                                    updateProviderJson(
                                        "manual_transfer",
                                        "alias",
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="qr_page_field">
                            <label>CBU / CVU</label>
                            <input
                                className="qr_page_input"
                                value={settings.manual_transfer.settings_json?.cbu || ""}
                                onChange={(e) =>
                                    updateProviderJson(
                                        "manual_transfer",
                                        "cbu",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="qr_page_actions mt-4">
                        <button
                            type="button"
                            className="qr_page_btn success"
                            disabled={saving}
                            onClick={() => saveProvider("manual_transfer")}
                        >
                            Guardar transferencia
                        </button>
                    </div>
                </section>

                <section className="qr_page_card">
                    <h2 className="qr_page_section_title">
                        Efectivo / A convenir
                    </h2>

                    <div className="qr_page_grid">
                        <div className="qr_page_field">
                            <label className="qr_page_checkbox">
                                <input
                                    type="checkbox"
                                    checked={Number(settings.cash.is_active) === 1}
                                    onChange={(e) =>
                                        updateProviderField(
                                            "cash",
                                            "is_active",
                                            e.target.checked ? 1 : 0
                                        )
                                    }
                                />
                                Habilitar efectivo / acordar
                            </label>
                        </div>

                        <div className="qr_page_field full">
                            <label>Mensaje visible</label>
                            <textarea
                                className="qr_page_textarea"
                                value={settings.cash.settings_json?.message || ""}
                                onChange={(e) =>
                                    updateProviderJson(
                                        "cash",
                                        "message",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="qr_page_actions mt-4">
                        <button
                            type="button"
                            className="qr_page_btn success"
                            disabled={saving}
                            onClick={() => saveProvider("cash")}
                        >
                            Guardar efectivo
                        </button>
                    </div>
                </section>

            </div>
        </div>
    );
}