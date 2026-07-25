export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

function parseJson(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function text(value) {
    return String(value || "").trim();
}

async function getStore(
    connection,
    businessId,
    lock = false
) {
    const [rows] =
        await connection.query(
            `
            SELECT *
            FROM tags_stores
            WHERE business_id = ?
            AND app_type = 'resto'
            LIMIT 1
            ${lock ? "FOR UPDATE" : ""}
            `,
            [businessId]
        );
    return rows[0] || null;
}

export async function GET(req) {
    try {
        const businessId =
            new URL(req.url)
                .searchParams
                .get("businessId");

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
                { status: 400 }
            );
        }

        const store =
            await getStore(
                db,
                businessId
            );

        if (!store) {
            return Response.json(
                { error: "Tags Resto no encontrado" },
                { status: 404 }
            );
        }

        const settings =
            parseJson(
                store.settings_json
            );

        return Response.json({
            ok: true,
            store: {
                id: store.id,
                name: store.name,
                description: store.description,
                logo_url: store.logo_url,
                email: store.email,
                whatsapp: store.whatsapp,
                address: store.address,
                currency: store.currency || "ARS",
                slug: store.slug,
                status: store.status
            },
            configuration: {
                contact:
                    settings.resto_contact || {},
                location:
                    settings.resto_location || {},
                operation:
                    settings.resto_operation || {},
                order_rules:
                    settings.resto_order_rules || {},
                kitchen:
                    settings.resto_kitchen || {},
                payment:
                    settings.resto_payment || {},
                bank_accounts:
                    Array.isArray(
                        settings.resto_bank_accounts
                    )
                        ? settings.resto_bank_accounts
                        : [],
                service_modes:
                    settings.serviceModes ||
                    settings.service_modes ||
                    {}
            }
        });
    } catch (error) {
        console.error(
            "RESTO SETTINGS GET ERROR:",
            error
        );
        return Response.json(
            {
                error:
                    "No se pudo cargar la configuración"
            },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    let connection;
    try {
        const body =
            await req.json();

        const businessId =
            text(body?.businessId);

        const identity =
            body?.identity || {};

        const configuration =
            body?.configuration || {};

        if (
            !businessId ||
            !text(identity.name)
        ) {
            return Response.json(
                {
                    error:
                        "El nombre del restaurante es requerido"
                },
                { status: 400 }
            );
        }

        connection =
            await db.getConnection();
        await connection.beginTransaction();

        const store =
            await getStore(
                connection,
                businessId,
                true
            );

        if (!store) {
            throw Object.assign(
                new Error(
                    "Tags Resto no encontrado"
                ),
                { status: 404 }
            );
        }

        const currentSettings =
            parseJson(
                store.settings_json
            );

        const bankAccounts =
            (
                Array.isArray(
                    configuration.bank_accounts
                )
                    ? configuration.bank_accounts
                    : []
            )
                .map(
                    (account, index) => ({
                        id:
                            text(account.id) ||
                            `account-${Date.now()}-${index}`,
                        label:
                            text(account.label),
                        holder:
                            text(account.holder),
                        bank:
                            text(account.bank),
                        alias:
                            text(account.alias),
                        cbu:
                            text(account.cbu),
                        currency:
                            text(account.currency) ||
                            "ARS",
                        is_active:
                            account.is_active !== false
                    })
                )
                .filter(
                    account =>
                        account.alias ||
                        account.cbu
                );

        const nextSettings = {
            ...currentSettings,
            resto_contact:
                configuration.contact || {},
            resto_location:
                configuration.location || {},
            resto_operation:
                configuration.operation || {},
            resto_order_rules:
                configuration.order_rules || {},
            resto_kitchen:
                configuration.kitchen || {},
            resto_payment:
                configuration.payment || {},
            resto_bank_accounts:
                bankAccounts,
            serviceModes: {
                table:
                    configuration
                        .service_modes
                        ?.table
                        ?.enabled !== false,
                takeaway:
                    configuration
                        .service_modes
                        ?.takeaway
                        ?.enabled === true,
                delivery:
                    configuration
                        .service_modes
                        ?.delivery
                        ?.enabled === true
            }
        };

        await connection.query(
            `
            UPDATE tags_stores
            SET
                name = ?,
                description = ?,
                logo_url = ?,
                email = ?,
                whatsapp = ?,
                address = ?,
                currency = ?,
                settings_json = ?
            WHERE id = ?
            AND business_id = ?
            `,
            [
                text(identity.name),
                text(identity.description) || null,
                text(identity.logo_url) || null,
                text(configuration.contact?.email) || null,
                text(configuration.contact?.whatsapp) || null,
                text(configuration.location?.address) || null,
                text(configuration.payment?.currency) || "ARS",
                JSON.stringify(nextSettings),
                store.id,
                businessId
            ]
        );

        await connection.commit();

        return Response.json({
            ok: true
        });
    } catch (error) {
        if (connection) {
            await connection
                .rollback()
                .catch(() => {});
        }
        return Response.json(
            {
                error:
                    error.message ||
                    "No se pudo guardar la configuración"
            },
            {
                status:
                    error.status || 500
            }
        );
    } finally {
        connection?.release();
    }
}
