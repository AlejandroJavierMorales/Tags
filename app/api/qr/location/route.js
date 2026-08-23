import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180)
    * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const clickId = Number(body.clickId);
    if (!Number.isInteger(clickId) || clickId <= 0) {
      return Response.json({ ok: false, error: "Click inválido" }, { status: 400 });
    }

    const [[click]] = await db.query(
      `SELECT c.id, c.created_at, q.final_url, q.destination_url
       FROM tags_clicks c
       INNER JOIN tags_qr_codes q ON q.id = c.qr_code_id
       WHERE c.id = ? AND c.created_at >= NOW() - INTERVAL 15 MINUTE
       LIMIT 1`,
      [clickId]
    );

    if (!click) {
      return Response.json({ ok: false, error: "Click vencido" }, { status: 404 });
    }

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (validCoordinate(latitude, -90, 90) && validCoordinate(longitude, -180, 180)) {
      const [places] = await db.query(
        `SELECT id, parent_id, place_type, name, latitude, longitude
         FROM tags_geo_places
         WHERE is_active = 1
           AND latitude IS NOT NULL
           AND longitude IS NOT NULL`
      );

      const placeById = new Map(places.map(place => [Number(place.id), place]));
      let nearest = null;
      for (const place of places.filter(item => item.place_type === "locality")) {
        const distance = distanceKm(latitude, longitude, Number(place.latitude), Number(place.longitude));
        if (!nearest || distance < nearest.distance) nearest = { place, distance };
      }

      // Solo asignamos localidad cuando está dentro de un radio razonable.
      // Evita etiquetar como Santa Rosa a alguien que está en otra provincia.
      if (nearest && nearest.distance <= 60) {
        let province = null;
        let cursor = nearest.place;
        for (let depth = 0; cursor && depth < 8; depth += 1) {
          if (["province", "state"].includes(cursor.place_type)) { province = cursor.name; break; }
          cursor = placeById.get(Number(cursor.parent_id));
        }
        await db.query(
          `UPDATE tags_clicks
           SET country = COALESCE(NULLIF(country, ''), 'Argentina'), region = ?, city = ?
           WHERE id = ?`,
          [province, nearest.place.name, clickId]
        );
      }
    }

    return Response.json({
      ok: true,
      destinationUrl: click.final_url || click.destination_url || "/"
    });
  } catch (error) {
    console.error("QR browser geolocation error:", error);
    return Response.json({ ok: false, error: "No se pudo actualizar la ubicación" }, { status: 500 });
  }
}
