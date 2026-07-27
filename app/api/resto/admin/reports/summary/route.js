export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";
import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

const PERIOD_DAYS = {
    today:
        1,
    "7":
        7,
    "30":
        30,
    "90":
        90
};

function isoDateInBuenosAires() {
    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "America/Argentina/Buenos_Aires",
                year:
                    "numeric",
                month:
                    "2-digit",
                day:
                    "2-digit"
            }
        )
            .formatToParts(
                new Date()
            )
            .reduce(
                (
                    result,
                    part
                ) => ({
                    ...result,
                    [part.type]:
                        part.value
                }),
                {}
            );

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDate(
    date,
    days
) {
    const value =
        new Date(
            `${date}T12:00:00Z`
        );

    value.setUTCDate(
        value.getUTCDate() +
        days
    );

    return value
        .toISOString()
        .slice(0, 10);
}

function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/
        .test(
            String(value || "")
        );
}

function money(value) {
    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? Number(
            parsed.toFixed(2)
        )
        : 0;
}

export async function GET(req) {
    try {
        const {
            searchParams
        } =
            new URL(req.url);

        const businessId =
            searchParams.get(
                "businessId"
            );
        const period =
            searchParams.get(
                "period"
            ) ||
            "today";

        if (!businessId) {
            return Response.json(
                {
                    error:
                        "businessId es requerido"
                },
                {
                    status:
                        400
                }
            );
        }

        const access =
            await getRestoAccess({
                businessId,
                permission:
                    "history.view"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const today =
            isoDateInBuenosAires();
        let from =
            today;
        let to =
            today;

        if (
            period ===
            "custom"
        ) {
            const requestedFrom =
                searchParams.get(
                    "from"
                );
            const requestedTo =
                searchParams.get(
                    "to"
                );

            if (
                !validDate(
                    requestedFrom
                ) ||
                !validDate(
                    requestedTo
                ) ||
                requestedFrom >
                requestedTo
            ) {
                return Response.json(
                    {
                        error:
                            "El período personalizado es inválido"
                    },
                    {
                        status:
                            400
                    }
                );
            }

            from =
                requestedFrom;
            to =
                requestedTo;
        } else {
            const days =
                PERIOD_DAYS[
                    period
                ] ||
                PERIOD_DAYS.today;

            from =
                shiftDate(
                    today,
                    -(
                        days -
                        1
                    )
                );
        }

        const fromDateTime =
            `${from} 00:00:00`;
        const toExclusive =
            `${shiftDate(
                to,
                1
            )} 00:00:00`;

        const [storeRows] =
            await db.query(
                `
                SELECT
                    id,
                    name,
                    currency
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'resto'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                {
                    error:
                        "Tags Resto no encontrado"
                },
                {
                    status:
                        404
                }
            );
        }

        const [refundTableRows] =
            await db.query(
                `
                SELECT 1
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'tags_resto_refunds'
                LIMIT 1
                `
            );

        const hasRefunds =
            refundTableRows.length >
            0;

        const [
            paymentSummaryResult,
            orderSummaryResult,
            paymentMethodResult,
            serviceModeResult,
            productResult,
            dailyPaymentResult
        ] =
            await Promise.all([
                db.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(p.amount),
                            0
                        ) AS collected,
                        COUNT(*) AS payment_count,
                        COUNT(
                            DISTINCT p.session_id
                        ) AS paid_orders
                    FROM tags_resto_payments p
                    INNER JOIN tags_resto_sessions s
                        ON s.id = p.session_id
                        AND s.store_id = ?
                    WHERE p.status = 'confirmed'
                    AND COALESCE(
                        p.paid_at,
                        p.created_at
                    ) >= ?
                    AND COALESCE(
                        p.paid_at,
                        p.created_at
                    ) < ?
                    `,
                    [
                        store.id,
                        fromDateTime,
                        toExclusive
                    ]
                ),
                db.query(
                    `
                    SELECT
                        COUNT(*) AS orders_count,
                        SUM(
                            s.status = 'cancelled'
                        ) AS cancelled_orders,
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN s.status NOT IN (
                                        'closed',
                                        'cancelled'
                                    )
                                    THEN GREATEST(
                                        COALESCE(s.total, 0) -
                                        COALESCE(s.paid_total, 0),
                                        0
                                    )
                                    ELSE 0
                                END
                            ),
                            0
                        ) AS pending_amount
                    FROM tags_resto_sessions s
                    WHERE s.store_id = ?
                    AND s.created_at >= ?
                    AND s.created_at < ?
                    `,
                    [
                        store.id,
                        fromDateTime,
                        toExclusive
                    ]
                ),
                db.query(
                    `
                    SELECT
                        p.payment_method,
                        COUNT(*) AS operations,
                        COALESCE(
                            SUM(p.amount),
                            0
                        ) AS amount
                    FROM tags_resto_payments p
                    INNER JOIN tags_resto_sessions s
                        ON s.id = p.session_id
                        AND s.store_id = ?
                    WHERE p.status = 'confirmed'
                    AND COALESCE(
                        p.paid_at,
                        p.created_at
                    ) >= ?
                    AND COALESCE(
                        p.paid_at,
                        p.created_at
                    ) < ?
                    GROUP BY
                        p.payment_method
                    ORDER BY
                        amount DESC
                    `,
                    [
                        store.id,
                        fromDateTime,
                        toExclusive
                    ]
                ),
                db.query(
                    `
                    SELECT
                        COALESCE(
                            s.service_mode,
                            'unknown'
                        ) AS service_mode,
                        COUNT(*) AS orders_count,
                        COALESCE(
                            SUM(s.total),
                            0
                        ) AS ordered_total
                    FROM tags_resto_sessions s
                    WHERE s.store_id = ?
                    AND s.created_at >= ?
                    AND s.created_at < ?
                    GROUP BY
                        s.service_mode
                    ORDER BY
                        orders_count DESC
                    `,
                    [
                        store.id,
                        fromDateTime,
                        toExclusive
                    ]
                ),
                db.query(
                    `
                    SELECT
                        i.title,
                        i.variant_title,
                        COALESCE(
                            SUM(i.quantity),
                            0
                        ) AS quantity,
                        COALESCE(
                            SUM(i.total_price),
                            0
                        ) AS ordered_total
                    FROM tags_resto_session_items i
                    INNER JOIN tags_resto_sessions s
                        ON s.id = i.session_id
                        AND s.store_id = ?
                    WHERE s.created_at >= ?
                    AND s.created_at < ?
                    AND i.preparation_status <> 'cancelled'
                    GROUP BY
                        i.title,
                        i.variant_title
                    ORDER BY
                        quantity DESC,
                        ordered_total DESC
                    LIMIT 10
                    `,
                    [
                        store.id,
                        fromDateTime,
                        toExclusive
                    ]
                ),
                db.query(
                    `
                    SELECT
                        DATE_FORMAT(
                            COALESCE(
                                p.paid_at,
                                p.created_at
                            ),
                            '%Y-%m-%d'
                        ) AS report_date,
                        COALESCE(
                            SUM(p.amount),
                            0
                        ) AS collected
                    FROM tags_resto_payments p
                    INNER JOIN tags_resto_sessions s
                        ON s.id = p.session_id
                        AND s.store_id = ?
                    WHERE p.status = 'confirmed'
                    AND COALESCE(
                        p.paid_at,
                        p.created_at
                    ) >= ?
                    AND COALESCE(
                        p.paid_at,
                        p.created_at
                    ) < ?
                    GROUP BY
                        DATE_FORMAT(
                            COALESCE(
                                p.paid_at,
                                p.created_at
                            ),
                            '%Y-%m-%d'
                        )
                    ORDER BY
                        report_date ASC
                    `,
                    [
                        store.id,
                        fromDateTime,
                        toExclusive
                    ]
                )
            ]);

        const paymentSummaryRows =
            paymentSummaryResult[0] ||
            [];
        const orderSummaryRows =
            orderSummaryResult[0] ||
            [];
        const paymentMethodRows =
            paymentMethodResult[0] ||
            [];
        const serviceModeRows =
            serviceModeResult[0] ||
            [];
        const productRows =
            productResult[0] ||
            [];
        const dailyPaymentRows =
            dailyPaymentResult[0] ||
            [];

        let refundSummary = {
            refunded:
                0,
            refund_count:
                0
        };
        let refundByDate = [];

        if (hasRefunds) {
            const [
                refundSummaryResult,
                refundDailyResult
            ] =
                await Promise.all([
                    db.query(
                        `
                        SELECT
                            COALESCE(
                                SUM(amount),
                                0
                            ) AS refunded,
                            COUNT(*) AS refund_count
                        FROM tags_resto_refunds
                        WHERE store_id = ?
                        AND refunded_at >= ?
                        AND refunded_at < ?
                        `,
                        [
                            store.id,
                            fromDateTime,
                            toExclusive
                        ]
                    ),
                    db.query(
                        `
                        SELECT
                            DATE_FORMAT(
                                refunded_at,
                                '%Y-%m-%d'
                            )
                                AS report_date,
                            COALESCE(
                                SUM(amount),
                                0
                            ) AS refunded
                        FROM tags_resto_refunds
                        WHERE store_id = ?
                        AND refunded_at >= ?
                        AND refunded_at < ?
                        GROUP BY
                            DATE_FORMAT(
                                refunded_at,
                                '%Y-%m-%d'
                            )
                        ORDER BY
                            report_date ASC
                        `,
                        [
                            store.id,
                            fromDateTime,
                            toExclusive
                        ]
                    )
                ]);

            refundSummary =
                refundSummaryResult[0][0] ||
                refundSummary;
            refundByDate =
                refundDailyResult[0] ||
                [];
        }

        const paymentSummary =
            paymentSummaryRows[0] ||
            {};
        const orderSummary =
            orderSummaryRows[0] ||
            {};
        const collected =
            money(
                paymentSummary.collected
            );
        const refunded =
            money(
                refundSummary.refunded
            );
        const net =
            money(
                collected -
                refunded
            );
        const paidOrders =
            Number(
                paymentSummary.paid_orders ||
                0
            );

        const dailyMap =
            new Map();

        dailyPaymentRows.forEach(
            row => {
                const date =
                    String(
                        row.report_date
                    ).slice(
                        0,
                        10
                    );

                dailyMap.set(
                    date,
                    {
                        date,
                        collected:
                            money(
                                row.collected
                            ),
                        refunded:
                            0
                    }
                );
            }
        );

        refundByDate.forEach(
            row => {
                const date =
                    String(
                        row.report_date
                    ).slice(
                        0,
                        10
                    );
                const current =
                    dailyMap.get(
                        date
                    ) ||
                    {
                        date,
                        collected:
                            0,
                        refunded:
                            0
                    };

                current.refunded =
                    money(
                        row.refunded
                    );

                dailyMap.set(
                    date,
                    current
                );
            }
        );

        const daily =
            Array.from(
                dailyMap.values()
            )
                .map(
                    row => ({
                        ...row,
                        net:
                            money(
                                row.collected -
                                row.refunded
                            )
                    })
                )
                .sort(
                    (
                        left,
                        right
                    ) =>
                        left.date.localeCompare(
                            right.date
                        )
                );

        return Response.json({
            ok:
                true,
            store,
            period: {
                key:
                    period,
                from,
                to
            },
            kpis: {
                collected,
                refunded,
                net,
                paid_orders:
                    paidOrders,
                average_ticket:
                    paidOrders > 0
                        ? money(
                            net /
                            paidOrders
                        )
                        : 0,
                payment_count:
                    Number(
                        paymentSummary.payment_count ||
                        0
                    ),
                refund_count:
                    Number(
                        refundSummary.refund_count ||
                        0
                    ),
                orders_count:
                    Number(
                        orderSummary.orders_count ||
                        0
                    ),
                cancelled_orders:
                    Number(
                        orderSummary.cancelled_orders ||
                        0
                    ),
                pending_amount:
                    money(
                        orderSummary.pending_amount
                    )
            },
            payment_methods:
                paymentMethodRows.map(
                    row => ({
                        ...row,
                        operations:
                            Number(
                                row.operations ||
                                0
                            ),
                        amount:
                            money(
                                row.amount
                            )
                    })
                ),
            service_modes:
                serviceModeRows.map(
                    row => ({
                        ...row,
                        orders_count:
                            Number(
                                row.orders_count ||
                                0
                            ),
                        ordered_total:
                            money(
                                row.ordered_total
                            )
                    })
                ),
            top_products:
                productRows.map(
                    row => ({
                        ...row,
                        quantity:
                            Number(
                                row.quantity ||
                                0
                            ),
                        ordered_total:
                            money(
                                row.ordered_total
                            )
                    })
                ),
            daily
        });
    } catch (error) {
        console.error(
            "RESTO REPORTS SUMMARY ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    error.message ||
                    "No se pudieron cargar los reportes"
            },
            {
                status:
                    500
            }
        );
    }
}
