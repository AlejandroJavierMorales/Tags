export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
                    error: "Unauthorized"
                },
                {
                    status: 401
                }
            );
        }

        // =========================
        // PARAMS
        // =========================

        const { searchParams } =
            new URL(req.url);

        const invitation_id =
            searchParams.get(
                "invitation_id"
            );

        if (!invitation_id) {

            return Response.json(
                {
                    error:
                        "invitation_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // INVITATION
        // =========================

        const [invitations] =
            await db.query(
                `
                SELECT

                    i.id,
                    i.title,
                    i.event_id,

                    e.business_id

                FROM
                    tags_event_invitations i

                INNER JOIN
                    tags_events e
                        ON e.id = i.event_id

                WHERE
                    i.id = ?

                LIMIT 1
                `,
                [
                    invitation_id
                ]
            );

        if (!invitations.length) {

            return Response.json(
                {
                    error:
                        "Invitación no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const invitation =
            invitations[0];

        // =========================
        // PERMISSIONS
        // =========================

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

        if (!isOwner) {

            if (
                session.type !==
                "event_staff"
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
                    "invitations.rsvps.export"
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

        if (
            session.role !== "admin"
            &&
            invitation.business_id !==
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
        // DATA
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    a.id,

                    a.name,

                    a.email,

                    a.phone,

                    a.status,

                    a.plus_ones_allowed,

                    a.plus_ones_confirmed,

                    a.confirmed_at,

                    a.declined_at,

                    a.qr_token,

                    a.dietary_notes,

                    a.custom_dietary_notes,

                    t.name AS table_name,

                    r.status AS rsvp_status,

                    r.companions_count,

                    r.responded_at,

                    g.access_token

                FROM
                    tags_event_invitation_guests g

                INNER JOIN
                    tags_event_attendees a
                        ON a.id =
                        g.attendee_id

                LEFT JOIN
                    tags_event_invitation_rsvps r
                        ON r.invitation_guest_id =
                        g.id

                LEFT JOIN
                    tags_event_tables t
                        ON t.id =
                        a.table_id

                WHERE
                    g.invitation_id = ?

                ORDER BY
                    a.name ASC
                `,
                [
                    invitation_id
                ]
            );

        // =========================
        // CSV
        // =========================

        const headers = [

            "ID",
            "Nombre",
            "Email",
            "Telefono",
            "Estado RSVP",
            "Estado Attendee",
            "Acompanantes Permitidos",
            "Acompanantes Confirmados",
            "Cantidad RSVP",
            "Mesa",
            "QR Token",
            "Dietary Notes",
            "Custom Dietary Notes",
            "Fecha Respuesta",
            "Fecha Confirmacion",
            "Fecha Rechazo"

        ];

        const csvRows = [

            headers.join(",")

        ];

        for (const row of rows) {

            csvRows.push([

                row.id,

                `"${row.name || ""}"`,

                `"${row.email || ""}"`,

                `"${row.phone || ""}"`,

                row.rsvp_status || "",

                row.status || "",

                row.plus_ones_allowed || 0,

                row.plus_ones_confirmed || 0,

                row.companions_count || 0,

                `"${row.table_name || ""}"`,

                `"${row.qr_token || ""}"`,

                `"${(row.dietary_notes || "").replace(/"/g, "'")}"`,

                `"${(row.custom_dietary_notes || "").replace(/"/g, "'")}"`,

                row.responded_at || "",

                row.confirmed_at || "",

                row.declined_at || ""

            ].join(","));
        }

        const csv =
            csvRows.join("\n");

        // =========================
        // RESPONSE
        // =========================

        return new Response(
            csv,
            {
                status: 200,

                headers: {

                    "Content-Type":
                        "text/csv; charset=utf-8",

                    "Content-Disposition":
                        `attachment; filename="invitation-${invitation_id}-rsvps.csv"`

                }
            }
        );

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message
            },
            {
                status: 500
            }
        );
    }
}