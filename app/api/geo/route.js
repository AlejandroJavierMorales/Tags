import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { getGeo, getCachedGeo, setCachedGeo } from "@/app/utils/geo/geo-loader";

export async function POST(req) {
  try {
    const { ip: rawIp, clickId } = await req.json();
    const ip = String(rawIp || "").trim().replace(/^::ffff:/i, "");

    if (!ip || !clickId) {
      return Response.json({ ok: false });
    }

    if (["127.0.0.1", "::1", "0.0.0.0"].includes(ip)) {
      return Response.json({ ok: false });
    }

    // =========================
    // 1. CACHE EN MEMORIA
    // =========================
    let geo = getCachedGeo(ip);

    // =========================
    // 2. DB CACHE (persistente opcional)
    // =========================
    if (!geo) {
      const [cache] = await db.execute(
        "SELECT country, region, city FROM tags_geo_cache WHERE ip = ? LIMIT 1",
        [ip]
      );

      if (cache?.[0] && (cache[0].country || cache[0].region || cache[0].city)) {
        geo = cache[0];
        setCachedGeo(ip, geo);
      }
    }

    // =========================
    // 3. MAXMIND LOOKUP (solo si no existe)
    // =========================
    if (!geo) {
      const geoDB = await getGeo();
      const data = geoDB.get(ip);

      if (!data) {
        console.warn("GeoLite no encontró ubicación para IP:", ip, "click:", clickId);
      }

      geo = {
        country: data?.country?.names?.en || null,
        region: data?.subdivisions?.[0]?.names?.en || null,
        city: data?.city?.names?.en || null
      };

      setCachedGeo(ip, geo);

      // 🖫 guardar en cache DB (persistente)
      await db.execute(
        `
        INSERT INTO tags_geo_cache (ip, country, region, city)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          country = VALUES(country),
          region = VALUES(region),
          city = VALUES(city)
        `,
        [ip, geo.country, geo.region, geo.city]
      );
    }

    // =========================
    // 4. UPDATE CLICK
    // =========================
    await db.execute(
      `
      UPDATE tags_clicks
      SET country = ?, region = ?, city = ?
      WHERE id = ?
      `,
      [geo.country, geo.region, geo.city, clickId]
    );

    return Response.json({ ok: true });

  } catch (e) {
    console.error("Geo error:", { message: e.message, stack: e.stack, clickId });
    return Response.json({ ok: false, error: "geo_lookup_failed" }, { status: 500 });
  }
}
