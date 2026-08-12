// =====================================
// API: /api/public/domain-resolver
// Descripción: Resuelve un dominio y una ruta pública hacia
// una aplicación publicada dentro de la plataforma Tags.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function normalizeHost(value) {

    if (!value || typeof value !== "string") {
        return "";
    }

    let host = value
        .trim()
        .toLowerCase();

    host = host
        .replace(/^https?:\/\//, "")
        .split("/")[0]
        .split(":")[0]
        .replace(/^www\./, "");

    return host;
}

function normalizePath(value) {

    if (!value || typeof value !== "string") {
        return "/";
    }

    let path = value.trim();

    try {

        if (
            path.startsWith("http://") ||
            path.startsWith("https://")
        ) {

            const url =
                new URL(path);

            path =
                url.pathname;
        }

    } catch {

        return "/";
    }

    path =
        path.split("?")[0]
            .split("#")[0];

    if (!path.startsWith("/")) {
        path = `/${path}`;
    }

    path =
        path.replace(/\/{2,}/g, "/");

    if (
        path.length > 1 &&
        path.endsWith("/")
    ) {

        path =
            path.slice(0, -1);
    }

    return path || "/";
}

function getPublicOrigin() {

    const value =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.BASE_URL ||
        "https://www.tags.com.ar";

    return value.replace(/\/+$/, "");
}

export async function POST(req) {

    try {

        let body;

        try {

            body =
                await req.json();

        } catch {

            return Response.json(
                {
                    success: false,
                    error: "El cuerpo de la petición no es válido"
                },
                {
                    status: 400
                }
            );
        }

        const host =
            normalizeHost(body?.host);

        const requestPath =
            normalizePath(body?.path);

        if (!host) {

            return Response.json(
                {
                    success: false,
                    error: "El dominio es obligatorio"
                },
                {
                    status: 400
                }
            );
        }

        const [rows] =
            await db.query(
                `
                    SELECT
                        d.id AS domain_id,
                        d.business_id,
                        d.domain,

                        r.id AS route_id,
                        r.path AS route_path,
                        r.addon_code,
                        r.target_slug,

                        a.name AS addon_name,
                        a.addon_type,
                        a.page_type

                    FROM tags_domains d

                    INNER JOIN tags_domain_routes r
                        ON r.domain_id = d.id

                    INNER JOIN tags_addons a
                        ON a.code = r.addon_code

                    WHERE
                        (
                            d.domain = ?
                            OR d.domain = ?
                        )

                        AND d.is_active = 1
                        AND r.is_active = 1

                        AND a.is_active = 1
                        AND a.addon_type = 'page'

                        AND (
                            r.path = ?
                            OR ? LIKE CONCAT(r.path, '/%')
                        )

                    ORDER BY
                        LENGTH(r.path) DESC

                    LIMIT 1
                `,
                [
                    host,
                    `www.${host}`,
                    requestPath,
                    requestPath
                ]
            );

        if (!rows.length) {

            return Response.json(
                {
                    success: false,
                    error: "No existe una aplicación publicada para este dominio y ruta"
                },
                {
                    status: 404
                }
            );
        }

        const route =
            rows[0];

        const routePath =
            normalizePath(route.route_path);

        let suffix = "";

        if (
            requestPath !== routePath &&
            requestPath.startsWith(`${routePath}/`)
        ) {

            suffix =
                requestPath.slice(routePath.length);
        }

        /*
         * Todas las aplicaciones públicas actuales de Tags
         * ingresan por /p/[slug].
         *
         * /p/[slug] se encarga internamente de determinar si
         * corresponde renderizar QR Page, Store, Stay, Reviews,
         * Restaurant u otra aplicación pública.
         */
        const target =
            `/p/${encodeURIComponent(route.target_slug)}${suffix}`;

        return Response.json(
            {
                success: true,

                origin:
                    getPublicOrigin(),

                target,

                domain: {
                    id:
                        route.domain_id,

                    business_id:
                        route.business_id,

                    host:
                        route.domain
                },

                route: {
                    id:
                        route.route_id,

                    path:
                        routePath,

                    requested_path:
                        requestPath,

                    suffix
                },

                application: {
                    addon_code:
                        route.addon_code,

                    addon_name:
                        route.addon_name,

                    addon_type:
                        route.addon_type,

                    page_type:
                        route.page_type,

                    target_slug:
                        route.target_slug
                }
            },
            {
                status: 200,
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate"
                }
            }
        );

    } catch (err) {

        console.log(
            "PUBLIC DOMAIN RESOLVER ERROR:",
            err
        );

        return Response.json(
            {
                success: false,
                error: "Error resolviendo el dominio público"
            },
            {
                status: 500
            }
        );
    }
}