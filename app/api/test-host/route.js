// =====================================
// FILE: app/api/test-host/route.js
// Descripción: Devuelve información de la petición para validar
// el dominio recibido por Next.js.
// =====================================

import { headers }
    from "next/headers";

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

export async function GET(request) {

    const h =
        await headers();

    return Response.json({

        ok: true,

        url:
            request.url,

        host:
            h.get("host"),

        xForwardedHost:
            h.get("x-forwarded-host"),

        xForwardedProto:
            h.get("x-forwarded-proto"),

        xForwardedFor:
            h.get("x-forwarded-for"),

        origin:
            h.get("origin"),

        referer:
            h.get("referer"),

        userAgent:
            h.get("user-agent")

    });

}