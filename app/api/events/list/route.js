export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { eventAccessError, requireEventSession } from "@/app/modules/e-events/lib/eventApiAccess";

export async function GET(req) {
    const access =
        await requireEventSession();

    if (!access.ok) return eventAccessError(access);
    if (access.isStaff) {
        return eventAccessError({
            status: 403,
            error: "Usá el listado de eventos asignados"
        });
    }

    try {
        const { searchParams } =
            new URL(req.url);

        const search =
            String(
                searchParams.get("search")
                || ""
            ).trim();

        const status =
            String(
                searchParams.get("status")
                || ""
            ).trim();

        const conditions = ["1=1"];
        const params = [];

        if (!access.isPlatformAdmin) {
            conditions.push("business_id = ?");
            params.push(access.businessId);
        }

        if (search) {
            conditions.push("name LIKE ?");
            params.push(`%${search}%`);
        }

        if (status) {
            conditions.push("status = ?");
            params.push(status);
        }

        const [rows] =
            await db.query(
                `
                SELECT *
                FROM tags_events
                WHERE ${conditions.join(" AND ")}
                ORDER BY id DESC
                `,
                params
            );

        return Response.json({
            ok: true,
            data: rows
        });
    } catch (error) {
        console.error("EVENT LIST ERROR", error);
        return Response.json(
            { error: "No se pudieron cargar los eventos" },
            { status: 500 }
        );
    }
}
