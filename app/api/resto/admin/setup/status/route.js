export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";
import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

function parseJson(value) {
    if (
        value &&
        typeof value === "object"
    ) {
        return value;
    }

    if (!value) {
        return {};
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function hasText(value) {
    return Boolean(
        String(value || "")
            .trim()
    );
}

function modeEnabled(
    modes,
    key,
    fallback = false
) {
    const value =
        modes?.[key];

    if (
        value &&
        typeof value === "object"
    ) {
        return value.enabled !==
            false;
    }

    return value === undefined
        ? fallback
        : value === true;
}

export async function GET(req) {
    try {
        const businessId =
            new URL(req.url)
                .searchParams
                .get("businessId");

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
                    "settings.view"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT
                    id,
                    name,
                    logo_url,
                    email,
                    whatsapp,
                    address,
                    status,
                    settings_json
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

        const [countRows] =
            await db.query(
                `
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM tags_store_categories
                        WHERE store_id = ?
                        AND is_visible = 1
                    ) AS categories,
                    (
                        SELECT COUNT(*)
                        FROM tags_store_products
                        WHERE store_id = ?
                        AND is_visible = 1
                    ) AS products,
                    (
                        SELECT COUNT(*)
                        FROM tags_resto_locations
                        WHERE store_id = ?
                        AND location_type IN (
                            'table',
                            'counter'
                        )
                        AND is_active = 1
                    ) AS tables_count,
                    (
                        SELECT COUNT(*)
                        FROM tags_resto_cash_registers
                        WHERE store_id = ?
                        AND is_active = 1
                    ) AS cash_registers,
                    (
                        SELECT COUNT(*)
                        FROM tags_resto_staff
                        WHERE store_id = ?
                        AND status = 'active'
                        AND role_id IS NOT NULL
                    ) AS staff
                `,
                [
                    store.id,
                    store.id,
                    store.id,
                    store.id,
                    store.id
                ]
            );

        const counts =
            countRows[0] ||
            {};
        const settings =
            parseJson(
                store.settings_json
            );
        const contact =
            settings.resto_contact ||
            {};
        const location =
            settings.resto_location ||
            {};
        const operation =
            settings.resto_operation ||
            {};
        const payment =
            settings.resto_payment ||
            {};
        const kitchen =
            settings.resto_kitchen ||
            settings.kitchen ||
            {};
        const modes =
            settings.serviceModes ||
            settings.service_modes ||
            {};
        const bankAccounts =
            Array.isArray(
                settings.resto_bank_accounts
            )
                ? settings.resto_bank_accounts
                : [];

        const tableEnabled =
            modeEnabled(
                modes,
                "table",
                true
            );
        const takeawayEnabled =
            modeEnabled(
                modes,
                "takeaway",
                true
            );
        const deliveryEnabled =
            modeEnabled(
                modes,
                "delivery",
                false
            );
        const enabledHours =
            Object.values(
                operation.opening_hours ||
                {}
            ).filter(
                day =>
                    day?.enabled ===
                    true &&
                    hasText(day?.open) &&
                    hasText(day?.close)
            );
        const paymentConfigured =
            [
                payment.accept_cash,
                payment.accept_transfer,
                payment.accept_card,
                payment.accept_mercado_pago
            ].some(
                value =>
                    value === true
            );
        const transferReady =
            payment.accept_transfer !==
                true ||
            bankAccounts.some(
                account =>
                    account?.is_active !==
                    false &&
                    (
                        hasText(account?.alias) ||
                        hasText(account?.cbu)
                    )
            );

        const steps = [
            {
                key:
                    "identity",
                title:
                    "Identidad del restaurante",
                description:
                    "Nombre y logo cargados",
                complete:
                    hasText(store.name) &&
                    hasText(store.logo_url),
                route:
                    "settings?tab=identity"
            },
            {
                key:
                    "contact",
                title:
                    "Contacto y ubicación",
                description:
                    "Domicilio y al menos un canal de contacto",
                complete:
                    hasText(
                        location.address ||
                        store.address
                    ) &&
                    [
                        contact.email,
                        contact.phone,
                        contact.whatsapp,
                        store.email,
                        store.whatsapp
                    ].some(hasText),
                route:
                    "settings?tab=location"
            },
            {
                key:
                    "modes",
                title:
                    "Modalidades de atención",
                description:
                    "Mesa, retiro o delivery habilitado",
                complete:
                    tableEnabled ||
                    takeawayEnabled ||
                    deliveryEnabled,
                route:
                    "settings?tab=operation"
            },
            {
                key:
                    "hours",
                title:
                    "Horarios de atención",
                description:
                    "Al menos un día operativo configurado",
                complete:
                    enabledHours.length > 0,
                route:
                    "settings?tab=operation"
            },
            {
                key:
                    "locations",
                title:
                    "Sectores y mesas",
                description:
                    tableEnabled
                        ? "Al menos una mesa o barra activa"
                        : "No requerido para las modalidades elegidas",
                complete:
                    !tableEnabled ||
                    Number(
                        counts.tables_count
                    ) > 0,
                route:
                    "locations"
            },
            {
                key:
                    "menu",
                title:
                    "Carta gastronómica",
                description:
                    "Categorías y productos visibles",
                complete:
                    Number(
                        counts.categories
                    ) > 0 &&
                    Number(
                        counts.products
                    ) > 0,
                route:
                    "products"
            },
            {
                key:
                    "payments",
                title:
                    "Pagos y cuentas",
                description:
                    "Medios de pago y cuenta bancaria cuando corresponde",
                complete:
                    paymentConfigured &&
                    transferReady,
                route:
                    "settings?tab=payments"
            },
            {
                key:
                    "cash",
                title:
                    "Caja",
                description:
                    "Al menos una caja activa",
                complete:
                    Number(
                        counts.cash_registers
                    ) > 0,
                route:
                    "cash"
            },
            {
                key:
                    "staff",
                title:
                    "Personal",
                description:
                    "Al menos un empleado activo con rol y permisos",
                complete:
                    Number(
                        counts.staff
                    ) > 0,
                route:
                    "staff"
            },
            {
                key:
                    "kitchen",
                title:
                    "Cocina y alertas",
                description:
                    "Tiempos de cocina y alertas definidos",
                complete:
                    Object.keys(
                        kitchen
                    ).length > 0 &&
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            operation,
                            "staff_alerts_enabled"
                        ),
                route:
                    "settings?tab=orders"
            },
            {
                key:
                    "publication",
                title:
                    "Publicación",
                description:
                    "Restaurante disponible para clientes",
                complete:
                    store.status ===
                    "published",
                route:
                    ""
            }
        ];

        const completed =
            steps.filter(
                step =>
                    step.complete
            ).length;
        const progress =
            Math.round(
                (
                    completed /
                    steps.length
                ) *
                100
            );

        return Response.json({
            ok:
                true,
            completed,
            total:
                steps.length,
            progress,
            ready:
                progress ===
                100,
            steps
        });
    } catch (error) {
        console.error(
            "RESTO SETUP STATUS ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    "No se pudo calcular la configuración inicial"
            },
            {
                status:
                    500
            }
        );
    }
}
