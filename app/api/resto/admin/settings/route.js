export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";
import {
    logRestoAudit
} from "@/app/modules/resto/lib/staff/restoAudit";

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
            SELECT
                s.*,
                b.logo_url AS business_logo_url,
                b.cover_url AS business_cover_url,
                b.email AS business_email,
                b.phone AS business_phone,
                b.whatsapp AS business_whatsapp,
                b.address AS business_address,
                b.postal_code AS business_postal_code,
                b.website_url AS business_website_url,
                b.instagram_url AS business_instagram_url,
                b.facebook_url AS business_facebook_url,
                b.latitude AS business_latitude,
                b.longitude AS business_longitude
            FROM tags_stores s
            INNER JOIN tags_businesses b
                ON b.id = s.business_id
            WHERE s.business_id = ?
            AND s.app_type = 'resto'
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

        const [reviewAddonRows] =
            await db.query(
                `SELECT 1 FROM tags_business_addons
                 WHERE business_id = ?
                 AND addon_code = 'client_reviews'
                 AND status = 'active'
                 LIMIT 1`,
                [businessId]
            );

        const settings =
            parseJson(
                store.settings_json
            );

        const sharedContact = {
            ...(settings.resto_contact || {}),
            email:
                store.business_email ||
                settings.resto_contact?.email ||
                store.email ||
                "",
            phone:
                store.business_phone ||
                settings.resto_contact?.phone ||
                "",
            whatsapp:
                store.business_whatsapp ||
                settings.resto_contact?.whatsapp ||
                store.whatsapp ||
                "",
            website:
                store.business_website_url ||
                settings.resto_contact?.website ||
                "",
            instagram:
                store.business_instagram_url ||
                settings.resto_contact?.instagram ||
                "",
            facebook:
                store.business_facebook_url ||
                settings.resto_contact?.facebook ||
                ""
        };

        const sharedLocation = {
            ...(settings.resto_location || {}),
            address:
                store.business_address ||
                settings.resto_location?.address ||
                store.address ||
                "",
            postal_code:
                store.business_postal_code ||
                settings.resto_location?.postal_code ||
                "",
            latitude:
                store.business_latitude ??
                settings.resto_location?.latitude ??
                null,
            longitude:
                store.business_longitude ??
                settings.resto_location?.longitude ??
                null
        };

        return Response.json({
            ok: true,
            store: {
                id: store.id,
                name: store.name,
                description: store.description,
                logo_url:
                    store.business_logo_url ||
                    store.logo_url,
                cover_url:
                    store.business_cover_url ||
                    store.cover_url,
                email: sharedContact.email,
                phone: sharedContact.phone,
                whatsapp: sharedContact.whatsapp,
                address: sharedLocation.address,
                currency: store.currency || "ARS",
                slug: store.slug,
                status: store.status,
                has_reviews: Boolean(reviewAddonRows?.length)
            },
            configuration: {
                contact: sharedContact,
                location: sharedLocation,
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

        const access =
            await getRestoAccess({
                businessId,
                permission:
                    "settings.manage"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
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

        await connection.query(
            `
            UPDATE tags_businesses
            SET
                logo_url = ?,
                email = ?,
                phone = ?,
                whatsapp = ?,
                address = ?,
                postal_code = ?,
                website_url = ?,
                instagram_url = ?,
                facebook_url = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                text(identity.logo_url) || null,
                text(configuration.contact?.email) || null,
                text(configuration.contact?.phone) || null,
                text(configuration.contact?.whatsapp) || null,
                text(configuration.location?.address) || null,
                text(configuration.location?.postal_code) || null,
                text(configuration.contact?.website) || null,
                text(configuration.contact?.instagram) || null,
                text(configuration.contact?.facebook) || null,
                businessId
            ]
        );

        await connection.query(
            `
            UPDATE tags_stores
            SET
                logo_url = ?,
                email = ?,
                whatsapp = ?,
                address = ?,
                updated_at = NOW()
            WHERE business_id = ?
            `,
            [
                text(identity.logo_url) || null,
                text(configuration.contact?.email) || null,
                text(configuration.contact?.whatsapp) || null,
                text(configuration.location?.address) || null,
                businessId
            ]
        );

        await logRestoAudit(
            connection,
            {
                storeId:
                    store.id,
                access,
                actionCode:
                    "settings.updated",
                entityType:
                    "store",
                entityId:
                    store.id,
                description:
                    "Configuración operativa actualizada",
                req
            }
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
