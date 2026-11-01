import {
  evaluateRateRestrictions,
  lodgingDateKey,
  resolveRatePricing,
} from "../lib/lodgingRateRules.js";

export async function loadLodgingRateContext(connection, { guestAppId, startsOn, endsOn }) {
  const [plans] = await connection.query(
    `SELECT p.*, pu.unit_id, pu.is_primary
       FROM tags_guest_rate_plan_units pu
       INNER JOIN tags_guest_rate_plans p
         ON p.id = pu.rate_plan_id
        AND p.guest_app_id = pu.guest_app_id
        AND p.is_active = 1
      WHERE pu.guest_app_id = ? AND pu.is_active = 1
      ORDER BY pu.unit_id, pu.is_primary DESC, p.is_default DESC, p.sort_order, p.id`,
    [guestAppId],
  );
  const planIds = [...new Set(plans.map((plan) => Number(plan.id)))];
  if (!planIds.length) {
    return { plansByUnit: new Map(), rules: [], planOccupancyPrices: [], ruleOccupancyPrices: [] };
  }
  const placeholders = planIds.map(() => "?").join(",");
  const [rules] = await connection.query(
    `SELECT *
       FROM tags_guest_rate_rules
      WHERE guest_app_id = ?
        AND status = 'active'
        AND (rate_plan_id IS NULL OR rate_plan_id IN (${placeholders}))
        AND starts_on <= ?
        AND ends_on >= ?
      ORDER BY priority DESC, updated_at DESC, id DESC`,
    [guestAppId, ...planIds, lodgingDateKey(endsOn), lodgingDateKey(startsOn)],
  );
  const [planOccupancyPrices] = await connection.query(
    `SELECT * FROM tags_guest_rate_occupancy_prices
      WHERE guest_app_id = ? AND is_active = 1 AND rate_plan_id IN (${placeholders})
      ORDER BY rate_plan_id, minimum_occupants, maximum_occupants`,
    [guestAppId, ...planIds],
  );
  const ruleIds = rules.map((rule) => Number(rule.id));
  let ruleOccupancyPrices = [];
  if (ruleIds.length) {
    const rulePlaceholders = ruleIds.map(() => "?").join(",");
    [ruleOccupancyPrices] = await connection.query(
      `SELECT * FROM tags_guest_rate_rule_occupancy_prices
        WHERE guest_app_id = ? AND rate_rule_id IN (${rulePlaceholders})
        ORDER BY rate_rule_id, minimum_occupants, maximum_occupants`,
      [guestAppId, ...ruleIds],
    );
  }
  const plansByUnit = new Map();
  for (const plan of plans) {
    const unitId = Number(plan.unit_id);
    if (!plansByUnit.has(unitId)) plansByUnit.set(unitId, plan);
  }
  return { plansByUnit, rules, planOccupancyPrices, ruleOccupancyPrices };
}

export function evaluateUnitRateRestrictions(
  context,
  { unitId, startsOn, endsOn, occupants, today },
) {
  const ratePlan = context?.plansByUnit?.get(Number(unitId)) || null;
  return {
    ratePlan,
    restrictions: evaluateRateRestrictions({
      startsOn,
      endsOn,
      ratePlan,
      unitId,
      rules: context?.rules || [],
      today,
    }),
    pricing: resolveRatePricing({
      startsOn,
      endsOn,
      ratePlan,
      unitId,
      occupants,
      rules: context?.rules || [],
      planOccupancyPrices: context?.planOccupancyPrices || [],
      ruleOccupancyPrices: context?.ruleOccupancyPrices || [],
    }),
  };
}
