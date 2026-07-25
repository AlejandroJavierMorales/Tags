"use client";

// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoServiceInfoBlock.jsx
//
// Descripción:
// Bloque público de información operativa de
// Tags Resto.
//
// Muestra el estado actual del restaurante,
// horarios, modalidades de atención, tiempos
// estimados, pedido mínimo, medios de pago,
// características disponibles y dirección.
//
// Lee la configuración desde:
// entity.settings_json
//
// Contexto:
// resto
// =====================================

import "../../styles/resto-public.css";

import { useState } from "react";

const DAY_KEYS = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
];


const DAY_LABELS = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo"
};


const PAYMENT_LABELS = {
    cash: "Efectivo",
    debit: "Débito",
    credit: "Crédito",
    transfer: "Transferencia",
    mercadoPago: "Mercado Pago",
    qr: "Pago con QR"
};


const FEATURE_LABELS = {
    wifi: "Wi-Fi",
    parking: "Estacionamiento",
    accessible: "Accesibilidad",
    petFriendly: "Pet friendly",
    airConditioning: "Aire acondicionado",
    outdoorSeating: "Mesas al aire libre",
    kidsArea: "Espacio para niños",
    liveMusic: "Música en vivo",
    vegetarianOptions: "Opciones vegetarianas",
    veganOptions: "Opciones veganas",
    glutenFree: "Opciones sin gluten",
    reservations: "Reservas"
};


function parseSettings(
    value
) {

    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    ) {
        return value;
    }

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        return {};
    }

    try {

        const parsed =
            JSON.parse(value);

        return (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
        )
            ? parsed
            : {};

    } catch {

        return {};

    }

}


function normalizeBoolean(
    value,
    fallback = false
) {

    if (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    ) {
        return true;
    }

    if (
        value === false ||
        value === 0 ||
        value === "0" ||
        value === "false"
    ) {
        return false;
    }

    return fallback;

}


function timeToMinutes(
    value
) {

    if (
        typeof value !== "string" ||
        !value.includes(":")
    ) {
        return null;
    }

    const [
        hours,
        minutes
    ] =
        value
            .split(":")
            .map(Number);

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes)
    ) {
        return null;
    }

    return (
        hours * 60 +
        minutes
    );

}


function formatCurrency(
    value,
    currency = "ARS"
) {

    const amount =
        Number(value);

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return "";
    }

    try {

        return new Intl.NumberFormat(
            "es-AR",
            {
                style: "currency",
                currency:
                    currency ||
                    "ARS",
                maximumFractionDigits: 2
            }
        ).format(amount);

    } catch {

        return `$ ${amount}`;

    }

}


function getCurrentDateParts(
    timezone
) {

    try {

        const formatter =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone:
                        timezone ||
                        "America/Argentina/Cordoba",
                    weekday: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23"
                }
            );

        const parts =
            formatter.formatToParts(
                new Date()
            );

        const weekday =
            parts.find(
                part =>
                    part.type ===
                    "weekday"
            )?.value?.toLowerCase();

        const hour =
            Number(
                parts.find(
                    part =>
                        part.type ===
                        "hour"
                )?.value
            );

        const minute =
            Number(
                parts.find(
                    part =>
                        part.type ===
                        "minute"
                )?.value
            );

        return {
            weekday,
            minutes:
                hour * 60 +
                minute
        };

    } catch {

        const now =
            new Date();

        return {
            weekday:
                DAY_KEYS[
                now.getDay()
                ],
            minutes:
                now.getHours() * 60 +
                now.getMinutes()
        };

    }

}


function getPeriods(
    dayConfig
) {

    if (
        !dayConfig ||
        normalizeBoolean(
            dayConfig?.closed,
            false
        )
    ) {
        return [];
    }

    return Array.isArray(
        dayConfig?.periods
    )
        ? dayConfig.periods.filter(
            period =>
                period?.from &&
                period?.to
        )
        : [];

}


function formatPeriods(
    periods
) {

    if (
        !Array.isArray(periods) ||
        periods.length === 0
    ) {
        return "";
    }

    return periods
        .map(
            period =>
                `${period.from}–${period.to}`
        )
        .join(" · ");

}


function getOpenState(
    businessHours
) {

    if (
        !businessHours ||
        !normalizeBoolean(
            businessHours?.enabled,
            false
        )
    ) {
        return null;
    }

    const {
        weekday,
        minutes
    } =
        getCurrentDateParts(
            businessHours?.timezone
        );

    const currentDayIndex =
        DAY_KEYS.indexOf(
            weekday
        );

    if (
        currentDayIndex < 0
    ) {
        return null;
    }

    const previousDayKey =
        DAY_KEYS[
        (
            currentDayIndex -
            1 +
            DAY_KEYS.length
        ) %
        DAY_KEYS.length
        ];

    const currentDayKey =
        DAY_KEYS[
        currentDayIndex
        ];

    const currentPeriods =
        getPeriods(
            businessHours?.[
            currentDayKey
            ]
        );

    const previousPeriods =
        getPeriods(
            businessHours?.[
            previousDayKey
            ]
        );

    let currentPeriod =
        null;

    for (
        const period
        of currentPeriods
    ) {

        const from =
            timeToMinutes(
                period?.from
            );

        const to =
            timeToMinutes(
                period?.to
            );

        if (
            from === null ||
            to === null
        ) {
            continue;
        }

        if (
            to > from &&
            minutes >= from &&
            minutes < to
        ) {

            currentPeriod =
                period;

            break;

        }

        if (
            to <= from &&
            minutes >= from
        ) {

            currentPeriod =
                period;

            break;

        }

    }

    if (
        !currentPeriod
    ) {

        for (
            const period
            of previousPeriods
        ) {

            const from =
                timeToMinutes(
                    period?.from
                );

            const to =
                timeToMinutes(
                    period?.to
                );

            if (
                from === null ||
                to === null ||
                to > from
            ) {
                continue;
            }

            if (
                minutes < to
            ) {

                currentPeriod =
                    period;

                break;

            }

        }

    }

    return {
        isOpen:
            Boolean(
                currentPeriod
            ),

        closesAt:
            currentPeriod?.to ||
            "",

        currentDayKey,

        currentDayLabel:
            DAY_LABELS[
            currentDayKey
            ] ||
            "",

        currentDayPeriods:
            currentPeriods
    };

}


function InfoIcon({
    type
}) {

    const commonProps = {
        width: 22,
        height: 22,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true"
    };


    if (
        type === "clock"
    ) {

        return (
            <svg {...commonProps}>
                <circle
                    cx="12"
                    cy="12"
                    r="9"
                />
                <path d="M12 7v5l3 2" />
            </svg>
        );

    }

    if (
        type === "contact"
    ) {

        return (
            <svg {...commonProps}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
            </svg>
        );

    }


    if (
        type === "table"
    ) {

        return (
            <svg {...commonProps}>
                <path d="M4 10h16" />
                <path d="M6 10v9" />
                <path d="M18 10v9" />
                <path d="M5 6h14v4H5z" />
            </svg>
        );

    }


    if (
        type === "delivery"
    ) {

        return (
            <svg {...commonProps}>
                <path d="M3 7h11v9H3z" />
                <path d="M14 10h4l3 3v3h-7z" />
                <circle
                    cx="7"
                    cy="18"
                    r="2"
                />
                <circle
                    cx="18"
                    cy="18"
                    r="2"
                />
            </svg>
        );

    }


    if (
        type === "takeaway"
    ) {

        return (
            <svg {...commonProps}>
                <path d="M6 8h12l-1 12H7z" />
                <path d="M9 8a3 3 0 0 1 6 0" />
            </svg>
        );

    }


    if (
        type === "payment"
    ) {

        return (
            <svg {...commonProps}>
                <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                />
                <path d="M3 10h18" />
                <path d="M7 15h3" />
            </svg>
        );

    }


    if (
        type === "location"
    ) {

        return (
            <svg {...commonProps}>
                <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" />
                <circle
                    cx="12"
                    cy="10"
                    r="2.5"
                />
            </svg>
        );

    }


    if (
        type === "feature"
    ) {

        return (
            <svg {...commonProps}>
                <path d="M4 7h8" />
                <path d="M16 7h4" />
                <circle
                    cx="14"
                    cy="7"
                    r="2"
                />

                <path d="M4 12h3" />
                <path d="M11 12h9" />
                <circle
                    cx="9"
                    cy="12"
                    r="2"
                />

                <path d="M4 17h10" />
                <path d="M18 17h2" />
                <circle
                    cx="16"
                    cy="17"
                    r="2"
                />
            </svg>
        );

    }


    return (
        <svg {...commonProps}>
            <circle
                cx="12"
                cy="12"
                r="9"
            />
            <path d="M12 11v5" />
            <path d="M12 8h.01" />
        </svg>
    );

}


export default function RestoServiceInfoBlock({
    entity,
    content = {},
    styles = {}
}) {

    const settings =
        parseSettings(
            entity?.settings_json ??
            entity?.settingsJson ??
            entity?.settings
        );

    const [
        selectedItem,
        setSelectedItem
    ] =
        useState(null);

    const serviceModes =
        settings?.serviceModes ||
        {};

    const businessHours =
        settings?.businessHours ||
        {};

    const delivery =
        settings?.delivery ||
        {};

    const takeaway =
        settings?.takeaway ||
        {};

    const tableService =
        settings?.tableService ||
        {};

    const payments =
        settings?.payments ||
        {};

    const features =
        settings?.features ||
        {};

    const contact =
        settings?.contact ||
        {};

    const location =
        settings?.location ||
        {};

    const title =
        content?.title ||
        "Información del servicio";

    const subtitle =
        content?.subtitle ||
        "";


    const showStatus =
        content?.showStatus !==
        false;

    const showHours =
        content?.showHours !==
        false;

    const showServiceModes =
        content?.showServiceModes !==
        false;

    const showPayments =
        content?.showPayments !==
        false;

    const showFeatures =
        content?.showFeatures !==
        false;

    const showAddress =
        content?.showAddress !==
        false;


    const tableEnabled =
        normalizeBoolean(
            serviceModes?.table,
            normalizeBoolean(
                tableService?.enabled,
                false
            )
        );

    const deliveryEnabled =
        normalizeBoolean(
            serviceModes?.delivery,
            normalizeBoolean(
                delivery?.enabled,
                false
            )
        );

    const takeawayEnabled =
        normalizeBoolean(
            serviceModes?.takeaway,
            normalizeBoolean(
                takeaway?.enabled,
                false
            )
        );


    const openState =
        getOpenState(
            businessHours
        );

    const todayHours =
        openState
            ? formatPeriods(
                openState
                    .currentDayPeriods
            )
            : "";


    const enabledPayments =
        Object.entries(
            PAYMENT_LABELS
        )
            .filter(
                ([key]) =>
                    normalizeBoolean(
                        payments?.[key],
                        false
                    )
            )
            .map(
                ([, label]) =>
                    label
            );


    const enabledFeatures =
        Object.entries(
            FEATURE_LABELS
        )
            .filter(
                ([key]) =>
                    normalizeBoolean(
                        features?.[key],
                        false
                    )
            )
            .map(
                ([, label]) =>
                    label
            );


    const minimumOrder =
        formatCurrency(
            delivery?.minimumOrder,
            entity?.currency ||
            "ARS"
        );


    const address =
        String(
            location?.address ||
            entity?.address ||
            entity?.shipping_origin_address ||
            ""
        ).trim();

    const locationQuery =
        String(
            address ||
            ""
        ).trim();

    const googleMapsEmbedUrl =
        locationQuery
            ? `https://www.google.com/maps?q=${encodeURIComponent(
                locationQuery
            )
            }&output=embed`
            : "";

    const googleMapsOpenUrl =
        locationQuery
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                locationQuery
            )
            }`
            : "";

    function getTextStyle(
        part
    ) {

        return (
            styles?.typography?.[part] ||
            {}
        );

    }

    const weeklyHoursDetail =
        [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday"
        ]
            .map(
                dayKey => {

                    const dayConfig =
                        businessHours?.[
                        dayKey
                        ];

                    const periods =
                        getPeriods(
                            dayConfig
                        );

                    const dayLabel =
                        DAY_LABELS[
                        dayKey
                        ];

                    if (
                        normalizeBoolean(
                            dayConfig?.closed,
                            false
                        ) ||
                        periods.length === 0
                    ) {

                        return `${dayLabel}: Cerrado`;

                    }

                    return (
                        `${dayLabel}: ${formatPeriods(
                            periods
                        )
                        }`
                    );

                }
            )
            .join("\n");

    const phone =
        String(
            contact?.phone ||
            ""
        ).trim();

    const whatsapp =
        String(
            contact?.whatsapp ||
            ""
        )
            .replace(
                /\D/g,
                ""
            );

    const email =
        String(
            contact?.email ||
            ""
        ).trim();

    const contactAvailable =
        Boolean(
            phone ||
            whatsapp ||
            email
        );


    const items = [];


    if (
        showStatus &&
        openState
    ) {

        const currentStatusDetail =
            openState.isOpen
                ? openState.closesAt
                    ? `Abierto ahora. Cierra a las ${openState.closesAt}.`
                    : "El restaurante se encuentra abierto."
                : "El restaurante se encuentra cerrado en este momento.";

        items.push({
            key: "status",
            icon: "clock",

            title:
                openState.isOpen
                    ? content?.openLabel ||
                    "Abierto"
                    : content?.closedLabel ||
                    "Cerrado",

            description:
                [
                    currentStatusDetail,
                    weeklyHoursDetail
                ]
                    .filter(Boolean)
                    .join("\n\n"),

            status:
                openState.isOpen
                    ? "open"
                    : "closed"
        });

    } else if (
        showHours &&
        weeklyHoursDetail
    ) {

        items.push({
            key: "hours",
            icon: "clock",
            title:
                content?.hoursLabel ||
                "Horarios",
            description:
                weeklyHoursDetail
        });
    }

    if (
        contactAvailable
    ) {

        items.push({
            key: "contact",
            icon: "contact",
            title:
                content?.contactLabel ||
                "Contacto / Reservas",
            phone,
            whatsapp,
            email
        });

    }


    if (
        showServiceModes &&
        tableEnabled
    ) {

        items.push({
            key: "table",
            icon: "table",
            title:
                content?.tableLabel ||
                "Consumo en el local",
            description:
                content?.tableDescription ||
                "Podés realizar tu pedido para consumir en el establecimiento."
        });

    }


    if (
        showServiceModes &&
        deliveryEnabled
    ) {

        const deliveryDetails = [];

        if (
            delivery?.estimatedTime
        ) {
            deliveryDetails.push(
                `Demora estimada: ${delivery.estimatedTime}`
            );
        }

        if (
            minimumOrder
        ) {
            deliveryDetails.push(
                `Pedido mínimo: ${minimumOrder}`
            );
        }

        if (
            delivery?.feeDescription
        ) {
            deliveryDetails.push(
                delivery.feeDescription
            );
        }

        items.push({
            key: "delivery",
            icon: "delivery",
            title:
                content?.deliveryLabel ||
                "Envío a domicilio",
            description:
                deliveryDetails.length
                    ? deliveryDetails.join(" · ")
                    : content?.deliveryDescription ||
                    "Servicio de entrega disponible."
        });

    }


    if (
        showServiceModes &&
        takeawayEnabled
    ) {

        items.push({
            key: "takeaway",
            icon: "takeaway",
            title:
                content?.takeawayLabel ||
                "Retiro en el local",
            description:
                takeaway?.estimatedTime
                    ? `Demora estimada: ${takeaway.estimatedTime}`
                    : content?.takeawayDescription ||
                    "Realizá tu pedido y retiralo en el establecimiento."
        });

    }


    if (
        showPayments &&
        enabledPayments.length > 0
    ) {

        items.push({
            key: "payments",
            icon: "payment",
            title:
                content?.paymentsLabel ||
                "Medios de pago",
            description:
                enabledPayments.join(", ")
        });

    }


    if (
        showFeatures &&
        enabledFeatures.length > 0
    ) {

        items.push({
            key: "features",
            icon: "feature",
            title:
                content?.featuresLabel ||
                "Servicios del local",
            description:
                enabledFeatures.join(", ")
        });

    }


    if (
        showAddress &&
        address
    ) {

        items.push({
            key: "location",
            icon: "location",

            title:
                content?.addressLabel ||
                "Ubicación",

            address,
            googleMapsEmbedUrl,
            googleMapsOpenUrl
        });

    }


    if (
        items.length === 0
    ) {
        return null;
    }


    return (

        <section
            className="resto_service_info"
            style={{
                background:
                    styles?.backgroundColor ||
                    "var(--qr-background)",

                color:
                    styles?.textColor ||
                    "var(--qr-text)",

                textAlign:
                    styles?.alignment ||
                    undefined,

                padding:
                    styles?.padding ||
                    undefined,

                marginTop:
                    styles?.marginTop ||
                    undefined,

                marginBottom:
                    styles?.marginBottom ||
                    undefined
            }}
        >

            <div className="container py-3">

                {(title || subtitle) && (

                    <div className="resto_service_info_header">

                        {title && (

                            <h2
                                className="resto_service_info_title"
                                style={
                                    getTextStyle(
                                        "title"
                                    )
                                }
                            >
                                {title}
                            </h2>

                        )}

                        {subtitle && (

                            <p
                                className="resto_service_info_subtitle"
                                style={
                                    getTextStyle(
                                        "subtitle"
                                    )
                                }
                            >
                                {subtitle}
                            </p>

                        )}

                    </div>

                )}

                <div className="resto_service_info_bar">

                    {items.map(
                        item => (

                            <button
                                key={
                                    item.key
                                }
                                type="button"
                                className={
                                    [
                                        "resto_service_info_entry",

                                        item.status
                                            ? `is_${item.status}`
                                            : ""
                                    ]
                                        .filter(Boolean)
                                        .join(" ")
                                }
                                onClick={
                                    () =>
                                        setSelectedItem(
                                            item
                                        )
                                }
                                aria-label={
                                    `Ver información sobre ${item.title}`
                                }
                            >

                                <span className="resto_service_info_entry_icon">

                                    <InfoIcon
                                        type={
                                            item.icon
                                        }
                                    />

                                </span>

                                <span
                                    className="resto_service_info_entry_title"
                                    style={
                                        getTextStyle(
                                            "subtitle"
                                        )
                                    }
                                >
                                    {item.title}
                                </span>

                            </button>

                        )
                    )}

                </div>

            </div>

            {selectedItem && (

                <div
                    className="resto_service_info_modal_overlay"
                    role="presentation"
                    onMouseDown={
                        event => {

                            if (
                                event.target ===
                                event.currentTarget
                            ) {

                                setSelectedItem(
                                    null
                                );

                            }

                        }
                    }
                >

                    <div
                        className="resto_service_info_modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="resto-service-info-modal-title"
                    >

                        <button
                            type="button"
                            className="resto_service_info_modal_close"
                            onClick={
                                () =>
                                    setSelectedItem(
                                        null
                                    )
                            }
                            aria-label="Cerrar"
                        >
                            ×
                        </button>

                        <div className="resto_service_info_modal_header">

                            <span
                                className={
                                    [
                                        "resto_service_info_modal_icon",

                                        selectedItem.status
                                            ? `is_${selectedItem.status}`
                                            : ""
                                    ]
                                        .filter(Boolean)
                                        .join(" ")
                                }
                            >

                                <InfoIcon
                                    type={
                                        selectedItem.icon
                                    }
                                />

                            </span>

                            <h3
                                id="resto-service-info-modal-title"
                                className="resto_service_info_modal_title"
                                style={
                                    getTextStyle(
                                        "subtitle"
                                    )
                                }
                            >
                                {selectedItem.title}
                            </h3>

                        </div>

                        <div className="resto_service_info_modal_body">

                            {selectedItem.key === "contact" ? (

                                <div className="resto_service_info_contact_list">

                                    {selectedItem.phone && (

                                        <a
                                            href={
                                                `tel:${selectedItem.phone.replace(
                                                    /[^\d+]/g,
                                                    ""
                                                )
                                                }`
                                            }
                                            className="resto_service_info_contact_item"
                                        >

                                            <span className="resto_service_info_contact_icon">

                                                <svg
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
                                                </svg>

                                            </span>

                                            <span className="resto_service_info_contact_content">

                                                <strong>
                                                    Teléfono
                                                </strong>

                                                <span>
                                                    {selectedItem.phone}
                                                </span>

                                            </span>

                                        </a>

                                    )}

                                    {selectedItem.whatsapp && (

                                        <a
                                            href={
                                                `https://wa.me/${selectedItem.whatsapp}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="resto_service_info_contact_item"
                                        >

                                            <span className="resto_service_info_contact_icon">

                                                <svg
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.3-5A8.5 8.5 0 1 1 21 11.5z" />
                                                    <path d="M8.5 8.5c.5 3 2 4.5 5 5" />
                                                </svg>

                                            </span>

                                            <span className="resto_service_info_contact_content">

                                                <strong>
                                                    WhatsApp
                                                </strong>

                                                <span>
                                                    {selectedItem.whatsapp}
                                                </span>

                                            </span>

                                        </a>

                                    )}

                                    {selectedItem.email && (

                                        <a
                                            href={
                                                `mailto:${selectedItem.email}`
                                            }
                                            className="resto_service_info_contact_item"
                                        >

                                            <span className="resto_service_info_contact_icon">

                                                <svg
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <rect
                                                        x="3"
                                                        y="5"
                                                        width="18"
                                                        height="14"
                                                        rx="2"
                                                    />
                                                    <path d="m3 7 9 6 9-6" />
                                                </svg>

                                            </span>

                                            <span className="resto_service_info_contact_content">

                                                <strong>
                                                    Email
                                                </strong>

                                                <span>
                                                    {selectedItem.email}
                                                </span>

                                            </span>

                                        </a>

                                    )}

                                    {(selectedItem.phone ||
                                        selectedItem.whatsapp) && (

                                            <p className="resto_service_info_contact_note">
                                                Consultas y reservas por teléfono o WhatsApp.
                                            </p>

                                        )}

                                </div>

                            ) : selectedItem.key === "location" ? (

                                <div className="resto_service_info_location">

                                    <div className="resto_service_info_location_address">

                                        <span className="resto_service_info_location_address_icon">

                                            <InfoIcon
                                                type="location"
                                            />

                                        </span>

                                        <span>
                                            {selectedItem.address}
                                        </span>

                                    </div>

                                    {selectedItem.googleMapsEmbedUrl && (

                                        <div className="resto_service_info_location_map">

                                            <iframe
                                                src={
                                                    selectedItem.googleMapsEmbedUrl
                                                }
                                                title={
                                                    `Mapa de ${selectedItem.address}`
                                                }
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                                allowFullScreen
                                            />

                                        </div>

                                    )}

                                    {selectedItem.googleMapsOpenUrl && (

                                        <a
                                            href={
                                                selectedItem.googleMapsOpenUrl
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="resto_service_info_location_action"
                                        >
                                            <InfoIcon
                                                type="location"
                                            />

                                            <span>
                                                Cómo llegar
                                            </span>
                                        </a>

                                    )}

                                </div>

                            ) : selectedItem.description ? (

                                <p
                                    className="resto_service_info_modal_description"
                                    style={
                                        getTextStyle(
                                            "text"
                                        )
                                    }
                                >
                                    {selectedItem.description}
                                </p>

                            ) : null}

                        </div>

                    </div>

                </div>

            )}

        </section>

    );

}