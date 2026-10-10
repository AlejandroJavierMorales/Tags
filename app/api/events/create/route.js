export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { eventAccessError, requireEventSession } from "@/app/modules/e-events/lib/eventApiAccess";
import { businessHasProEventsAddon, businessHasSimpleEventsAddon } from "@/app/modules/e-events/lib/eventAddonAccess";
import { normalizeEventSlug } from "@/app/modules/e-events/lib/eventRegistration";

const EVENT_STATUSES = new Set([
    "draft",
    "published",
    "active",
    "finished",
    "cancelled"
]);

export async function POST(req) {
    const access =
        await requireEventSession();

    if (!access.ok) return eventAccessError(access);
    if (access.isStaff && access.session?.type !== "business_staff") {
        return eventAccessError({
            status: 403,
            error: "El personal no puede crear eventos"
        });
    }

    if (
        !access.isPlatformAdmin
        && access.session.role !== "event_client"
        && access.session?.type !== "business_staff"
    ) {
        return eventAccessError({
            status: 403,
            error: "Tags Events no está habilitado para este cliente"
        });
    }

    try {
        const body =
            await req.json().catch(() => null);

        if (!body) {
            return Response.json(
                { error: "Cuerpo JSON inválido" },
                { status: 400 }
            );
        }

        const businessId =
            access.isPlatformAdmin
                ? Number(
                    body.business_id
                    || access.businessId
                    || 0
                )
                : access.businessId;

        const name =
            String(body.name || "").trim();

        const status =
            EVENT_STATUSES.has(body.status)
                ? body.status
                : "draft";

        const latitude = body.latitude === null || body.latitude === "" ? null : Number(body.latitude);
        const longitude = body.longitude === null || body.longitude === "" ? null : Number(body.longitude);
        if ((latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
            return Response.json({ error: "Revisá las coordenadas del evento" }, { status: 400 });
        }

        if (!businessId || !name) {
            return Response.json(
                {
                    error: "Negocio y nombre son obligatorios"
                },
                { status: 400 }
            );
        }

        const productMode = body.product_mode === "simple" ? "simple" : "pro";
        const addonEnabled = productMode === "simple"
            ? await businessHasSimpleEventsAddon(businessId)
            : await businessHasProEventsAddon(businessId);
        if (!addonEnabled) {
            return Response.json(
                { error: productMode === "simple" ? "El addon Eventos no está habilitado para este cliente" : "El addon Eventos Pro no está habilitado para este cliente" },
                { status: 403 }
            );
        }

        if (access.session?.type === "business_staff") {
            const appCode = productMode === "simple" ? "events" : "e_events";
            const [[staffAccess]] = await db.query(
                "SELECT permissions_json FROM tags_business_staff_app_access WHERE staff_id=? AND business_id=? AND app_code=? AND status='active' LIMIT 1",
                [Number(access.session.staffId || 0), businessId, appCode]
            );
            let permissions = [];
            try { permissions = Array.isArray(staffAccess?.permissions_json) ? staffAccess.permissions_json : JSON.parse(staffAccess?.permissions_json || "[]"); } catch {}
            if (!permissions.includes("events.manage")) return eventAccessError({ status: 403, error: "No tenés permiso para crear eventos" });
        }

        const [[business]] =
            await db.query(
                `
                SELECT id,name,email
                FROM tags_businesses
                WHERE id = ?
                LIMIT 1
                `,
                [businessId]
            );

        if (!business) {
            return Response.json(
                { error: "Empresa no encontrada" },
                { status: 404 }
            );
        }

        const connection =
            await db.getConnection();

        try {
            await connection.beginTransaction();

            const [result] =
                await connection.query(
                    `
                    INSERT INTO tags_events
                    (
                        business_id,
                        product_code,
                        name,
                        description,
                        location,
                        address,
                        latitude,
                        longitude,
                        credential_note,
                        starts_at,
                        ends_at,
                        status,
                        created_at,
                        updated_at
                    )
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
                    `,
                    [
                        businessId,
                        productMode === "simple" ? "events" : "e_events",
                        name,
                        body.description || null,
                        body.location || null,
                        String(body.address || "").trim() || null,
                        latitude,
                        longitude,
                        String(body.credential_note || "").trim() || null,
                        body.starts_at || null,
                        body.ends_at || null,
                        status
                    ]
                );

            await connection.query(
                `
                INSERT INTO tags_event_users
                (
                    event_id,
                    business_id,
                    name,
                    email,
                    password_hash,
                    role,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (?,?,?,?,?,'event_owner','active',NOW(),NOW())
                `,
                [
                    result.insertId,
                    businessId,
                    business.name,
                    business.email,
                    ""
                ]
            );

            if (productMode === "simple") {
                const publicSlug = `${normalizeEventSlug(name) || "evento"}-${result.insertId}`;
                await connection.query(
                    `INSERT INTO tags_event_registration_settings
                        (event_id,public_slug,registration_enabled,confirmation_mode,capacity,
                         public_title,public_description,require_phone,created_at,updated_at)
                     VALUES (?, ?, 1, 'manual', NULL, ?, ?, 1, NOW(), NOW())`,
                    [result.insertId, publicSlug, name, String(body.description || "").trim() || null]
                );
                await connection.query(
                    `INSERT INTO tags_event_payment_settings
                        (event_id,payment_mode,ticket_price,currency,created_at,updated_at)
                     VALUES (?, 'free', NULL, 'ARS', NOW(), NOW())`,
                    [result.insertId]
                );
            }

            await connection.commit();

            return Response.json({
                ok: true,
                id: result.insertId
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("EVENT CREATE ERROR", error);
        return Response.json(
            { error: "No se pudo crear el evento" },
            { status: 500 }
        );
    }
}
