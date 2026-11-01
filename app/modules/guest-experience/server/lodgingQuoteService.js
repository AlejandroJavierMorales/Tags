import crypto from "node:crypto";
import {
  createGuestToken,
  hashGuestToken,
  parseGuestJson,
} from "../lib/guestExperienceService.js";

function quoteCode() {
  return `COT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createLodgingQuote(
  connection,
  { app, selected, startsOn, endsOn, adults, children, bedOccupants = null, expiresMinutes = 30 },
) {
  if (!selected?.ratePlan || !selected?.pricing?.configured) return null;
  const token = createGuestToken();
  const code = quoteCode();
  const total = Number(selected.pricing.total || 0);
  const subtotal = Number(selected.pricing.subtotal ?? total);
  const discountTotal = Number(selected.pricing.discountTotal || 0);
  const settings = parseGuestJson(app.settings_json);
  const depositPercentage = Math.max(0, Math.min(100, Number(settings.depositPercentage || 0)));
  const depositRequired = Number(((total * depositPercentage) / 100).toFixed(2));
  const expiresAt = new Date(Date.now() + Math.max(5, Number(expiresMinutes || 30)) * 60000);
  const pricingSnapshot = {
    version: 1,
    ratePlan: selected.ratePlan,
    currency: selected.pricing.currency || app.currency || "ARS",
    chargeableOccupants: selected.pricing.chargeableOccupants,
    averageNightlyRate: selected.pricing.averageNightlyRate,
    lodgingTotal: total,
    lodgingSubtotal: subtotal,
    discountsTotal: discountTotal,
    promotion: selected.pricing.promotion || null,
    depositPercentage,
    depositRequiredAmount: depositRequired,
    days: selected.pricing.days,
  };
  const appliedRules = {
    ruleIds: selected.restrictions?.appliedRuleIds || [],
    restrictions: selected.restrictions?.reasons || [],
    minimumNights: selected.restrictions?.minimumNights || null,
    maximumNights: selected.restrictions?.maximumNights || null,
  };
  const [result] = await connection.query(
    `INSERT INTO tags_guest_lodging_quotes
      (guest_app_id, unit_id, rate_plan_id, quote_code, access_token_hash, status,
       availability_decision, starts_on, ends_on, nights, adults, children, bed_occupants,
       chargeable_occupants, currency, lodging_subtotal, extras_total, discounts_total,
       total_amount, deposit_percentage, deposit_required_amount, pricing_snapshot_json,
       applied_rules_json, expires_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
    [
      app.id,
      selected.unitId,
      selected.ratePlan.id,
      code,
      hashGuestToken(token),
      selected.decision,
      startsOn,
      endsOn,
      selected.pricing.days.length,
      adults,
      children,
      bedOccupants,
      selected.pricing.chargeableOccupants,
      selected.pricing.currency || app.currency || "ARS",
      subtotal,
      discountTotal,
      total,
      depositPercentage,
      depositRequired,
      JSON.stringify(pricingSnapshot),
      JSON.stringify(appliedRules),
      expiresAt,
    ],
  );
  if (selected.pricing.promotion?.id) {
    await connection.query(
      `INSERT INTO tags_guest_lodging_promotion_uses
        (guest_app_id,promotion_id,quote_id,idempotency_key,status,currency,base_amount,discount_amount,promotion_snapshot_json,expires_at)
       VALUES (?,?,?,?,'reserved',?,?,?,?,?)`,
      [app.id, selected.pricing.promotion.id, result.insertId, `quote:${code}`, selected.pricing.currency || app.currency || "ARS", subtotal, discountTotal, JSON.stringify(selected.pricing.promotion), expiresAt],
    );
  }
  return {
    id: result.insertId,
    code,
    accessToken: token,
    expiresAt,
    currency: selected.pricing.currency || app.currency || "ARS",
    averageNightlyRate: selected.pricing.averageNightlyRate,
    lodgingTotal: total,
    depositPercentage,
    depositRequiredAmount: depositRequired,
    pricingSnapshot,
  };
}
