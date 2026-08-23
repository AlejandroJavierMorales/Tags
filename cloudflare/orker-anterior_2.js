export default {

    async fetch(request) {

        const url = new URL(request.url);

        /*
|--------------------------------------------------------------------------
| Canonicalización WWW
|--------------------------------------------------------------------------
*/

        if (url.hostname.startsWith("www.")) {

            url.hostname = url.hostname.substring(4);

            return Response.redirect(
                url.toString(),
                301
            );

        }

        const TAGS_ORIGIN =
            "https://tags.com.ar";



        /*
        |--------------------------------------------------------------------------
        | Recursos internos de Tags
        |--------------------------------------------------------------------------
        */


        if (

            url.pathname.startsWith("/__tags__/") ||

            url.pathname.startsWith("/_next/static/media/")

        ) {


            if (

                url.pathname === "/__tags__/icon.ico" ||

                url.pathname === "/__tags__/favicon.ico"

            ) {

                const referer =
                    request.headers.get("Referer");

                let resolverPath = "/";

                if (referer) {

                    try {

                        resolverPath =
                            new URL(referer).pathname || "/";

                    } catch {

                        resolverPath = "/";

                    }

                }

                const resolverResponse =
                    await fetch(
                        TAGS_ORIGIN +
                        "/api/public/domain-resolver",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                host:
                                    url.hostname.replace(/^www\./, ""),

                                path:
                                    resolverPath
                            })
                        }
                    );

                const resolver =
                    await resolverResponse.json();

                const faviconUrl =
                    resolver?.success &&
                        resolver?.domain?.favicon_url
                        ? resolver.domain.favicon_url
                        : TAGS_ORIGIN + "/icon.ico";

                return fetch(
                    faviconUrl,
                    {
                        method: "GET",
                        redirect: "follow"
                    }
                );

            }

            const realPath =
                url.pathname.startsWith("/__tags__/")
                    ? url.pathname.replace("/__tags__", "")
                    : url.pathname;

            const targetUrl =
                TAGS_ORIGIN +
                realPath +
                url.search;

            const headers =
                new Headers(request.headers);

            headers.set(
                "Host",
                new URL(TAGS_ORIGIN).hostname
            );

            return fetch(
                new Request(
                    targetUrl,
                    {
                        method: request.method,
                        headers,
                        body:
                            request.method === "GET" ||
                                request.method === "HEAD"
                                ? undefined
                                : request.body,
                        redirect: "manual"
                    }
                )
            );

        }

        /*
|--------------------------------------------------------------------------
| APIs de Tags
|--------------------------------------------------------------------------
*/

        if (

            url.pathname.startsWith("/api/")

        ) {

            const targetUrl =
                TAGS_ORIGIN +
                url.pathname +
                url.search;

            const headers =
                new Headers(request.headers);

            headers.set(
                "Host",
                new URL(TAGS_ORIGIN).hostname
            );

            headers.set(
                "X-Forwarded-Host",
                url.hostname
            );

            headers.set(
                "X-Forwarded-Proto",
                "https"
            );

            return fetch(
                new Request(
                    targetUrl,
                    {
                        method: request.method,
                        headers,
                        body:
                            request.method === "GET" ||
                                request.method === "HEAD"
                                ? undefined
                                : request.body,
                        redirect: "manual"
                    }
                )
            );

        }

        /*
        |--------------------------------------------------------------------------
        | Resolver
        |--------------------------------------------------------------------------
        */

        const resolverResponse =
            await fetch(
                TAGS_ORIGIN +
                "/api/public/domain-resolver",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        host: url.hostname.replace(/^www\./, ""),
                        path: url.pathname
                    })
                }
            );

        const resolver =
            await resolverResponse.json();

        if (!resolver.success) {

            return fetch(request);

        }



        /*
        |--------------------------------------------------------------------------
        | Proxy a Tags
        |--------------------------------------------------------------------------
        */

        const targetUrl =
            resolver.origin +
            resolver.target +
            (resolver.route?.suffix || "") +
            url.search;

        const headers =
            new Headers(request.headers);

        headers.set(
            "Host",
            new URL(resolver.origin).hostname
        );

        headers.set(
            "X-Forwarded-Host",
            url.hostname
        );

        headers.set(
            "X-Forwarded-Proto",
            "https"
        );

        const response =
            await fetch(
                targetUrl,
                {
                    method: request.method,
                    headers,
                    body:
                        request.method === "GET" ||
                            request.method === "HEAD"
                            ? undefined
                            : request.body,
                    redirect: "manual"
                }
            );

        const contentType =
            response.headers.get("content-type") || "";

        if (
            !contentType.includes("text/html")
        ) {

            return response;

        }

        let html =
            await response.text();

        html =
            html.replace(
                /(["'=])\/_next\//g,
                '$1/__tags__/_next/'
            );

        html =
            html.replace(
                /(["'=])\/images\//g,
                '$1/__tags__/images/'
            );

        html =
            html.replace(
                /(["'=])\/assets\//g,
                '$1/__tags__/assets/'
            );

        html =
            html.replace(
                /(["'=])\/favicon\.ico/g,
                '$1/__tags__/favicon.ico'
            );

        html =
            html.replace(
                /(["'=])\/icon\.ico/g,
                '$1/__tags__/icon.ico'
            );

        html = html.replace(
            /url\(\/_next\/static\/media\//g,
            "url(/__tags__/_next/static/media/"
        );

        const newHeaders =
            new Headers(response.headers);

        newHeaders.delete("content-length");

        return new Response(
            html,
            {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            }
        );

    }

};