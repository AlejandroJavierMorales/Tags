// =====================================
// API: /api/business/features
// Descripción: Devuelve capacidades, límites y addons activos de un cliente.
// =====================================

import { getBusinessFeatures } from "@/app/modules/qr-page/lib/getBusinessFeature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* import { getBusinessFeatures }
    from "@/app/modules/tags-plans/lib/getBusinessFeatures"; */

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("business_id");

        if (!businessId) {
            return Response.json(
                { error: "business_id requerido" },
                { status: 400 }
            );
        }

        const features =
            await getBusinessFeatures(businessId);

        if (!features) {
            return Response.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        return Response.json({
            ok: true,
            features
        });

    } catch (err) {

        console.log("BUSINESS FEATURES ERROR:", err);

        return Response.json(
            { error: "Error obteniendo features" },
            { status: 500 }
        );
    }
}