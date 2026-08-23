import { db } from "@/app/lib/tags-db";

const clean = (value, max = 190) => String(value || "").trim().slice(0, max);
const asBool = value => value === true || Number(value) === 1;

function normalizeAddons(addons) {
  const unique = new Map();
  for (const item of Array.isArray(addons) ? addons : []) {
    const addonCode = clean(item?.addonCode || item?.addon_code, 80);
    if (!addonCode) continue;
    unique.set(addonCode, {
      addonCode,
      quantity: Math.max(1, Number(item?.quantity || 1)),
      config: item?.config && typeof item.config === "object" ? item.config : {}
    });
  }
  return [...unique.values()];
}

function normalizePrices(prices, defaultCurrency = "ARS") {
  const unique = new Map();
  for (const item of Array.isArray(prices) ? prices : []) {
    const priceCode = clean(item?.priceCode || item?.price_code, 80);
    const billingMode = item?.billingMode === "recurring" ? "recurring" : "manual";
    const amount = Number(item?.amount || 0);
    if (!priceCode || !Number.isFinite(amount) || amount < 0) continue;
    unique.set(priceCode, {
      priceCode,
      billingMode,
      provider: billingMode === "recurring" ? clean(item?.provider || "mercadopago", 40) : null,
      durationMonths: Math.max(1, Number(item?.durationMonths || 1)),
      calendarMonth: item?.calendarMonth ? Math.min(12, Math.max(1, Number(item.calendarMonth))) : null,
      amount,
      currency: clean(item?.currency || defaultCurrency, 10) || "ARS",
      settings: item?.settings && typeof item.settings === "object" ? item.settings : {}
    });
  }
  return [...unique.values()];
}

export async function createVersionedPlan(input, actorId = null) {
  const conn = await db.getConnection();
  try {
    const name = clean(input?.name);
    const code = clean(input?.code, 80).toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
    const description = clean(input?.description, 4000);
    const currency = clean(input?.currency || "ARS", 10) || "ARS";
    if (!name || !code) throw Object.assign(new Error("Nombre y código son obligatorios"), { status: 400 });
    const addons = normalizeAddons(input?.addons);
    const prices = normalizePrices(input?.prices, currency);
    const ownerBusinessId = Number(input?.ownerBusinessId || 0) || null;
    const visibility = input?.visibility === "private" || ownerBusinessId ? "private" : "public";
    await conn.beginTransaction();
    const [existing] = await conn.query("SELECT id FROM tags_plans WHERE code=? LIMIT 1 FOR UPDATE", [code]);
    if (existing[0]) throw Object.assign(new Error("Ya existe un plan con ese código"), { status: 409 });
    const monthly = prices.find(item => item.priceCode === "manual_monthly") || prices.find(item => item.durationMonths === 1) || null;
    const [planResult] = await conn.query(`
      INSERT INTO tags_plans (code,name,description,price,currency,max_qr_codes,dashboard_enabled,reports_enabled,reports_email_enabled,reports_whatsapp_enabled,analytics_enabled,analytics_plus_enabled,allow_pause_qr,allow_edit_qr,priority_support,is_active,is_public,is_free,sort_order,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())
    `, [code,name,description || null,monthly?.amount || 0,currency,Math.max(0,Number(input?.maxQrCodes || 0)),1,0,0,0,0,0,0,0,0,1,visibility === "public" ? 1 : 0,asBool(input?.isFree) ? 1 : 0,Number(input?.sortOrder || 0)]);
    const planId = Number(planResult.insertId);
    const featureSnapshot = input?.features && typeof input.features === "object" ? input.features : {};
    const [versionResult] = await conn.query(`
      INSERT INTO tags_plan_versions (plan_id,version_number,name,description,currency,status,billing_config_json,feature_snapshot_json,created_by,activated_at)
      VALUES (?,1,?,?,?,'active',?,?,?,NOW())
    `, [planId,name,description || null,currency,JSON.stringify({}),JSON.stringify(featureSnapshot),actorId]);
    const versionId = Number(versionResult.insertId);
    await conn.query("INSERT INTO tags_plan_profiles (plan_id,visibility,owner_business_id,current_version_id,status,settings_json) VALUES (?,?,?,?, 'active',?)", [planId,visibility,ownerBusinessId,versionId,JSON.stringify({})]);
    if (ownerBusinessId) await conn.query("INSERT INTO tags_plan_business_assignments (plan_id,business_id,status,assigned_by) VALUES (?,?,'active',?)", [planId,ownerBusinessId,actorId]);
    for (const item of addons) await conn.query("INSERT INTO tags_plan_version_addons (plan_version_id,addon_code,quantity,entitlement_config_json) VALUES (?,?,?,?)", [versionId,item.addonCode,item.quantity,JSON.stringify(item.config)]);
    for (const item of prices) await conn.query("INSERT INTO tags_plan_version_prices (plan_version_id,price_code,billing_mode,provider,duration_months,calendar_month,amount,currency,is_active,settings_json) VALUES (?,?,?,?,?,?,?,?,1,?)", [versionId,item.priceCode,item.billingMode,item.provider,item.durationMonths,item.calendarMonth,item.amount,item.currency,JSON.stringify(item.settings)]);
    await conn.commit();
    return { planId, versionId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function versionExistingPlan(planId, actorId = null) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[plan]] = await conn.query("SELECT * FROM tags_plans WHERE id=? LIMIT 1 FOR UPDATE", [Number(planId)]);
    if (!plan) throw Object.assign(new Error("Plan inexistente"), { status: 404 });
    const [[profile]] = await conn.query("SELECT current_version_id FROM tags_plan_profiles WHERE plan_id=? LIMIT 1 FOR UPDATE", [plan.id]);
    if (profile?.current_version_id) {
      await conn.commit();
      return { planId: Number(plan.id), versionId: Number(profile.current_version_id), reused: true };
    }

    const [versionResult] = await conn.query(
      `INSERT INTO tags_plan_versions (plan_id,version_number,name,description,currency,status,billing_config_json,feature_snapshot_json,created_by,activated_at) VALUES (?,1,?,?,?,'active',?,?,?,NOW())`,
      [plan.id, plan.name, plan.description || null, plan.currency || "ARS", JSON.stringify({ importedFrom: "tags_plans" }), JSON.stringify({}), actorId]
    );
    const versionId = Number(versionResult.insertId);
    await conn.query(
      `INSERT INTO tags_plan_profiles (plan_id,visibility,owner_business_id,current_version_id,status,settings_json) VALUES (?,IF(?=1,'public','private'),NULL,?,'active',?) ON DUPLICATE KEY UPDATE current_version_id=VALUES(current_version_id),status='active',updated_at=NOW()`,
      [plan.id, Number(plan.is_public || 0), versionId, JSON.stringify({ imported: true })]
    );

    if (["directory_web", "directory_web_plus"].includes(plan.code)) {
      await conn.query(
        "INSERT IGNORE INTO tags_plan_version_addons (plan_version_id,addon_code,quantity,entitlement_config_json) VALUES (?,'directory',1,?)",
        [versionId, JSON.stringify({ imported: true })]
      );
      if (plan.code === "directory_web_plus") {
        await conn.query(
          "INSERT IGNORE INTO tags_plan_version_addons (plan_version_id,addon_code,quantity,entitlement_config_json) VALUES (?,'client_reviews',1,?)",
          [versionId, JSON.stringify({ imported: true })]
        );
      }
      const [directoryPrices] = await conn.query(
        `SELECT dpp.*,ds.name site_name FROM tags_directory_plan_prices dpp INNER JOIN tags_directory_sites ds ON ds.id=dpp.site_id AND ds.is_active=1 WHERE dpp.plan_id=? AND dpp.is_active=1 ORDER BY ds.name`,
        [plan.id]
      );
      const monthFields = Array.from({ length: 12 }, (_, index) => `manual_month_${String(index + 1).padStart(2, "0")}`);
      for (const row of directoryPrices) {
        for (let index = 0; index < monthFields.length; index += 1) {
          const amount = Number(row[monthFields[index]] || 0);
          if (amount <= 0) continue;
          await conn.query(
            `INSERT INTO tags_plan_version_prices (plan_version_id,price_code,billing_mode,provider,duration_months,calendar_month,amount,currency,is_active,settings_json) VALUES (?,?,'manual',NULL,1,?,?,?,1,?)`,
            [versionId, `site_${row.site_id}_manual_month_${String(index + 1).padStart(2, "0")}`, index + 1, amount, row.currency || "ARS", JSON.stringify({ siteId: Number(row.site_id), siteName: row.site_name })]
          );
        }
        for (const duration of [3, 6, 12]) {
          const amount = Number(row[`manual_pack_${duration}`] || 0);
          if (amount <= 0) continue;
          await conn.query(
            `INSERT INTO tags_plan_version_prices (plan_version_id,price_code,billing_mode,provider,duration_months,calendar_month,amount,currency,is_active,settings_json) VALUES (?,?,'manual',NULL,?,NULL,?,?,1,?)`,
            [versionId, `site_${row.site_id}_manual_pack_${duration}`, duration, amount, row.currency || "ARS", JSON.stringify({ siteId: Number(row.site_id), siteName: row.site_name })]
          );
        }
        const recurring = Number(row.mercadopago_monthly || 0);
        if (recurring > 0) {
          await conn.query(
            `INSERT INTO tags_plan_version_prices (plan_version_id,price_code,billing_mode,provider,duration_months,calendar_month,amount,currency,is_active,settings_json) VALUES (?,?,'recurring','mercadopago',1,NULL,?,?,1,?)`,
            [versionId, `site_${row.site_id}_mercadopago_monthly`, recurring, row.currency || "ARS", JSON.stringify({ siteId: Number(row.site_id), siteName: row.site_name })]
          );
        }
      }
    } else if (Number(plan.price || 0) > 0) {
      await conn.query(
        `INSERT INTO tags_plan_version_prices (plan_version_id,price_code,billing_mode,provider,duration_months,calendar_month,amount,currency,is_active,settings_json) VALUES (?,'legacy_monthly','manual',NULL,1,NULL,?,?,1,?)`,
        [versionId, Number(plan.price), plan.currency || "ARS", JSON.stringify({ imported: true })]
      );
    }
    await conn.commit();
    return { planId: Number(plan.id), versionId, reused: false };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
