"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useRouter
} from "next/navigation";

import {
    FaArrowLeft,
    FaBox,
    FaCashRegister,
    FaCheck,
    FaClipboardCheck,
    FaMapMarkerAlt,
    FaMoneyBillWave,
    FaMotorcycle,
    FaPhone,
    FaRoute,
    FaSyncAlt,
    FaTruck,
    FaUserCog,
    FaWallet
} from "react-icons/fa";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import showAlert
    from "@/app/components/showAlert";

import {
    formatRestoOrderPrice
} from "@/app/modules/resto/lib/orders";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";
import "@/app/modules/resto/styles/resto-delivery.css";

const STATUS = {
    pending_confirmation: [
        "Esperando confirmación",
        "pending"
    ],
    preparing: [
        "En preparación",
        "preparing"
    ],
    ready_for_dispatch: [
        "Listo para despachar",
        "ready"
    ],
    assigned: [
        "Repartidor asignado",
        "assigned"
    ],
    picked_up: [
        "Pedido retirado",
        "picked"
    ],
    in_transit: [
        "En camino",
        "transit"
    ],
    delivered: [
        "Entregado",
        "delivered"
    ],
    failed: [
        "Entrega fallida",
        "failed"
    ],
    cancelled: [
        "Cancelado",
        "cancelled"
    ]
};

const METHOD_LABELS = {
    cash:
        "Efectivo",
    transfer:
        "Transferencia",
    card:
        "Tarjeta",
    mercado_pago:
        "Mercado Pago",
    other:
        "Otro"
};

function formatDate(value) {
    if (!value) return "—";

    const date =
        new Date(
            String(value).replace(
                " ",
                "T"
            )
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        "es-AR",
        {
            dateStyle:
                "short",
            timeStyle:
                "short"
        }
    ).format(date);
}

function dateInput(
    date,
    end = false
) {
    const value =
        new Date(date);

    const offset =
        value.getTimezoneOffset();

    value.setMinutes(
        value.getMinutes() -
        offset
    );

    const day =
        value
            .toISOString()
            .slice(0, 10);

    return `${day}T${end ? "23:59" : "00:00"}`;
}

export default function RestoDeliveryClient({
    businessId,
    permissions = ["*"]
}) {
    const router =
        useRouter();

    const can =
        permission =>
            permissions.includes("*") ||
            permissions.includes(
                permission
            );

    const [data, setData] =
        useState(null);

    const [profiles, setProfiles] =
        useState([]);

    const [settlementData, setSettlementData] =
        useState({
            settlements: [],
            pending: []
        });

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [tab, setTab] =
        useState("operations");

    const [statusFilter, setStatusFilter] =
        useState("active");

    const [assignment, setAssignment] =
        useState({});

    const [collection, setCollection] =
        useState({});

    const [profileForm, setProfileForm] =
        useState(null);

    const [settlementForm, setSettlementForm] =
        useState({
            staffId:
                "",
            periodFrom:
                dateInput(
                    new Date()
                ),
            periodTo:
                dateInput(
                    new Date(),
                    true
                ),
            adjustmentAmount:
                "0",
            notes:
                ""
        });

    const load =
        useCallback(
            async ({
                silent = false
            } = {}) => {
                if (silent) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                try {
                    const requests = [
                        fetch(
                            `/api/resto/admin/delivery?businessId=${encodeURIComponent(
                                businessId
                            )}`,
                            {
                                cache:
                                    "no-store"
                            }
                        )
                    ];

                    if (
                        can(
                            "delivery.manage"
                        )
                    ) {
                        requests.push(
                            fetch(
                                `/api/resto/admin/delivery/profiles?businessId=${encodeURIComponent(
                                    businessId
                                )}`,
                                {
                                    cache:
                                        "no-store"
                                }
                            )
                        );
                    }

                    if (
                        can(
                            "delivery.settlement"
                        )
                    ) {
                        requests.push(
                            fetch(
                                `/api/resto/admin/delivery/settlements?businessId=${encodeURIComponent(
                                    businessId
                                )}`,
                                {
                                    cache:
                                        "no-store"
                                }
                            )
                        );
                    }

                    const responses =
                        await Promise.all(
                            requests
                        );

                    const payloads =
                        await Promise.all(
                            responses.map(
                                async response => {
                                    const payload =
                                        await response.json();

                                    if (
                                        !response.ok
                                    ) {
                                        throw new Error(
                                            payload?.error ||
                                            "No se pudo cargar Delivery"
                                        );
                                    }

                                    return payload;
                                }
                            )
                        );

                    setData(
                        payloads[0]
                    );

                    let index = 1;

                    if (
                        can(
                            "delivery.manage"
                        )
                    ) {
                        setProfiles(
                            payloads[index]
                                ?.profiles ||
                            []
                        );
                        index += 1;
                    }

                    if (
                        can(
                            "delivery.settlement"
                        )
                    ) {
                        setSettlementData({
                            settlements:
                                payloads[index]
                                    ?.settlements ||
                                [],
                            pending:
                                payloads[index]
                                    ?.pending ||
                                []
                        });
                    }
                } catch (error) {
                    await showAlert({
                        type:
                            "error",
                        title:
                            "Delivery",
                        message:
                            error.message
                    });
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            [
                businessId,
                permissions
            ]
        );

    useEffect(
        () => {
            load();
        },
        [
            load
        ]
    );

    const deliveries =
        data?.deliveries ||
        [];

    const visibleDeliveries =
        useMemo(
            () =>
                deliveries.filter(
                    delivery => {
                        if (
                            statusFilter ===
                            "all"
                        ) {
                            return true;
                        }

                        if (
                            statusFilter ===
                            "active"
                        ) {
                            return ![
                                "delivered",
                                "failed",
                                "cancelled"
                            ].includes(
                                delivery.status
                            );
                        }

                        if (
                            statusFilter ===
                            "remittance"
                        ) {
                            return [
                                "pending_remittance",
                                "partial_remittance"
                            ].includes(
                                delivery.collection_status
                            );
                        }

                        return delivery.status ===
                            statusFilter;
                    }
                ),
            [
                deliveries,
                statusFilter
            ]
        );

    const kpis =
        useMemo(
            () => ({
                active:
                    deliveries.filter(
                        delivery =>
                            ![
                                "delivered",
                                "failed",
                                "cancelled"
                            ].includes(
                                delivery.status
                            )
                    ).length,
                ready:
                    deliveries.filter(
                        delivery =>
                            [
                                "ready_for_dispatch",
                                "assigned"
                            ].includes(
                                delivery.status
                            )
                    ).length,
                transit:
                    deliveries.filter(
                        delivery =>
                            [
                                "picked_up",
                                "in_transit"
                            ].includes(
                                delivery.status
                            )
                    ).length,
                remittance:
                    deliveries.reduce(
                        (
                            total,
                            delivery
                        ) =>
                            total +
                            Math.max(
                                Number(
                                    delivery.collected_amount
                                ) -
                                Number(
                                    delivery.remitted_amount
                                ),
                                0
                            ),
                        0
                    )
            }),
            [
                deliveries
            ]
        );

    async function deliveryAction(
        delivery,
        action,
        extra = {}
    ) {
        setSaving(true);

        try {
            const response =
                await fetch(
                    "/api/resto/admin/delivery",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                deliveryId:
                                    delivery.id,
                                action,
                                ...extra
                            })
                    }
                );

            const payload =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    payload?.error ||
                    "No se pudo actualizar la entrega"
                );
            }

            await load({
                silent:
                    true
            });
        } catch (error) {
            await showAlert({
                type:
                    "error",
                title:
                    "Delivery",
                message:
                    error.message
            });
        } finally {
            setSaving(false);
        }
    }

    async function remit(
        delivery
    ) {
        const draft =
            collection[
                delivery.id
            ] ||
            {};

        setSaving(true);

        try {
            const response =
                await fetch(
                    "/api/resto/admin/delivery/remittances",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                deliveryId:
                                    delivery.id,
                                amount:
                                    draft.amount ||
                                    (
                                        Number(
                                            delivery.collected_amount
                                        ) -
                                        Number(
                                            delivery.remitted_amount
                                        )
                                    ),
                                paymentMethod:
                                    draft.paymentMethod ||
                                    "cash",
                                notes:
                                    draft.notes ||
                                    ""
                            })
                    }
                );

            const payload =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    payload?.error ||
                    "No se pudo registrar la rendición"
                );
            }

            await load({
                silent:
                    true
            });
        } catch (error) {
            await showAlert({
                type:
                    "error",
                title:
                    "Rendición",
                message:
                    error.message
            });
        } finally {
            setSaving(false);
        }
    }

    async function saveProfile() {
        if (!profileForm) return;

        setSaving(true);

        try {
            const response =
                await fetch(
                    "/api/resto/admin/delivery/profiles",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                ...profileForm
                            })
                    }
                );

            const payload =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    payload?.error ||
                    "No se pudo guardar el repartidor"
                );
            }

            setProfileForm(null);

            await load({
                silent:
                    true
            });
        } catch (error) {
            await showAlert({
                type:
                    "error",
                title:
                    "Repartidores",
                message:
                    error.message
            });
        } finally {
            setSaving(false);
        }
    }

    async function settlementAction(
        action,
        extra = {}
    ) {
        setSaving(true);

        try {
            const response =
                await fetch(
                    "/api/resto/admin/delivery/settlements",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                action,
                                ...extra
                            })
                    }
                );

            const payload =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    payload?.error ||
                    "No se pudo procesar la liquidación"
                );
            }

            await load({
                silent:
                    true
            });
        } catch (error) {
            await showAlert({
                type:
                    "error",
                title:
                    "Liquidaciones",
                message:
                    error.message
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
        <main className="qr_page_builder tags_resto_delivery_page">
            <header className="qr_page_header tags_resto_delivery_header">
                <div className="tags_resto_delivery_identity">
                    {
                        data?.store?.logo_url
                            ? (
                                <img
                                    src={
                                        data.store.logo_url
                                    }
                                    alt={`Logo de ${data.store.name}`}
                                />
                            )
                            : (
                                <span className="tags_resto_delivery_identity_fallback">
                                    <FaTruck />
                                </span>
                            )
                    }

                    <div>
                        <span className="tags_resto_delivery_eyebrow">
                            {data?.store?.name || "Tags Resto"} · Operación en tiempo real
                        </span>
                        <h1 className="qr_page_title">
                            Delivery
                        </h1>
                        <p className="qr_page_subtitle">
                            Despachos, repartidores, cobranzas y comisiones.
                        </p>
                    </div>
                </div>

                <div className="qr_page_actions">
                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/resto`
                            )
                        }
                    >
                        <FaArrowLeft />
                        Inicio
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn secondary"
                        disabled={
                            refreshing
                        }
                        onClick={() =>
                            load({
                                silent:
                                    true
                            })
                        }
                    >
                        <FaSyncAlt />
                        {
                            refreshing
                                ? "Actualizando..."
                                : "Actualizar"
                        }
                    </button>
                </div>
            </header>

            <section className="tags_resto_delivery_kpis">
                <DeliveryKpi
                    icon={FaBox}
                    label="En curso"
                    value={kpis.active}
                    detail="Entregas activas"
                />
                <DeliveryKpi
                    icon={FaClipboardCheck}
                    label="Para despachar"
                    value={kpis.ready}
                    detail="Listas o asignadas"
                    tone="ready"
                />
                <DeliveryKpi
                    icon={FaRoute}
                    label="En reparto"
                    value={kpis.transit}
                    detail="Retiradas o en camino"
                    tone="transit"
                />
                <DeliveryKpi
                    icon={FaWallet}
                    label="Por rendir"
                    value={
                        formatRestoOrderPrice(
                            kpis.remittance,
                            data?.store?.currency ||
                            "ARS"
                        )
                    }
                    detail="Cobrado por repartidores"
                    tone="cash"
                />
            </section>

            <nav className="tags_resto_delivery_tabs">
                <Tab
                    active={
                        tab ===
                        "operations"
                    }
                    icon={FaMotorcycle}
                    onClick={() =>
                        setTab(
                            "operations"
                        )
                    }
                >
                    Entregas
                </Tab>

                {can("delivery.manage") && <Tab
                    active={
                        tab ===
                        "drivers"
                    }
                    icon={FaUserCog}
                    onClick={() =>
                        setTab(
                            "drivers"
                        )
                    }
                >
                    Repartidores
                </Tab>}

                {can("delivery.remittance") && <Tab
                    active={
                        tab ===
                        "remittances"
                    }
                    icon={FaCashRegister}
                    onClick={() =>
                        setTab(
                            "remittances"
                        )
                    }
                >
                    Rendiciones
                </Tab>}

                {can("delivery.settlement") && <Tab
                    active={
                        tab ===
                        "settlements"
                    }
                    icon={FaMoneyBillWave}
                    onClick={() =>
                        setTab(
                            "settlements"
                        )
                    }
                >
                    Liquidaciones
                </Tab>}
            </nav>

            {
                tab ===
                "operations" && (
                    <Operations
                        businessId={
                            businessId
                        }
                        deliveries={
                            visibleDeliveries
                        }
                        allDeliveries={deliveries}
                        drivers={
                            data?.drivers ||
                            []
                        }
                        filter={
                            statusFilter
                        }
                        setFilter={
                            setStatusFilter
                        }
                        assignment={
                            assignment
                        }
                        setAssignment={
                            setAssignment
                        }
                        can={can}
                        saving={saving}
                        onAction={
                            deliveryAction
                        }
                        currency={
                            data?.store?.currency ||
                            "ARS"
                        }
                    />
                )
            }

            {
                tab ===
                "drivers" &&
                can("delivery.manage") && (
                    <Drivers
                        profiles={
                            profiles
                        }
                        form={
                            profileForm
                        }
                        setForm={
                            setProfileForm
                        }
                        saving={
                            saving
                        }
                        onSave={
                            saveProfile
                        }
                    />
                )
            }

            {
                tab ===
                "remittances" &&
                can("delivery.remittance") && (
                    <Remittances
                        deliveries={
                            deliveries.filter(
                                delivery =>
                                    Number(
                                        delivery.collected_amount
                                    ) >
                                    Number(
                                        delivery.remitted_amount
                                    )
                            )
                        }
                        collection={
                            collection
                        }
                        setCollection={
                            setCollection
                        }
                        onRemit={
                            remit
                        }
                        saving={
                            saving
                        }
                        currency={
                            data?.store?.currency ||
                            "ARS"
                        }
                    />
                )
            }

            {
                tab ===
                "settlements" &&
                can("delivery.settlement") && (
                    <Settlements
                        data={
                            settlementData
                        }
                        form={
                            settlementForm
                        }
                        setForm={
                            setSettlementForm
                        }
                        onAction={
                            settlementAction
                        }
                        saving={
                            saving
                        }
                        currency={
                            data?.store?.currency ||
                            "ARS"
                        }
                    />
                )
            }
        </main>
    );
}

function DeliveryKpi({
    icon: Icon,
    label,
    value,
    detail,
    tone = ""
}) {
    return (
        <article className={`tags_resto_delivery_kpi ${tone}`}>
            <span>
                <Icon />
            </span>
            <div>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{detail}</p>
            </div>
        </article>
    );
}

function Tab({
    active,
    icon: Icon,
    onClick,
    children
}) {
    return (
        <button
            type="button"
            className={
                active
                    ? "active"
                    : ""
            }
            onClick={onClick}
        >
            <Icon />
            {children}
        </button>
    );
}

function Operations({
    businessId,
    deliveries,
    allDeliveries = deliveries,
    drivers,
    filter,
    setFilter,
    assignment,
    setAssignment,
    can,
    saving,
    onAction,
    currency
}) {
    return (
        <section className="tags_resto_delivery_section">
            <header className="tags_resto_delivery_section_header">
                <div>
                    <h2>Entregas</h2>
                    <p>Seguimiento desde la preparación hasta el destino.</p>
                </div>

                <select
                    value={filter}
                    onChange={event =>
                        setFilter(
                            event.target.value
                        )
                    }
                >
                    <option value="active">
                        En curso
                    </option>
                    <option value="ready_for_dispatch">
                        Listas para despachar
                    </option>
                    <option value="in_transit">
                        En camino
                    </option>
                    <option value="delivered">
                        Entregadas
                    </option>
                    <option value="failed">
                        Fallidas
                    </option>
                    <option value="cancelled">
                        Canceladas
                    </option>
                    <option value="all">
                        Todas
                    </option>
                </select>
            </header>

            {
                deliveries.length === 0
                    ? (
                        <div className="tags_resto_delivery_empty">
                            <FaMotorcycle />
                            <h3>No hay entregas para mostrar</h3>
                            <p>Los pedidos delivery aparecerán automáticamente.</p>
                        </div>
                    )
                    : (
                        <div className="tags_resto_delivery_grid">
                            {
                                deliveries.map(
                                    delivery => (
                                        <DeliveryCard
                                            key={
                                                delivery.id
                                            }
                                            businessId={
                                                businessId
                                            }
                                            delivery={
                                                delivery
                                            }
                                            drivers={
                                                drivers
                                            }
                                            assignment={
                                                assignment
                                            }
                                            setAssignment={
                                                setAssignment
                                            }
                                            can={
                                                can
                                            }
                                            saving={
                                                saving
                                            }
                                            onAction={
                                                onAction
                                            }
                                            currency={
                                                currency
                                            }
                                        />
                                    )
                                )
                            }
                        </div>
                    )
            }
            {allDeliveries.length > 0 && <div className="tags_resto_delivery_history">
                <h3>Resumen de entregas</h3>
                <div className="tags_resto_delivery_history_table_wrap"><table><thead><tr><th>Pedido</th><th>Estado</th><th>Monto</th><th>Comisión</th><th>A rendir</th><th>Rendido</th><th>Saldo comisión</th></tr></thead><tbody>{allDeliveries.map(delivery => { const collected = Number(delivery.collected_amount || 0); const remitted = Number(delivery.remitted_amount || 0); const commission = Number(delivery.commission_amount || 0); return <tr key={`history-${delivery.id}`}><td>{delivery.order_number || delivery.session_id}</td><td>{STATUS[delivery.status]?.[0] || delivery.status}</td><td>{formatRestoOrderPrice(delivery.total, currency)}</td><td>{formatRestoOrderPrice(commission, currency)}</td><td>{formatRestoOrderPrice(Math.max(collected - remitted, 0), currency)}</td><td>{formatRestoOrderPrice(remitted, currency)}</td><td>{formatRestoOrderPrice(Math.max(commission - remitted, 0), currency)}</td></tr>; })}</tbody><tfoot><tr><th colSpan="3">Totales</th><th>{formatRestoOrderPrice(allDeliveries.reduce((sum, item) => sum + Number(item.commission_amount || 0), 0), currency)}</th><th>{formatRestoOrderPrice(allDeliveries.reduce((sum, item) => sum + Math.max(Number(item.collected_amount || 0) - Number(item.remitted_amount || 0), 0), 0), currency)}</th><th>{formatRestoOrderPrice(allDeliveries.reduce((sum, item) => sum + Number(item.remitted_amount || 0), 0), currency)}</th><th>{formatRestoOrderPrice(allDeliveries.reduce((sum, item) => sum + Math.max(Number(item.commission_amount || 0) - Number(item.remitted_amount || 0), 0), 0), currency)}</th></tr></tfoot></table></div>
                <p className="tags_resto_delivery_history_note">El saldo de comisión es la comisión calculada menos lo ya liquidado.</p>
            </div>}
        </section>
    );
}

function DeliveryCard({
    businessId,
    delivery,
    drivers,
    assignment,
    setAssignment,
    can,
    saving,
    onAction,
    currency
}) {
    const [issueNotes, setIssueNotes] =
        useState("");

    const [paymentMethod, setPaymentMethod] =
        useState("cash");
    const [
        statusLabel,
        statusTone
    ] =
        STATUS[
            delivery.status
        ] ||
        [
            delivery.status,
            "pending"
        ];

    const selectedDriver =
        assignment[
            delivery.id
        ] ||
        delivery.assigned_staff_id ||
        "";

    const pendingCollection =
        Math.max(
            Number(
                delivery.total
            ) -
            Number(
                delivery.paid_total
            ),
            0
        );

    return (
        <article className="tags_resto_delivery_card">
            <header>
                <div>
                    <span className={`tags_resto_delivery_status ${statusTone}`}>
                        {statusLabel}
                    </span>
                    <h3>
                        {
                            delivery.order_number ||
                            `Pedido ${delivery.session_id}`
                        }
                    </h3>
                    <small>
                        {formatDate(delivery.ordered_at)}
                    </small>
                </div>

                <button
                    type="button"
                    className="tags_resto_delivery_detail"
                    onClick={() =>
                        window.location.assign(
                            `/dashboard/businesses/${businessId}/resto/orders/${delivery.session_id}`
                        )
                    }
                >
                    Ver pedido
                </button>
            </header>

            <div className="tags_resto_delivery_customer">
                <strong>
                    {
                        delivery.customer_name ||
                        "Cliente sin nombre"
                    }
                </strong>

                {delivery.customer_phone && <a
                    href={`tel:${delivery.customer_phone}`}
                >
                    <FaPhone />
                    {delivery.customer_phone}
                </a>}

                <p>
                    <FaMapMarkerAlt />
                    <span>
                        {
                            delivery.customer_address ||
                            "Domicilio no informado"
                        }
                        {
                            delivery.customer_zip
                                ? ` · CP ${delivery.customer_zip}`
                                : ""
                        }
                    </span>
                </p>
                {delivery.customer_address && <a className="tags_resto_delivery_map_link" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${delivery.customer_address}${delivery.customer_zip ? `, ${delivery.customer_zip}` : ""}`)}`} target="_blank" rel="noreferrer">
                    <FaRoute /> Ver ubicación / Cómo llegar
                </a>}
            </div>

            <div className="tags_resto_delivery_products">
                <span>
                    <FaBox />
                    {delivery.total_quantity} productos
                </span>
                <p>
                    {
                        delivery.products_text ||
                        "Sin productos"
                    }
                </p>
            </div>

            <div className="tags_resto_delivery_finance">
                <span>
                    Total
                    <strong>
                        {formatRestoOrderPrice(
                            delivery.total,
                            currency
                        )}
                    </strong>
                </span>
                <span>
                    A cobrar
                    <strong>
                        {formatRestoOrderPrice(
                            pendingCollection,
                            currency
                        )}
                    </strong>
                </span>
            </div>

            {delivery.driver_name && <div className="tags_resto_delivery_driver">
                <FaMotorcycle />
                <span>
                    Repartidor
                    <strong>
                        {delivery.driver_name}
                    </strong>
                </span>
            </div>}

            <footer>
                {can("delivery.assign") &&
                    ![
                        "delivered",
                        "cancelled"
                    ].includes(
                        delivery.status
                    ) && (
                        <div className="tags_resto_delivery_assign">
                            <select
                                value={
                                    selectedDriver
                                }
                                onChange={event =>
                                    setAssignment(
                                        current => ({
                                            ...current,
                                            [delivery.id]:
                                                event.target.value
                                        })
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar repartidor
                                </option>
                                {
                                    drivers.map(
                                        driver => (
                                            <option
                                                key={
                                                    driver.staff_id
                                                }
                                                value={
                                                    driver.staff_id
                                                }
                                            >
                                                {driver.name}
                                            </option>
                                        )
                                    )
                                }
                            </select>
                            <button
                                type="button"
                                disabled={
                                    saving ||
                                    !selectedDriver
                                }
                                onClick={() =>
                                    onAction(
                                        delivery,
                                        "assign",
                                        {
                                            staffId:
                                                selectedDriver
                                        }
                                    )
                                }
                            >
                                Asignar
                            </button>
                        </div>
                    )}

                {can("delivery.status") && <div className="tags_resto_delivery_actions">
                    {[
                        "ready_for_dispatch",
                        "assigned"
                    ].includes(
                        delivery.status
                    ) && (
                        <button
                            type="button"
                            disabled={
                                saving ||
                                !delivery.assigned_staff_id
                            }
                            onClick={() =>
                                onAction(
                                    delivery,
                                    "picked_up"
                                )
                            }
                        >
                            <FaBox />
                            Retirar pedido
                        </button>
                    )}

                    {delivery.status ===
                        "picked_up" && (
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                onAction(
                                    delivery,
                                    "in_transit"
                                )
                            }
                        >
                            <FaRoute />
                            Iniciar viaje
                        </button>
                    )}

                    {[
                        "picked_up",
                        "in_transit"
                    ].includes(
                        delivery.status
                    ) && (
                        <button
                            type="button"
                            className="success"
                            onClick={() =>
                                onAction(
                                    delivery,
                                    "delivered",
                                    {
                                        collectedAmount:
                                            pendingCollection,
                                        paymentMethod:
                                            paymentMethod
                                    }
                                )
                            }
                            disabled={
                                saving ||
                                (
                                    pendingCollection > 0 &&
                                    Number(
                                        delivery.can_collect
                                    ) !== 1
                                )
                            }
                        >
                            <FaCheck />
                            {
                                pendingCollection > 0
                                    ? `Entregar y cobrar ${formatRestoOrderPrice(pendingCollection, currency)}`
                                    : "Marcar entregado"
                            }
                        </button>
                    )}

                    {[
                        "picked_up",
                        "in_transit"
                    ].includes(
                        delivery.status
                    ) &&
                    pendingCollection > 0 && (
                        <div className="tags_resto_delivery_collection_method">
                            <label>
                                Método cobrado
                                <select
                                    value={
                                        paymentMethod
                                    }
                                    onChange={event =>
                                        setPaymentMethod(
                                            event.target.value
                                        )
                                    }
                                >
                                    {
                                        Object.entries(
                                            METHOD_LABELS
                                        ).map(
                                            ([
                                                value,
                                                label
                                            ]) => (
                                                <option
                                                    key={
                                                        value
                                                    }
                                                    value={
                                                        value
                                                    }
                                                >
                                                    {label}
                                                </option>
                                            )
                                        )
                                    }
                                </select>
                            </label>

                            {
                                Number(
                                    delivery.can_collect
                                ) !== 1 && (
                                    <small>
                                        Este repartidor no está autorizado para cobrar. Registrá el pago antes de entregar o modificá su perfil.
                                    </small>
                                )
                            }
                        </div>
                    )}

                    {[
                        "pending_confirmation",
                        "preparing",
                        "ready_for_dispatch",
                        "assigned",
                        "picked_up",
                        "in_transit"
                    ].includes(
                        delivery.status
                    ) && (
                        <div className="tags_resto_delivery_issue">
                            <input
                                type="text"
                                value={
                                    issueNotes
                                }
                                placeholder="Motivo de la incidencia"
                                onChange={event =>
                                    setIssueNotes(
                                        event.target.value
                                    )
                                }
                            />
                            {
                                [
                                    "assigned",
                                    "picked_up",
                                    "in_transit"
                                ].includes(
                                    delivery.status
                                ) && (
                                    <button
                                        type="button"
                                        className="danger"
                                        disabled={
                                            saving ||
                                            !issueNotes.trim()
                                        }
                                        onClick={() =>
                                            onAction(
                                                delivery,
                                                "failed",
                                                {
                                                    notes:
                                                        issueNotes.trim()
                                                }
                                            )
                                        }
                                    >
                                        Informar entrega fallida
                                    </button>
                                )
                            }
                        </div>
                    )}

                    {can("delivery.assign") &&
                        [
                            "pending_confirmation",
                            "preparing",
                            "ready_for_dispatch",
                            "assigned",
                            "picked_up"
                        ].includes(
                            delivery.status
                        ) && (
                            <div className="tags_resto_delivery_issue">
                                <button
                                    type="button"
                                    className="danger secondary"
                                    disabled={
                                        saving ||
                                        !issueNotes.trim()
                                    }
                                    onClick={() =>
                                        onAction(
                                            delivery,
                                            "cancel",
                                            {
                                                notes:
                                                    issueNotes.trim()
                                            }
                                        )
                                    }
                                >
                                    Cancelar entrega
                                </button>
                            </div>
                        )}
                </div>}
            </footer>
        </article>
    );
}

function Drivers({
    profiles,
    form,
    setForm,
    saving,
    onSave
}) {
    return (
        <section className="tags_resto_delivery_section">
            <header className="tags_resto_delivery_section_header">
                <div>
                    <h2>Repartidores</h2>
                    <p>Convertí personal existente en repartidor y definí su comisión.</p>
                </div>
            </header>

            <div className="tags_resto_delivery_table_wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Personal</th>
                            <th>Modalidad</th>
                            <th>Comisión</th>
                            <th>Disponibilidad</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {
                            profiles.map(
                                profile => (
                                    <tr key={profile.staff_id}>
                                        <td>
                                            <strong>{profile.name}</strong>
                                            <small>{profile.role_name || "Sin rol"} · {profile.email}</small>
                                        </td>
                                        <td>
                                            {profile.employment_type || "Sin configurar"}
                                        </td>
                                        <td>
                                            {
                                                profile.profile_id
                                                    ? `${profile.commission_type} · ${profile.fixed_amount || 0} / ${profile.percentage || 0}%`
                                                    : "—"
                                            }
                                        </td>
                                        <td>
                                            {profile.availability_status || "—"}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm({
                                                        staffId:
                                                            profile.staff_id,
                                                        name:
                                                            profile.name,
                                                        employmentType:
                                                            profile.employment_type ||
                                                            "employee",
                                                        commissionType:
                                                            profile.commission_type ||
                                                            "none",
                                                        fixedAmount:
                                                            profile.fixed_amount ||
                                                            "0",
                                                        percentage:
                                                            profile.percentage ||
                                                            "0",
                                                        availabilityStatus:
                                                            profile.availability_status ||
                                                            "available",
                                                        canCollect:
                                                            profile.can_collect !==
                                                            0,
                                                        isActive:
                                                            profile.is_active !==
                                                            0,
                                                        notes:
                                                            profile.notes ||
                                                            ""
                                                    })
                                                }
                                            >
                                                Configurar
                                            </button>
                                        </td>
                                    </tr>
                                )
                            )
                        }
                    </tbody>
                </table>
            </div>

            {form && <div className="tags_resto_delivery_form">
                <header>
                    <div>
                        <h3>{form.name}</h3>
                        <p>Configuración operativa y de comisión.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            setForm(null)
                        }
                    >
                        Cerrar
                    </button>
                </header>

                <div className="tags_resto_delivery_form_grid">
                    <Field label="Vínculo">
                        <select
                            value={form.employmentType}
                            onChange={event =>
                                setForm(current => ({
                                    ...current,
                                    employmentType:
                                        event.target.value
                                }))
                            }
                        >
                            <option value="employee">Empleado</option>
                            <option value="contractor">Contratado</option>
                            <option value="external">Externo</option>
                        </select>
                    </Field>

                    <Field label="Tipo de comisión">
                        <select
                            value={form.commissionType}
                            onChange={event =>
                                setForm(current => ({
                                    ...current,
                                    commissionType:
                                        event.target.value
                                }))
                            }
                        >
                            <option value="none">Sin comisión</option>
                            <option value="fixed">Importe fijo</option>
                            <option value="percentage">Porcentaje</option>
                            <option value="fixed_percentage">Fijo + porcentaje</option>
                        </select>
                    </Field>

                    <Field label="Importe fijo">
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.fixedAmount}
                            onChange={event =>
                                setForm(current => ({
                                    ...current,
                                    fixedAmount:
                                        event.target.value
                                }))
                            }
                        />
                    </Field>

                    <Field label="Porcentaje">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={form.percentage}
                            onChange={event =>
                                setForm(current => ({
                                    ...current,
                                    percentage:
                                        event.target.value
                                }))
                            }
                        />
                    </Field>

                    <Field label="Disponibilidad">
                        <select
                            value={form.availabilityStatus}
                            onChange={event =>
                                setForm(current => ({
                                    ...current,
                                    availabilityStatus:
                                        event.target.value
                                }))
                            }
                        >
                            <option value="available">Disponible</option>
                            <option value="busy">Ocupado</option>
                            <option value="unavailable">No disponible</option>
                        </select>
                    </Field>
                </div>

                <label className="tags_resto_delivery_check">
                    <input
                        type="checkbox"
                        checked={form.canCollect}
                        onChange={event =>
                            setForm(current => ({
                                ...current,
                                canCollect:
                                    event.target.checked
                            }))
                        }
                    />
                    Puede cobrar pedidos
                </label>

                <button
                    type="button"
                    className="tags_resto_delivery_primary"
                    disabled={saving}
                    onClick={onSave}
                >
                    Guardar repartidor
                </button>
            </div>}
        </section>
    );
}

function Remittances({
    deliveries,
    collection,
    setCollection,
    onRemit,
    saving,
    currency
}) {
    return (
        <section className="tags_resto_delivery_section">
            <header className="tags_resto_delivery_section_header">
                <div>
                    <h2>Dinero pendiente de rendición</h2>
                    <p>El ingreso se incorpora a la Caja abierta al confirmar la rendición.</p>
                </div>
            </header>

            {deliveries.length === 0
                ? <div className="tags_resto_delivery_empty">
                    <FaWallet />
                    <h3>No hay cobranzas pendientes</h3>
                    <p>Todo el dinero cobrado por repartidores está rendido.</p>
                </div>
                : <div className="tags_resto_delivery_remittance_list">
                    {deliveries.map(delivery => {
                        const pending =
                            Number(delivery.collected_amount) -
                            Number(delivery.remitted_amount);
                        const draft =
                            collection[delivery.id] ||
                            {};

                        return (
                            <article key={delivery.id}>
                                <div>
                                    <strong>{delivery.order_number}</strong>
                                    <span>{delivery.driver_name}</span>
                                    <small>Entregado {formatDate(delivery.delivered_at)}</small>
                                </div>
                                <div className="tags_resto_delivery_remittance_amount">
                                    <span>Pendiente</span>
                                    <strong>{formatRestoOrderPrice(pending, currency)}</strong>
                                </div>
                                <input
                                    type="number"
                                    min="0.01"
                                    max={pending}
                                    step="0.01"
                                    value={draft.amount ?? pending}
                                    onChange={event =>
                                        setCollection(current => ({
                                            ...current,
                                            [delivery.id]: {
                                                ...draft,
                                                amount:
                                                    event.target.value
                                            }
                                        }))
                                    }
                                />
                                <select
                                    value={draft.paymentMethod || "cash"}
                                    onChange={event =>
                                        setCollection(current => ({
                                            ...current,
                                            [delivery.id]: {
                                                ...draft,
                                                paymentMethod:
                                                    event.target.value
                                            }
                                        }))
                                    }
                                >
                                    {Object.entries(METHOD_LABELS).map(([value, label]) =>
                                        <option key={value} value={value}>{label}</option>
                                    )}
                                </select>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() =>
                                        onRemit(delivery)
                                    }
                                >
                                    Registrar rendición
                                </button>
                            </article>
                        );
                    })}
                </div>
            }
        </section>
    );
}

function Settlements({
    data,
    form,
    setForm,
    onAction,
    saving,
    currency
}) {
    return (
        <section className="tags_resto_delivery_section">
            <header className="tags_resto_delivery_section_header">
                <div>
                    <h2>Liquidaciones de comisiones</h2>
                    <p>Agrupá viajes y pagá la comisión desde una Caja abierta.</p>
                </div>
            </header>

            <div className="tags_resto_delivery_settlement_form">
                <Field label="Repartidor">
                    <select
                        value={form.staffId}
                        onChange={event =>
                            setForm(current => ({
                                ...current,
                                staffId:
                                    event.target.value
                            }))
                        }
                    >
                        <option value="">Seleccionar</option>
                        {data.pending.map(item =>
                            <option key={item.staff_id} value={item.staff_id}>
                                {item.driver_name} · {item.delivery_count} entregas
                            </option>
                        )}
                    </select>
                </Field>
                <Field label="Desde">
                    <input
                        type="datetime-local"
                        value={form.periodFrom}
                        onChange={event =>
                            setForm(current => ({
                                ...current,
                                periodFrom:
                                    event.target.value
                            }))
                        }
                    />
                </Field>
                <Field label="Hasta">
                    <input
                        type="datetime-local"
                        value={form.periodTo}
                        onChange={event =>
                            setForm(current => ({
                                ...current,
                                periodTo:
                                    event.target.value
                            }))
                        }
                    />
                </Field>
                <Field label="Ajuste">
                    <input
                        type="number"
                        step="0.01"
                        value={form.adjustmentAmount}
                        onChange={event =>
                            setForm(current => ({
                                ...current,
                                adjustmentAmount:
                                    event.target.value
                            }))
                        }
                    />
                </Field>
                <button
                    type="button"
                    disabled={
                        saving ||
                        !form.staffId
                    }
                    onClick={() =>
                        onAction(
                            "create",
                            form
                        )
                    }
                >
                    Crear liquidación
                </button>
            </div>

            <div className="tags_resto_delivery_table_wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Repartidor</th>
                            <th>Período</th>
                            <th>Entregas</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {data.settlements.map(settlement =>
                            <tr key={settlement.id}>
                                <td><strong>{settlement.driver_name}</strong></td>
                                <td>{formatDate(settlement.period_from)} — {formatDate(settlement.period_to)}</td>
                                <td>{settlement.delivery_count}</td>
                                <td>{formatRestoOrderPrice(settlement.total_amount, currency)}</td>
                                <td>{settlement.status === "paid" ? "Pagada" : "Borrador"}</td>
                                <td>
                                    {settlement.status === "draft" &&
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() =>
                                                onAction(
                                                    "pay",
                                                    {
                                                        settlementId:
                                                            settlement.id,
                                                        paymentMethod:
                                                            "cash"
                                                    }
                                                )
                                            }
                                        >
                                            Pagar
                                        </button>
                                    }
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function Field({
    label,
    children
}) {
    return (
        <label className="tags_resto_delivery_field">
            <span>{label}</span>
            {children}
        </label>
    );
}
