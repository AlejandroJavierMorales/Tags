export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import { getSubscriptionFoundationStatus } from "@/app/modules/subscriptions/lib/subscriptionSchema";
import { createVersionedPlan, versionExistingPlan } from "@/app/modules/subscriptions/lib/planVersionService";
import { db } from "@/app/lib/tags-db";

async function syncDirectoryPrices(conn, planId, versionId) {
  await conn.query("DELETE FROM tags_plan_version_prices WHERE plan_version_id=?", [versionId]);
  const [rows] = await conn.query("SELECT p.*,s.name site_name FROM tags_directory_plan_prices p INNER JOIN tags_directory_sites s ON s.id=p.site_id WHERE p.plan_id=? AND p.is_active=1 AND s.is_active=1", [planId]);
  for (const row of rows) {
    const settings = JSON.stringify({ siteId: Number(row.site_id), siteName: row.site_name });
    for (let month = 1; month <= 12; month += 1) {
      const field = `manual_month_${String(month).padStart(2, "0")}`;
      const amount = Number(row[field] || 0);
      if (amount > 0) await conn.query("INSERT INTO tags_plan_version_prices (plan_version_id,price_code,billing_mode,provider,duration_months,calendar_month,amount,currency,is_active,settings_json) VALUES (?,?,'manual',NULL,1,?,?,?,1,?)", [versionId, `site_${row.site_id}_${field}`, month, amount, row.currency || "ARS", settings]);
    }
    for (const duration of [3, 6, 12]) {
      const amount = Number(row[`manual_pack_${duration}`] || 0);
      if (amount > 0) await conn.query("INSERT INTO tags_plan_version_prices (plan_version_id,price_code,billing_mode,provider,duration_months,calendar_month,amount,currency,is_active,settings_json) VALUES (?,?,'manual',NULL,?,NULL,?,?,1,?)", [versionId, `site_${row.site_id}_manual_pack_${duration}`, duration, amount, row.currency || "ARS", settings]);
    }
    const recurring = Number(row.mercadopago_monthly || 0);
    if (recurring > 0) await conn.query("INSERT INTO tags_plan_version_prices (plan_version_id,price_code,billing_mode,provider,duration_months,calendar_month,amount,currency,is_active,settings_json) VALUES (?,?,'recurring','mercadopago',1,NULL,?,?,1,?)", [versionId, `site_${row.site_id}_mercadopago_monthly`, recurring, row.currency || "ARS", settings]);
  }
}

export async function POST(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  try {
    const foundation = await getSubscriptionFoundationStatus();
    if (!foundation.ready) return Response.json({ ok: false, error: "Primero ejecutá la migración fundacional del Centro de Suscripciones", missing: foundation.missing }, { status: 409 });
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ ok: false, error: "Cuerpo JSON inválido" }, { status: 400 });
    const result = await createVersionedPlan(body, Number(access.session?.businessId || access.session?.id || 0) || null);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("SUBSCRIPTION CENTER PLAN CREATE ERROR", error);
    return Response.json({ ok: false, error: error?.message || "No se pudo crear el plan" }, { status: error?.status || 500 });
  }
}

export async function PUT(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  try {
    const foundation = await getSubscriptionFoundationStatus();
    if (!foundation.ready) return Response.json({ ok: false, error: "Primero ejecutá la migración fundacional", missing: foundation.missing }, { status: 409 });
    const body = await req.json().catch(() => null);
    const planId = Number(body?.planId || body?.id || 0);
    if (!planId) return Response.json({ ok: false, error: "Falta el plan" }, { status: 400 });
    const actorId = Number(access.session?.businessId || access.session?.id || 0) || null;

    if (body?.action === "sync_directory_prices") {
      const { versionId } = await versionExistingPlan(planId, actorId);
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await syncDirectoryPrices(conn, planId, versionId);
        await conn.commit();
        return Response.json({ ok: true });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally { conn.release(); }
    }

    if (body?.action === "update_full") {
      const { versionId } = await versionExistingPlan(planId, actorId);
      const name = String(body?.name || "").trim();
      if (!name) return Response.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("UPDATE tags_plans SET name=?,description=?,max_qr_codes=?,is_active=?,is_public=?,is_free=? WHERE id=?", [name, String(body?.description || "").trim() || null, Math.max(0, Number(body?.maxQrCodes || 0)), body?.isActive ? 1 : 0, body?.visibility === "private" ? 0 : 1, body?.isFree ? 1 : 0, planId]);
        await conn.query("UPDATE tags_plan_versions SET name=?,description=? WHERE id=?", [name, String(body?.description || "").trim() || null, versionId]);
        await conn.query("DELETE FROM tags_plan_version_addons WHERE plan_version_id=?", [versionId]);
        for (const addon of Array.isArray(body?.addons) ? body.addons : []) {
          if (!addon?.addonCode || Number(addon.quantity || 0) <= 0) continue;
          await conn.query("INSERT INTO tags_plan_version_addons (plan_version_id,addon_code,quantity,entitlement_config_json) VALUES (?,?,?,?)", [versionId, String(addon.addonCode).slice(0, 80), Math.max(1, Number(addon.quantity)), JSON.stringify(addon.config || {})]);
        }
        if (["directory_web", "directory_web_plus"].includes(String(body?.code || ""))) {
          const siteId = Number(body?.siteId || 0);
          if (!siteId) throw Object.assign(new Error("Seleccioná el Directorio cuyos precios querés editar"), { status: 400 });
          const monthFields = Array.from({ length: 12 }, (_, index) => `manual_month_${String(index + 1).padStart(2, "0")}`);
          const monthValues = monthFields.map((field, index) => Math.max(0, Number(body?.monthly?.[index] || 0)));
          await conn.query(`INSERT INTO tags_directory_plan_prices (site_id,plan_id,currency,${monthFields.join(",")},manual_pack_3,manual_pack_6,manual_pack_12,mercadopago_monthly,is_active,created_at,updated_at) VALUES (?,?,'ARS',${monthFields.map(() => "?").join(",")},?,?,?,?,1,NOW(),NOW()) ON DUPLICATE KEY UPDATE currency=VALUES(currency),${monthFields.map(field => `${field}=VALUES(${field})`).join(",")},manual_pack_3=VALUES(manual_pack_3),manual_pack_6=VALUES(manual_pack_6),manual_pack_12=VALUES(manual_pack_12),mercadopago_monthly=VALUES(mercadopago_monthly),is_active=1,updated_at=NOW()`, [siteId, planId, ...monthValues, Math.max(0, Number(body?.pack3 || 0)), Math.max(0, Number(body?.pack6 || 0)), Math.max(0, Number(body?.pack12 || 0)), Math.max(0, Number(body?.recurring || 0))]);
          await syncDirectoryPrices(conn, planId, versionId);
        } else {
          await conn.query("DELETE FROM tags_plan_version_prices WHERE plan_version_id=?", [versionId]);
          for (const price of Array.isArray(body?.prices) ? body.prices : []) {
            if (!price?.priceCode || Number(price.amount || 0) < 0) continue;
            const recurring = price.billingMode === "recurring";
            await conn.query("INSERT INTO tags_plan_version_prices (plan_version_id,price_code,billing_mode,provider,duration_months,calendar_month,amount,currency,is_active,settings_json) VALUES (?,?,?,?,?,?,?,?,1,?)", [versionId, String(price.priceCode).slice(0, 80), recurring ? "recurring" : "manual", recurring ? "mercadopago" : null, Math.max(1, Number(price.durationMonths || 1)), price.calendarMonth ? Number(price.calendarMonth) : null, Number(price.amount || 0), price.currency || "ARS", JSON.stringify(price.settings || {})]);
          }
        }
        await conn.commit();
        return Response.json({ ok: true, planId, versionId });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally { conn.release(); }
    }

    if (body?.action === "update") {
      const name = String(body?.name || "").trim();
      if (!name) return Response.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
      await db.query("UPDATE tags_plans SET name=?,description=?,max_qr_codes=?,is_active=?,is_public=? WHERE id=?", [name, String(body?.description || "").trim() || null, Math.max(0, Number(body?.maxQrCodes || 0)), body?.isActive ? 1 : 0, body?.isPublic ? 1 : 0, planId]);
      return Response.json({ ok: true });
    }
    const result = await versionExistingPlan(planId, actorId);
    const [[selectedPlan]] = await db.query("SELECT code FROM tags_plans WHERE id=? LIMIT 1", [planId]);
    if (["directory_web", "directory_web_plus"].includes(selectedPlan?.code)) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await syncDirectoryPrices(conn, planId, result.versionId);
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally { conn.release(); }
    }
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("SUBSCRIPTION CENTER PLAN UPDATE ERROR", error);
    return Response.json({ ok: false, error: error?.message || "No se pudo actualizar el plan" }, { status: error?.status || 500 });
  }
}

export async function DELETE(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const planId = Number(new URL(req.url).searchParams.get("id") || 0);
  if (!planId) return Response.json({ ok: false, error: "Falta el plan" }, { status: 400 });
  const [[usage]] = await db.query("SELECT COUNT(*) total FROM tags_subscriptions WHERE plan_id=?", [planId]);
  if (Number(usage?.total || 0) > 0) return Response.json({ ok: false, error: "El plan tiene suscripciones. Podés desactivarlo, pero no eliminarlo." }, { status: 409 });
  const [result] = await db.query("DELETE FROM tags_plans WHERE id=?", [planId]);
  if (!result.affectedRows) return Response.json({ ok: false, error: "Plan inexistente" }, { status: 404 });
  return Response.json({ ok: true });
}
