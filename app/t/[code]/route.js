import { db } from "@/app/lib/tags-db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getGeo, getCachedGeo, setCachedGeo } from "@/app/utils/geo/geo-loader";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



function parseUserAgent(ua) {
  const device = /mobile/i.test(ua) ? "mobile" : "desktop";

  const os =
    /android/i.test(ua)
      ? "Android"
      : /iphone|ipad|ios/i.test(ua)
        ? "iOS"
        : /windows/i.test(ua)
          ? "Windows"
          : /mac/i.test(ua)
            ? "Mac"
            : "Other";

  const browser =
    /chrome/i.test(ua)
      ? "Chrome"
      : /safari/i.test(ua)
        ? "Safari"
        : /firefox/i.test(ua)
          ? "Firefox"
          : "Other";

  return { device, os, browser };
}

export async function GET(req, { params }) {
  try {
    const { code } = params;

    const cookieStore = await cookies();
    let visitorId = cookieStore.get("visitor_id")?.value;

    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    // -----------------------------
    // GET QR
    // -----------------------------
    const [rows] = await db.execute(
      "SELECT * FROM tags_qr_codes WHERE code = ?",
      [code]
    );

    const qr = rows[0];

    /* console.log("QR que llega: ***** "+JSON.stringify(qr)) */

    if (!qr) {
      return new Response("QR no encontrado", { status: 404 });
    }

    const isDemo = code === "DEMO001";
    /* const url = qr.final_url || qr.destination_url; */

    let url;

    if (isDemo) {   //Detecta si el QR ed DEMO, 

      url =
        qr.demo_preview_url ||
        qr.final_url ||
        qr.destination_url;

    } else {

      url =
        qr.final_url ||
        qr.destination_url;
    }


    // 🔴 DISABLED
    if (qr.status === "disabled") {
      return new Response(
        "QR deshabilitado",
        { status: 403 }
      );
    }

    const isDev = process.env.NODE_ENV === "development";

    const baseUrl = isDev
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_APP_URL;

    // ⛔ STOPPED
    if (qr.status === "stopped") {

      return NextResponse.redirect(
        `${baseUrl}/qr-stopped?code=${code}`
      );
    }

    // 🟡 PRIMERA ACTIVACIÓN
    if (qr.status === "assigned") {

      return NextResponse.redirect(
        `${baseUrl}/setup?code=${code}`
      );
    }

    // 🟠 REACTIVACIÓN
    if (qr.status === "pending") {

      return NextResponse.redirect(
        `${baseUrl}/activate?code=${code}`
      );
    }

    /*  if (qr.status === "disabled") {
       return new Response("QR deshabilitado", { status: 403 });
     } */

    // ⛔ QR STOPPED
    /*   if (qr.status === "stopped") {
  
        return NextResponse.redirect(
          new URL(
            `/qr-stopped?code=${code}`,
            req.url
          )
        );
      }
  
      if (!qr.destination_url && !qr.final_url) {
        return NextResponse.redirect(
          new URL(`/setup?code=${code}`, req.url)
        );
      }
  
      if (qr.status === "pending") {
        return NextResponse.redirect(
          new URL(`/activate?code=${code}`, req.url)
        );
      }
  
      const url = qr.final_url || qr.destination_url;
  
      if (!url) {
        return NextResponse.redirect(
          new URL(`/setup?code=${code}`, req.url)
        );
      } */

    // =============================
    // 🚀 TRACKING
    // =============================
    let clickId = null;

    try {
      // 🔥 IP REAL (mejor fallback)
      /*  const ip = "181.124.187.12"; *///Paraguay
      /* const ip = "8.8.8.8"; */ // Google (USA)
      /* const ip = "181.46.0.1"; */ // Argentina (aprox)
      const ip = (
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        req.ip ||
        "0.0.0.0"
      ).replace(/^::ffff:/i, "").trim();

      const userAgent = req.headers.get("user-agent") || "";
      const referrer = req.headers.get("referer") || "";

      const { device, os, browser } = parseUserAgent(userAgent);

      // -----------------------------
      // UNIQUE (visitor + día)
      // -----------------------------
      const [existing] = await db.execute(
        `
        SELECT id FROM tags_clicks
        WHERE qr_code_id = ?
        AND visitor_id = ?
        AND DATE(created_at) = CURDATE()
        LIMIT 1
        `,
        [qr.id, visitorId]
      );

      const isUnique = existing.length === 0 ? 1 : 0;

      // -----------------------------
      // INSERT CLICK
      // -----------------------------
      const [insert] = await db.execute(
        `
        INSERT INTO tags_clicks
        (
          qr_code_id,
          ip,
          user_agent,
          referrer,
          country,
          city,
          visitor_id,
          device_type,
          os,
          browser,
          is_unique
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          qr.id,
          ip,
          userAgent,
          referrer,
          null,
          null,
          visitorId,
          device,
          os,
          browser,
          isUnique
        ]
      );

      clickId = insert.insertId;

      // -----------------------------
      // CACHE
      // -----------------------------
      await db.execute(
        `
        UPDATE tags_qr_codes
        SET total_clicks = COALESCE(total_clicks, 0) + 1,
            last_click_at = NOW()
        WHERE id = ?
        `,
        [qr.id]
      );

      if (qr.business_id) {
        await db.execute(
          `
          UPDATE tags_businesses
          SET total_clicks = COALESCE(total_clicks, 0) + 1,
              last_activity_at = NOW()
          WHERE id = ?
          `,
          [qr.business_id]
        );
      }



      // -----------------------------
      // DAILY STATS
      // -----------------------------
      await db.execute(
        `
        INSERT INTO tags_stats_daily
        (qr_code_id, date, clicks, unique_clicks)
        VALUES (?, CURDATE(), 1, ?)
        ON DUPLICATE KEY UPDATE
          clicks = clicks + 1,
          unique_clicks = unique_clicks + ?
        `,
        [qr.id, isUnique, isUnique]
      );

      // -----------------------------
      // 🌍 GEO ASYNC (NO BLOQUEANTE)
      // -----------------------------
      /* console.log("*** Click Id " + clickId + " ip " + ip) */
      if (
        clickId &&
        ip &&
        ip !== "0.0.0.0" &&
        ip !== "::1" &&
        ip !== "127.0.0.1"
      ) {
        // Resolver en el mismo request del escaneo. Evita depender de una
        // segunda llamada HTTP que puede ser interceptada por Cloudflare o
        // cancelada al producirse la redirección del QR.
        const edgeGeo = {
          country: req.headers.get("x-tags-geo-country") || null,
          region: req.headers.get("x-tags-geo-region") || null,
          city: req.headers.get("x-tags-geo-city") || null
        };

        // Cloudflare tiene prioridad cuando entrega ciudad. Si no la
        // entrega, se conserva MaxMind como respaldo.
        let geo = edgeGeo.city ? edgeGeo : getCachedGeo(ip);
        if (!geo && (edgeGeo.country || edgeGeo.region)) {
          geo = edgeGeo;
          setCachedGeo(ip, geo);
        }
        if (!geo) {
          const [cachedRows] = await db.execute(
            "SELECT country, region, city FROM tags_geo_cache WHERE ip = ? LIMIT 1",
            [ip]
          );
          if (cachedRows?.[0] && (cachedRows[0].country || cachedRows[0].region || cachedRows[0].city)) {
            geo = cachedRows[0];
            setCachedGeo(ip, geo);
          }
        }
        if (!geo) {
          const geoDB = await getGeo();
          const data = geoDB.get(ip);
          geo = {
            country: data?.country?.names?.en || null,
            region: data?.subdivisions?.[0]?.names?.en || null,
            city: data?.city?.names?.en || null
          };
          setCachedGeo(ip, geo);

          await db.execute(
            `INSERT INTO tags_geo_cache (ip, country, region, city)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               country = VALUES(country),
               region = VALUES(region),
               city = VALUES(city)`,
            [ip, geo.country, geo.region, geo.city]
          );
        }

        await db.execute(
          `UPDATE tags_clicks SET country = ?, region = ?, city = ? WHERE id = ?`,
          [geo.country, geo.region, geo.city, clickId]
        );
      }

    } catch (e) {
      console.log("Error tracking:", e.message);
    }


    // =====================================
    // TAGS RESTO
    // =====================================

    if (qr.product_id) {

      const [productRows] =
        await db.execute(
          `
            SELECT
                t.code AS qr_type
            FROM tags_products p

            INNER JOIN tags_qr_types t
                ON t.id = p.qr_type_id

            WHERE p.id = ?
            LIMIT 1
            `,
          [
            qr.product_id
          ]
        );

      /* if (
        productRows.length &&
        productRows[0].qr_type === "tags_resto"
      ) {

        return NextResponse.redirect(
          `${baseUrl}/api/resto/public/session/open?code=${code}`
        );

      } */

    }

    // =============================
    // RESPONSE + COOKIE
    // =============================
    if (!url) {

      return NextResponse.redirect(
        `${baseUrl}/setup?code=${code}`
      );
    }
    // La pantalla intermedia permite pedir geolocalización del navegador con
    // consentimiento. Luego recupera el destino original y continúa.
    const requestUrl = new URL(req.url);
    const forwardedHost = (
      req.headers.get("x-tags-public-host") ||
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      ""
    ).split(",")[0].trim();
    const forwardedProto = (
      req.headers.get("x-forwarded-proto") ||
      requestUrl.protocol.replace(":", "")
    ).split(",")[0].trim().replace(/:$/, "") || "https";
    const configuredOrigin = String(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const safeConfiguredOrigin = /^https?:\/\/(?!localhost(?::|\/)|127\.0\.0\.1(?::|\/))/i.test(configuredOrigin)
      ? configuredOrigin
      : "";
    let res;
    if (clickId && Number(qr.browser_geolocation_enabled) === 1) {
      try {
        const publicOrigin = forwardedHost && !/^localhost(?::|$)|^127\.0\.0\.1(?::|$)/i.test(forwardedHost)
          ? `${forwardedProto}://${forwardedHost}`
          : (safeConfiguredOrigin || requestUrl.origin);
        const locationUrl = new URL("/qr-location", publicOrigin);
        locationUrl.searchParams.set("clickId", String(clickId));
        res = NextResponse.redirect(locationUrl);
      } catch (redirectError) {
        console.error("QR location redirect error:", redirectError.message);
        res = NextResponse.redirect(url);
      }
    } else {
      res = NextResponse.redirect(url);
    }

    res.cookies.set("visitor_id", visitorId, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });

    return res;

  } catch (error) {
    console.error("ERROR GENERAL:", error);
    return new Response("Error interno", { status: 500 });
  }
}
