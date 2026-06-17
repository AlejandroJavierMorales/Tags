export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { v4 as uuidv4 }
    from "uuid";

import { db }
    from "@/app/lib/tags-db";

import { createQr }
    from "@/app/lib/create-qr";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

export async function POST(req) {

    try {

        // =========================
        // SESSION
        // =========================

        const session =
            await getEventSession();

        if (!session) {

            return Response.json(
                {
                    error: "Unauthorized"
                },
                {
                    status: 401
                }
            );
        }

        // =========================
        // OWNER / ADMIN
        // =========================

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

        // =========================
        // STAFF PERMISSION
        // =========================

        if (!isOwner) {

            if (
                session.type !== "event_staff"
            ) {

                return Response.json(
                    {
                        error:
                            "Sin permisos"
                    },
                    {
                        status: 403
                    }
                );
            }

            const allowed =
                await staffHasPermission(

                    session.staffId,

                    "attendees.create"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // =========================
        // BODY
        // =========================

        const body =
            await req.json();

        const {
            event_id,
            business_id,
            name,
            email,
            phone
        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (
            !event_id
            ||
            !name
        ) {

            return Response.json(
                {
                    error:
                        "Faltan datos"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // VALIDATE EVENT
        // =========================

        const [events] =
            await db.query(
                `
                SELECT id

                FROM tags_events

                WHERE
                    id = ?
                AND
                    business_id = ?

                LIMIT 1
                `,
                [
                    event_id,
                    session.businessId
                ]
            );

        if (!events.length) {

            return Response.json(
                {
                    error:
                        "Evento no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        // =========================
        // CREATE ATTENDEE
        // =========================

        const [result] =
            await db.query(
                `
                INSERT INTO tags_event_attendees (

                    event_id,
                    name,
                    email,
                    phone,
                    status,
                    created_at

                )

                VALUES (

                    ?, ?, ?, ?,
                    'pending',
                    NOW()

                )
                `,
                [
                    event_id,
                    name,
                    email || null,
                    phone || null
                ]
            );

        const attendeeId =
            result.insertId;

        // =========================
        // TOKEN
        // =========================

        const qrToken =
            uuidv4();

        // =========================
        // QR PRODUCT
        // =========================

        const [products] =
            await db.query(
                `
                SELECT
                    p.id

                FROM tags_products p

                INNER JOIN tags_qr_types t
                    ON t.id = p.qr_type_id

                WHERE
                    t.code = 'event_guest'
                AND
                    p.is_digital = 1

                LIMIT 1
                `
            );

        if (!products.length) {

            return Response.json(
                {
                    error:
                        "Producto QR Evento no encontrado"
                },
                {
                    status: 500
                }
            );
        }

        const productId =
            products[0].id;

        // =========================
        // BASE URL
        // =========================

        const base =
            process.env.NODE_ENV === "development"
                ? "http://localhost:3000"
                : process.env.NEXT_PUBLIC_BASE_URL_PROD;

        const finalUrl =
            `${base}/e/invite/${qrToken}`;

        // =========================
        // CREATE QR
        // =========================

        const qr =
            await createQr({

                business_id:
                    business_id
                    ||
                    session.businessId,

                product_id:
                    productId,

                event_id,

                label:
                    `Invitado ${name}`,

                value:
                    `EVENT-ATTENDEE-${attendeeId}`,

                final_url:
                    finalUrl
            });

        // =========================
        // SAVE QR
        // =========================

        await db.query(
            `
            UPDATE tags_event_attendees

            SET

                qr_code_id = ?,
                qr_token = ?

            WHERE id = ?
            `,
            [
                qr.id,
                qrToken,
                attendeeId
            ]
        );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            attendee_id:
                attendeeId,

            qr_id:
                qr.id,

            qr_code:
                qr.code,

            qr_token:
                qrToken,

            qr_url:
                finalUrl
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}