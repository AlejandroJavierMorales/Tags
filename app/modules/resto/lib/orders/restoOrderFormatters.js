// =====================================
// FILE: /app/modules/resto/lib/orders/restoOrderFormatters.js
// Descripción:
// Funciones de presentación para pedidos de Tags Resto.
// Centraliza importes, fechas, tiempos transcurridos,
// numeración, cliente y ubicación.
// =====================================

export function formatRestoOrderPrice(
    value,
    currency = "ARS",
    locale = "es-AR"
) {

    const numericValue =
        Number(
            value
        );

    const safeValue =
        Number.isFinite(
            numericValue
        )
            ? numericValue
            : 0;

    try {

        return new Intl.NumberFormat(
            locale,
            {
                style:
                    "currency",

                currency,

                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    2
            }
        ).format(
            safeValue
        );

    } catch {

        return `$ ${safeValue.toLocaleString(
            locale,
            {
                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    2
            }
        )}`;

    }

}

export function formatRestoOrderDate(
    value,
    options = {}
) {

    if (!value) {

        return "Sin fecha";

    }

    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Sin fecha";

    }

    const {
        locale = "es-AR",
        timeOnly = false,
        dateOnly = false,
        includeSeconds = false
    } = options;

    if (
        timeOnly
    ) {

        return new Intl.DateTimeFormat(
            locale,
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    includeSeconds
                        ? "2-digit"
                        : undefined
            }
        ).format(
            date
        );

    }

    if (
        dateOnly
    ) {

        return new Intl.DateTimeFormat(
            locale,
            {
                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric"
            }
        ).format(
            date
        );

    }

    return new Intl.DateTimeFormat(
        locale,
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                includeSeconds
                    ? "2-digit"
                    : undefined
        }
    ).format(
        date
    );

}

export function getRestoOrderElapsedTime(
    value,
    now = new Date()
) {

    if (!value) {

        return "Sin tiempo";

    }

    const startDate =
        value instanceof Date
            ? value
            : new Date(
                value
            );

    const endDate =
        now instanceof Date
            ? now
            : new Date(
                now
            );

    if (
        Number.isNaN(
            startDate.getTime()
        ) ||
        Number.isNaN(
            endDate.getTime()
        )
    ) {

        return "Sin tiempo";

    }

    const differenceInMilliseconds =
        Math.max(
            0,
            endDate.getTime() -
            startDate.getTime()
        );

    const totalMinutes =
        Math.floor(
            differenceInMilliseconds /
            60000
        );

    if (
        totalMinutes <
        1
    ) {

        return "Ahora";

    }

    if (
        totalMinutes <
        60
    ) {

        return `${totalMinutes} min`;

    }

    const totalHours =
        Math.floor(
            totalMinutes /
            60
        );

    const remainingMinutes =
        totalMinutes %
        60;

    if (
        totalHours <
        24
    ) {

        if (
            remainingMinutes ===
            0
        ) {

            return `${totalHours} h`;

        }

        return `${totalHours} h ${remainingMinutes} min`;

    }

    const totalDays =
        Math.floor(
            totalHours /
            24
        );

    const remainingHours =
        totalHours %
        24;

    if (
        remainingHours ===
        0
    ) {

        return totalDays ===
            1
            ? "1 día"
            : `${totalDays} días`;

    }

    return totalDays ===
        1
        ? `1 día ${remainingHours} h`
        : `${totalDays} días ${remainingHours} h`;

}

export function formatRestoOrderNumber(
    order
) {

    if (!order) {

        return "Sin número";

    }

    if (
        order.order_number
    ) {

        return String(
            order.order_number
        );

    }

    if (
        order.id !==
        undefined &&
        order.id !==
        null
    ) {

        return `#${order.id}`;

    }

    return "Sin número";

}

export function formatRestoCustomerName(
    order
) {

    if (!order) {

        return "Cliente sin nombre";

    }

    const customerName =
        String(
            order.customer_name ||
            ""
        ).trim();

    if (
        customerName
    ) {

        return customerName;

    }

    const customerEmail =
        String(
            order.customer_email ||
            ""
        ).trim();

    if (
        customerEmail
    ) {

        return customerEmail;

    }

    const customerPhone =
        String(
            order.customer_phone ||
            ""
        ).trim();

    if (
        customerPhone
    ) {

        return customerPhone;

    }

    return "Cliente sin nombre";

}

export function formatRestoLocationName(
    value
) {

    if (
        value ===
        undefined ||
        value ===
        null
    ) {

        return "Sin ubicación";

    }

    const normalizedValue =
        String(
            value
        ).trim();

    if (
        !normalizedValue
    ) {

        return "Sin ubicación";

    }

    const lowerValue =
        normalizedValue.toLowerCase();

    if (
        lowerValue.startsWith(
            "mesa "
        ) ||
        lowerValue.startsWith(
            "barra "
        ) ||
        lowerValue.startsWith(
            "sector "
        )
    ) {

        return normalizedValue;

    }

    return `Mesa ${normalizedValue}`;

}