import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

  const conn = await db.getConnection();

  try {

    const body = await req.json();
    const hasField = (field) => Object.prototype.hasOwnProperty.call(body, field);
    const optionalText = (field) => body[field]?.trim() || null;

    const {
      id,
      name,
      email,
      phone,
      display_name,
      description,
      logo_url,
      cover_url,
      whatsapp,
      address,
      postal_code,
      latitude,
      longitude,
      primary_place_id,
      website_url,
      instagram_url,
      facebook_url,
      tiktok_url,
      youtube_url,
      linkedin_url,
      google_reviews_url,
      maps_url,
      plan_id,
      start_date,
      duration_months
    } = body;

    if (!id || !name || !email || !plan_id) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    const locationWasSent = hasField("primary_place_id");
    const primaryPlaceId = Number(primary_place_id || 0) || null;
    const latitudeValue = latitude === "" || latitude == null ? null : Number(latitude);
    const longitudeValue = longitude === "" || longitude == null ? null : Number(longitude);
    if ((hasField("latitude") && latitudeValue != null && (!Number.isFinite(latitudeValue) || latitudeValue < -90 || latitudeValue > 90)) || (hasField("longitude") && longitudeValue != null && (!Number.isFinite(longitudeValue) || longitudeValue < -180 || longitudeValue > 180))) {
      throw new Error("Coordenadas inválidas");
    }
    if (locationWasSent && primaryPlaceId) {
      const [placeRows] = await conn.execute("SELECT id FROM tags_geo_places WHERE id=? AND place_type IN ('locality','city') AND is_active=1 LIMIT 1", [primaryPlaceId]);
      if (!placeRows.length) throw new Error("Localidad inválida");
    }

    // ---------------------------------
    // 1. UPDATE BUSINESS BASIC DATA
    // ---------------------------------
    await conn.execute(
      `
      UPDATE tags_businesses
      SET
        name = ?,
        display_name = IF(?, ?, display_name),
        email = ?,
        phone = ?,
        description = IF(?, ?, description),
        logo_url = IF(?, ?, logo_url),
        cover_url = IF(?, ?, cover_url),
        whatsapp = IF(?, ?, whatsapp),
        address = IF(?, ?, address),
        postal_code = IF(?, ?, postal_code),
        latitude = IF(?, ?, latitude),
        longitude = IF(?, ?, longitude),
        website_url = IF(?, ?, website_url),
        instagram_url = IF(?, ?, instagram_url),
        facebook_url = IF(?, ?, facebook_url),
        tiktok_url = IF(?, ?, tiktok_url),
        youtube_url = IF(?, ?, youtube_url),
        linkedin_url = IF(?, ?, linkedin_url),
        google_reviews_url = IF(?, ?, google_reviews_url),
        maps_url = IF(?, ?, maps_url),
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        name.trim(),
        hasField("display_name") ? 1 : 0,
        display_name?.trim() || name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        hasField("description") ? 1 : 0, optionalText("description"),
        hasField("logo_url") ? 1 : 0, optionalText("logo_url"),
        hasField("cover_url") ? 1 : 0, optionalText("cover_url"),
        hasField("whatsapp") ? 1 : 0, optionalText("whatsapp"),
        hasField("address") ? 1 : 0, optionalText("address"),
        hasField("postal_code") ? 1 : 0, optionalText("postal_code"),
        hasField("latitude") ? 1 : 0, latitudeValue,
        hasField("longitude") ? 1 : 0, longitudeValue,
        hasField("website_url") ? 1 : 0, optionalText("website_url"),
        hasField("instagram_url") ? 1 : 0, optionalText("instagram_url"),
        hasField("facebook_url") ? 1 : 0, optionalText("facebook_url"),
        hasField("tiktok_url") ? 1 : 0, optionalText("tiktok_url"),
        hasField("youtube_url") ? 1 : 0, optionalText("youtube_url"),
        hasField("linkedin_url") ? 1 : 0, optionalText("linkedin_url"),
        hasField("google_reviews_url") ? 1 : 0, optionalText("google_reviews_url"),
        hasField("maps_url") ? 1 : 0, optionalText("maps_url"),
        id
      ]
    );

    const [directoryRows] = await conn.execute("SELECT id,qr_page_id FROM tags_directory_listings WHERE business_id=?", [id]);
    if (directoryRows.length) {
      for (const listing of directoryRows) {
      await conn.execute(
        `UPDATE tags_directory_listings SET
          display_name=IF(?,?,display_name),
          short_description=IF(?,?,short_description),
          description=IF(?,?,description),
          email=?,phone=?,whatsapp=IF(?,?,whatsapp),address=IF(?,?,address),
          latitude=IF(?,?,latitude),longitude=IF(?,?,longitude),website_url=IF(?,?,website_url),updated_at=NOW()
         WHERE id=?`,
        [
          hasField("display_name") ? 1 : 0, display_name?.trim() || name.trim(),
          hasField("description") ? 1 : 0, optionalText("description")?.slice(0, 500) || null,
          hasField("description") ? 1 : 0, optionalText("description"),
          email.trim().toLowerCase(), phone?.trim() || null,
          hasField("whatsapp") ? 1 : 0, optionalText("whatsapp"),
          hasField("address") ? 1 : 0, optionalText("address"),
          hasField("latitude") ? 1 : 0, latitudeValue,
          hasField("longitude") ? 1 : 0, longitudeValue,
          hasField("website_url") ? 1 : 0, optionalText("website_url"),
          listing.id
        ]
      );
      if (listing.qr_page_id) {
        await conn.execute(
          `UPDATE tags_qr_pages SET
            title=IF(?,?,title),description=IF(?,?,description),logo_url=IF(?,?,logo_url),cover_image_url=IF(?,?,cover_image_url),
            email=?,phone=?,whatsapp=IF(?,?,whatsapp),address=IF(?,?,address),website_url=IF(?,?,website_url),
            instagram_url=IF(?,?,instagram_url),facebook_url=IF(?,?,facebook_url),updated_at=NOW()
           WHERE id=? AND business_id=? AND page_type='directory'`,
          [
            hasField("display_name") ? 1 : 0, display_name?.trim() || name.trim(),
            hasField("description") ? 1 : 0, optionalText("description"),
            hasField("logo_url") ? 1 : 0, optionalText("logo_url"),
            hasField("cover_url") ? 1 : 0, optionalText("cover_url"),
            email.trim().toLowerCase(), phone?.trim() || null,
            hasField("whatsapp") ? 1 : 0, optionalText("whatsapp"),
            hasField("address") ? 1 : 0, optionalText("address"),
            hasField("website_url") ? 1 : 0, optionalText("website_url"),
            hasField("instagram_url") ? 1 : 0, optionalText("instagram_url"),
            hasField("facebook_url") ? 1 : 0, optionalText("facebook_url"),
            listing.qr_page_id, id
          ]
        );
      }
      }
    }

    if (locationWasSent) {
      await conn.execute("DELETE FROM tags_business_places WHERE business_id=? AND relation_type='location'", [id]);
      if (primaryPlaceId) await conn.execute("INSERT INTO tags_business_places (business_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)", [id, primaryPlaceId]);

      const [listingRows] = await conn.execute("SELECT id FROM tags_directory_listings WHERE business_id=?", [id]);
      for (const listing of listingRows) {
        await conn.execute("DELETE FROM tags_directory_listing_places WHERE listing_id=? AND relation_type='location'", [listing.id]);
        if (primaryPlaceId) await conn.execute("INSERT INTO tags_directory_listing_places (listing_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)", [listing.id, primaryPlaceId]);
      }
    }

    // ---------------------------------
    // 2. GET CURRENT ACTIVE SUBSCRIPTION
    // ---------------------------------
    const [currentSubRows] = await conn.execute(
      `
      SELECT *
      FROM tags_subscriptions
      WHERE business_id = ?
      AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
      `,
      [id]
    );

    const currentSub = currentSubRows?.[0];

    // ---------------------------------
    // 3. CHECK IF PLAN OR DATES CHANGED
    // ---------------------------------
    const planChanged = !currentSub || Number(currentSub.plan_id) !== Number(plan_id);

    const startDateChanged =
      start_date &&
      currentSub &&
      new Date(start_date).getTime() !== new Date(currentSub.started_at).getTime();

    const duration = Number(duration_months || 1);

    const startedAt = start_date
      ? new Date(start_date)
      : new Date();

    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + duration);

    // ---------------------------------
    // 4. ONLY RECREATE SUBSCRIPTION IF NEEDED
    // ---------------------------------
    if (planChanged || startDateChanged) {

      // cerrar anterior
      await conn.execute(
        `
        UPDATE tags_subscriptions
        SET status = 'inactive',
            updated_at = NOW()
        WHERE business_id = ?
        AND status = 'active'
        `,
        [id]
      );

      // obtener plan snapshot
      const [planRows] = await conn.execute(
        `
        SELECT price, currency
        FROM tags_plans
        WHERE id = ?
        `,
        [plan_id]
      );

      const plan = planRows?.[0];

      if (!plan) throw new Error("Plan not found");

      // crear nueva
      await conn.execute(
        `
        INSERT INTO tags_subscriptions (
          business_id,
          plan_id,
          status,
          payment_provider,
          amount,
          currency,
          duration_months,
          started_at,
          expires_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, 'active', 'manual', ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          id,
          plan_id,
          plan.price,
          plan.currency,
          duration,
          startedAt,
          expiresAt
        ]
      );
    }

    await conn.commit();

    return Response.json({ ok: true });

  } catch (e) {

    await conn.rollback();

    console.error("UPDATE BUSINESS ERROR:", e);

    return Response.json(
      { error: "Error actualizando cliente", detail: e?.sqlMessage || e?.message || "Error interno" },
      { status: 500 }
    );

  } finally {
    conn.release();
  }
}
