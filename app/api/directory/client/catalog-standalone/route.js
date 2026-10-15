import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { safeParseJSON } from "@/app/modules/qr-page/lib/safeParseJSON";
import { createAppQRCode } from "@/app/modules/qr/lib/createAppQRCode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cleanText = (value, fallback = "", max = 180) => String(value ?? fallback).trim().slice(0, max);
const cleanColor = value => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : "#f58220";

async function getContext(conn, businessId, pageId, lock = false) {
  const [rows] = await conn.query(
    `SELECT p.id page_id,b.name business_name,b.logo_url,sl.slug listing_slug,ds.primary_host,s.id section_id,s.settings_json
       FROM tags_qr_pages p
       INNER JOIN tags_businesses b ON b.id=p.business_id
       INNER JOIN tags_directory_listings l ON l.qr_page_id=p.id AND l.business_id=p.business_id
       INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
       INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id
       LEFT JOIN tags_qr_page_sections s ON s.page_id=p.id AND s.type='catalog'
      WHERE p.id=? AND p.business_id=? AND p.page_type='directory'
      ORDER BY (sl.publication_status='published') DESC,sl.id,s.id LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [pageId, businessId]
  );
  return rows[0] || null;
}

function responseConfig(row, origin) {
  const current = safeParseJSON(row.settings_json).catalogStandalone || {};
  return {
    enabled: current.enabled !== false,
    defaultCategory: cleanText(current.defaultCategory, "Promociones", 80),
    title: cleanText(current.title, "Mirá nuestro catálogo"),
    subtitle: cleanText(current.subtitle, "Productos, precios y promociones"),
    frameColor: cleanColor(current.frameColor),
    frameStyle: ["full", "top-right", "top-left", "none"].includes(current.frameStyle) ? current.frameStyle : "full",
    showLogo: current.showLogo !== false,
    socialPreset: ["square", "portrait", "story"].includes(current.socialPreset) ? current.socialPreset : "portrait",
    qrCodeId: Number(current.qrCodeId || 0) || null,
    qrCode: current.qrCode || null,
    publicUrl: `${row.primary_host ? `https://${String(row.primary_host).replace(/^https?:\/\//, "").replace(/\/+$/, "")}` : String(origin).replace(/\/+$/, "")}/${row.listing_slug}/catalogo`,
    logoUrl: row.logo_url || null,
    businessName: row.business_name
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const businessId = Number(url.searchParams.get("businessId") || 0);
  const pageId = Number(url.searchParams.get("pageId") || 0);
  if (!businessId || !pageId) return Response.json({ error: "Datos incompletos" }, { status: 400 });
  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  const row = await getContext(db, businessId, pageId);
  if (!row?.section_id) return Response.json({ error: "Primero creá el catálogo" }, { status: 404 });
  return Response.json({ ok: true, config: responseConfig(row, url.origin) });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const businessId = Number(body?.businessId || 0);
  const pageId = Number(body?.pageId || 0);
  if (!body || !businessId || !pageId) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const row = await getContext(conn, businessId, pageId, true);
    if (!row?.section_id) throw new Error("Primero creá el catálogo");
    const settings = safeParseJSON(row.settings_json);
    const current = settings.catalogStandalone || {};
    const publicOrigin = row.primary_host ? `https://${String(row.primary_host).replace(/^https?:\/\//, "").replace(/\/+$/, "")}` : new URL(request.url).origin;
    const publicUrl = `${publicOrigin}/${row.listing_slug}/catalogo`;
    let qrCodeId = Number(current.qrCodeId || 0);
    let qrCode = current.qrCode || null;
    if (qrCodeId) {
      const [[owned]] = await conn.query("SELECT id,code FROM tags_qr_codes WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE", [qrCodeId, businessId]);
      if (owned) qrCode = owned.code;
      else qrCodeId = 0;
    }
    if (!qrCodeId) {
      const qr = await createAppQRCode({ conn, businessId, label: `Catálogo · ${row.business_name}`, value: publicUrl, finalUrl: publicUrl, skipCapacityCheck: true, allowTrial: true });
      qrCodeId = Number(qr.id);
      qrCode = qr.code;
    } else {
      await conn.query("UPDATE tags_qr_codes SET label=?,value=?,final_url=?,is_active=1,status='active' WHERE id=? AND business_id=?", [`Catálogo · ${row.business_name}`, publicUrl, publicUrl, qrCodeId, businessId]);
    }
    const categories = Array.isArray(settings.directoryCategories) ? settings.directoryCategories : [];
    const hasPromotions = categories.some(item => String(item).localeCompare("Promociones", "es", { sensitivity: "base" }) === 0);
    const nextSettings = {
      ...settings,
      directoryBaseSlot: "catalog",
      directoryCategories: hasPromotions ? categories : ["Promociones", ...categories],
      catalogStandalone: {
        enabled: body.enabled !== false,
        defaultCategory: cleanText(body.defaultCategory, "Promociones", 80),
        title: cleanText(body.title, "Mirá nuestro catálogo"),
        subtitle: cleanText(body.subtitle, "Productos, precios y promociones"),
        frameColor: cleanColor(body.frameColor),
        frameStyle: ["full", "top-right", "top-left", "none"].includes(body.frameStyle) ? body.frameStyle : "full",
        showLogo: body.showLogo !== false,
        socialPreset: ["square", "portrait", "story"].includes(body.socialPreset) ? body.socialPreset : "portrait",
        qrCodeId, qrCode
      }
    };
    await conn.query("UPDATE tags_qr_page_sections SET settings_json=?,updated_at=NOW() WHERE id=? AND page_id=?", [JSON.stringify(nextSettings), row.section_id, pageId]);
    await conn.commit();
    return Response.json({ ok: true, config: responseConfig({ ...row, settings_json: nextSettings }, new URL(request.url).origin) });
  } catch (error) {
    await conn.rollback();
    console.error("DIRECTORY CATALOG STANDALONE ERROR", error);
    return Response.json({ error: error.message || "No se pudo guardar" }, { status: error.status || 500 });
  } finally { conn.release(); }
}
