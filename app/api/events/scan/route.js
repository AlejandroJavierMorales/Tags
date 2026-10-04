export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { checkInEventAttendee, EventCheckinError } from "@/app/modules/e-events/lib/eventCheckinService";

export async function POST(req) {
    try {
        const body =
            await req.json().catch(() => null);

        const result =
            await checkInEventAttendee({
                code: body?.code,
                token: body?.token,
                eventId: body?.event_id,
                request: req
            });

        return Response.json(result);
    } catch (error) {
        if (error instanceof EventCheckinError) {
            return Response.json(
                {
                    ok: false,
                    error: error.message,
                    code: error.code
                },
                { status: error.status }
            );
        }

        console.error("EVENT SCAN ERROR", error);
        return Response.json(
            {
                ok: false,
                error: "No se pudo acreditar el ingreso"
            },
            { status: 500 }
        );
    }
}
