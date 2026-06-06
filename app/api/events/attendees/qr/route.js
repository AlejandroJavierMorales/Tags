export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import QRCode
    from "qrcode";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

export async function GET(req) {

    try {

        // =========================
        // SESSION
        // =========================

        const session =
            await getEventSession();

        if (!session) {

            return Response.json(
                {
                    error:
                        "Unauthorized"
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

                    "attendees.view"
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
        // PARAMS
        // =========================

        const { searchParams } =
            new URL(req.url);

        const attendeeId =
            searchParams.get("id");

        if (!attendeeId) {

            return Response.json(
                {
                    error:
                        "Falta ID"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // GET ATTENDEE
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    a.*,

                    e.business_id

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                WHERE a.id = ?

                LIMIT 1
                `,
                [attendeeId]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Invitado no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const attendee =
            rows[0];

        // =========================
        // VALIDATE OWNER
        // =========================

        if (
            attendee.business_id !==
            session.businessId
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

        // =========================
        // QR URL
        // =========================

        const qrUrl =
            `${process.env.NEXT_PUBLIC_APP_URL}/checkin/${attendee.qr_token}`;

        // =========================
        // GENERATE QR
        // =========================

        const qrBase64 =
            await QRCode.toDataURL(
                qrUrl,
                {
                    width: 500,
                    margin: 2
                }
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            qr:
                qrBase64,

            token:
                attendee.qr_token,

            url:
                qrUrl
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