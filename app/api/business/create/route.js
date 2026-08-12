import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

  const conn = await db.getConnection();

  try {

    const body = await req.json();

    const {
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
      start_date,        // opcional
      duration_months    // opcional (default 1)
    } = body;

    // -----------------------------
    // VALIDACIÓN
    // -----------------------------
    if (!name || !email || !plan_id) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    const primaryPlaceId = Number(primary_place_id || 0) || null;
    const latitudeValue = latitude === "" || latitude == null ? null : Number(latitude);
    const longitudeValue = longitude === "" || longitude == null ? null : Number(longitude);
    if ((latitudeValue != null && (!Number.isFinite(latitudeValue) || latitudeValue < -90 || latitudeValue > 90)) || (longitudeValue != null && (!Number.isFinite(longitudeValue) || longitudeValue < -180 || longitudeValue > 180))) {
      throw new Error("Coordenadas inválidas");
    }
    if (primaryPlaceId) {
      const [placeRows] = await conn.execute("SELECT id FROM tags_geo_places WHERE id=? AND place_type IN ('locality','city') AND is_active=1 LIMIT 1", [primaryPlaceId]);
      if (!placeRows.length) throw new Error("Localidad inválida");
    }

    // -----------------------------
    // 1. CREATE BUSINESS
    // -----------------------------
    const [bizResult] = await conn.execute(
      `
      INSERT INTO tags_businesses
      (
        name,
        display_name,
        email,
        phone,
        description,
        logo_url,
        cover_url,
        whatsapp,
        address,
        postal_code,
        latitude,
        longitude,
        website_url,
        instagram_url,
        facebook_url,
        tiktok_url,
        youtube_url,
        linkedin_url,
        google_reviews_url,
        maps_url,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        name.trim(),
        display_name?.trim() || name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        description?.trim() || null,
        logo_url?.trim() || null,
        cover_url?.trim() || null,
        whatsapp?.trim() || null,
        address?.trim() || null,
        postal_code?.trim() || null,
        latitudeValue,
        longitudeValue,
        website_url?.trim() || null,
        instagram_url?.trim() || null,
        facebook_url?.trim() || null,
        tiktok_url?.trim() || null,
        youtube_url?.trim() || null,
        linkedin_url?.trim() || null,
        google_reviews_url?.trim() || null,
        maps_url?.trim() || null
      ]
    );

    const businessId = bizResult.insertId;

    if (primaryPlaceId) {
      await conn.execute("INSERT INTO tags_business_places (business_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)", [businessId, primaryPlaceId]);
    }

    // -----------------------------
    // 2. GET PLAN SNAPSHOT
    // -----------------------------
    const [planRows] = await conn.execute(
      `
      SELECT price, currency
      FROM tags_plans
      WHERE id = ?
      `,
      [plan_id]
    );

    const plan = planRows?.[0];

    if (!plan) {
      throw new Error("Plan not found");
    }

    // -----------------------------
    // 3. FECHAS DE SUSCRIPCIÓN
    // -----------------------------
    const startedAt = start_date
      ? new Date(start_date)
      : new Date();

    const months = duration_months ? Number(duration_months) : 1;

    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // -----------------------------
    // 4. CREAR SUBSCRIPCIÓN
    // -----------------------------
    await conn.execute(
      `
      INSERT INTO tags_subscriptions
      (
        business_id,
        plan_id,
        status,
        payment_provider,
        amount,
        currency,
        started_at,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'active', 'manual', ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        businessId,
        plan_id,
        plan.price,
        plan.currency,
        startedAt,
        expiresAt
      ]
    );

    // -----------------------------
    // 5. COMMIT
    // -----------------------------
    await conn.commit();

    return Response.json({
      ok: true,
      business_id: businessId
    });

  } catch (e) {

    await conn.rollback();

    console.error("CREATE BUSINESS ERROR:", e);

    return Response.json(
      { error: "Error creando cliente" },
      { status: 500 }
    );

  } finally {
    conn.release();
  }
}
