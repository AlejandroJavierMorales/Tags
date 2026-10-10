export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { eventAccessError, requireEventSession } from "@/app/modules/e-events/lib/eventApiAccess";
import { businessHasProEventsAddon, businessHasSimpleEventsAddon } from "@/app/modules/e-events/lib/eventAddonAccess";

export async function GET(req) {
    const access =
        await requireEventSession();

    if (!access.ok) return eventAccessError(access);
    if (access.isStaff && access.session?.type !== "business_staff") {
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

        const requestedBusinessId =
            Number(searchParams.get("business_id") || 0);
        const productMode = searchParams.get("product_mode") === "simple" ? "simple" : "pro";

        if (requestedBusinessId > 0) {
            const addonEnabled = productMode === "simple"
                ? await businessHasSimpleEventsAddon(requestedBusinessId)
                : await businessHasProEventsAddon(requestedBusinessId);
            if (!addonEnabled) return Response.json({ error: productMode === "simple" ? "Eventos no está habilitado para este cliente" : "Eventos Pro no está habilitado para este cliente" }, { status: 403 });
        }


        if (access.session?.type === "business_staff") {
            const appCode = productMode === "simple" ? "events" : "e_events";
            const [[staffAccess]] = await db.query(
                "SELECT permissions_json FROM tags_business_staff_app_access WHERE staff_id=? AND business_id=? AND app_code=? AND status='active' LIMIT 1",
                [Number(access.session.staffId || 0), Number(access.businessId || 0), appCode]
            );
            let permissions = [];
            try { permissions = Array.isArray(staffAccess?.permissions_json) ? staffAccess.permissions_json : JSON.parse(staffAccess?.permissions_json || "[]"); } catch {}
            if (!permissions.some(code => ["dashboard.view", "events.view", "events.manage"].includes(code))) return eventAccessError({ status: 403, error: "No tenés permiso para ver eventos" });
        }

        const conditions = ["1=1"];
        const params = [];

        if (requestedBusinessId > 0) {
            conditions.push("product_code = ?");
            params.push(productMode === "simple" ? "events" : "e_events");
        }

        if (access.isPlatformAdmin && requestedBusinessId > 0) {
            conditions.push("business_id = ?");
            params.push(requestedBusinessId);
        } else if (!access.isPlatformAdmin) {
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
