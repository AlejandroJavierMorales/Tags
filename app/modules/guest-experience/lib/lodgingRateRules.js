const DAY_MS = 86400000;

export const RATE_PRICING_MODE = Object.freeze({
  PER_UNIT: "per_unit",
  OCCUPANCY: "occupancy",
});

export const RATE_ADJUSTMENT_TYPE = Object.freeze({
  FIXED: "fixed",
  AMOUNT_DELTA: "amount_delta",
  PERCENTAGE_DELTA: "percentage_delta",
});

const nullableBoolean = (value) => {
  if (value === null || value === undefined) return null;
  return value === true || Number(value) === 1;
};

export function lodgingDateKey(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  return String(value || "").slice(0, 10);
}

export function lodgingDate(value) {
  const key = lodgingDateKey(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

export function enumerateLodgingNights(startsOn, endsOn) {
  const start = lodgingDate(startsOn);
  const end = lodgingDate(endsOn);
  if (!start || !end || start >= end) return [];
  const dates = [];
  for (const current = new Date(start); current < end; current.setDate(current.getDate() + 1)) {
    dates.push(lodgingDateKey(current));
  }
  return dates;
}

function mondayIndex(value) {
  const day = lodgingDate(value)?.getDay();
  return day === 0 ? 6 : day - 1;
}

export function ruleAppliesOnDate(rule, date) {
  const key = lodgingDateKey(date);
  if (!key || key < lodgingDateKey(rule.starts_on) || key > lodgingDateKey(rule.ends_on)) {
    return false;
  }
  const mask = /^[01]{7}$/.test(String(rule.weekdays_mask || ""))
    ? String(rule.weekdays_mask)
    : "1111111";
  return mask[mondayIndex(key)] === "1";
}

function rangeDays(rule) {
  const starts = lodgingDate(rule.starts_on);
  const ends = lodgingDate(rule.ends_on);
  return starts && ends ? Math.max(0, Math.round((ends - starts) / DAY_MS)) : Number.MAX_SAFE_INTEGER;
}

function ruleRank(rule, ratePlanId, unitId) {
  return [
    Number(rule.unit_id) === Number(unitId) ? 1 : 0,
    Number(rule.rate_plan_id) === Number(ratePlanId) ? 1 : 0,
    Number(rule.priority || 0),
    -rangeDays(rule),
    new Date(rule.updated_at || 0).getTime() || 0,
    Number(rule.id || 0),
  ];
}

function compareRank(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

const FIELDS = [
  "price_adjustment_type",
  "price_adjustment_value",
  "is_open",
  "closed_to_arrival",
  "closed_to_departure",
  "minimum_nights",
  "maximum_nights",
  "minimum_advance_days",
  "maximum_advance_days",
  "gap_policy_mode",
  "requires_manual_review",
];

export function resolveRateDay({ date, ratePlan, unitId, rules = [] }) {
  if (!ratePlan) return null;
  const applicable = rules.filter(
    (rule) =>
      rule.status === "active" &&
      (!rule.rate_plan_id || Number(rule.rate_plan_id) === Number(ratePlan.id)) &&
      (!rule.unit_id || Number(rule.unit_id) === Number(unitId)) &&
      ruleAppliesOnDate(rule, date),
  );
  const values = {
    is_open: true,
    closed_to_arrival: false,
    closed_to_departure: false,
    minimum_nights: Number(ratePlan.minimum_nights || 1),
    maximum_nights: ratePlan.maximum_nights == null ? null : Number(ratePlan.maximum_nights),
    minimum_advance_days: Number(ratePlan.minimum_advance_days || 0),
    maximum_advance_days:
      ratePlan.maximum_advance_days == null ? null : Number(ratePlan.maximum_advance_days),
    gap_policy_mode: null,
    requires_manual_review: false,
    price_adjustment_type: null,
    price_adjustment_value: null,
  };
  const sources = {};
  for (const field of FIELDS) {
    const candidates = applicable
      .filter((rule) => rule[field] !== null && rule[field] !== undefined)
      .sort((left, right) =>
        compareRank(ruleRank(right, ratePlan.id, unitId), ruleRank(left, ratePlan.id, unitId)),
      );
    if (!candidates[0]) continue;
    values[field] = candidates[0][field];
    sources[field] = {
      ruleId: Number(candidates[0].id),
      name: candidates[0].name,
    };
  }
  values.is_open = nullableBoolean(values.is_open) !== false;
  values.closed_to_arrival = nullableBoolean(values.closed_to_arrival) === true;
  values.closed_to_departure = nullableBoolean(values.closed_to_departure) === true;
  values.requires_manual_review = nullableBoolean(values.requires_manual_review) === true;
  return {
    date: lodgingDateKey(date),
    ...values,
    sources,
    appliedRuleIds: [...new Set(Object.values(sources).map((source) => source.ruleId))],
  };
}

export function evaluateRateRestrictions({
  startsOn,
  endsOn,
  ratePlan,
  unitId,
  rules = [],
  today = new Date(),
}) {
  if (!ratePlan) return { configured: false, allowed: true, reasons: [], days: [] };
  const nights = enumerateLodgingNights(startsOn, endsOn);
  const days = nights.map((date) => resolveRateDay({ date, ratePlan, unitId, rules }));
  const arrival = resolveRateDay({ date: startsOn, ratePlan, unitId, rules });
  const departure = resolveRateDay({ date: endsOn, ratePlan, unitId, rules });
  const reasons = [];
  const closedDay = days.find((day) => !day.is_open);
  if (closedDay) reasons.push({ code: "sales_closed", date: closedDay.date, message: `La venta está cerrada para la noche del ${closedDay.date}.` });
  if (arrival?.closed_to_arrival) reasons.push({ code: "closed_to_arrival", date: arrival.date, message: "No se permiten ingresos en la fecha seleccionada." });
  if (departure?.closed_to_departure) reasons.push({ code: "closed_to_departure", date: departure.date, message: "No se permiten egresos en la fecha seleccionada." });

  const minimumNights = Math.max(1, ...days.map((day) => Number(day.minimum_nights || 1)));
  const maximumValues = days
    .map((day) => day.maximum_nights)
    .filter((value) => value !== null && value !== undefined)
    .map(Number);
  const maximumNights = maximumValues.length ? Math.min(...maximumValues) : null;
  if (nights.length < minimumNights) reasons.push({ code: "minimum_nights", value: minimumNights, message: `La estadía mínima para esas fechas es de ${minimumNights} noches.` });
  if (maximumNights && nights.length > maximumNights) reasons.push({ code: "maximum_nights", value: maximumNights, message: `La estadía máxima para esas fechas es de ${maximumNights} noches.` });

  const todayDate = lodgingDate(today);
  const arrivalDate = lodgingDate(startsOn);
  const advanceDays = todayDate && arrivalDate ? Math.floor((arrivalDate - todayDate) / DAY_MS) : 0;
  const minimumAdvanceDays = Math.max(0, Number(arrival?.minimum_advance_days || 0));
  const maximumAdvanceDays = arrival?.maximum_advance_days == null ? null : Number(arrival.maximum_advance_days);
  if (advanceDays < minimumAdvanceDays) reasons.push({ code: "minimum_advance", value: minimumAdvanceDays, message: `La reserva requiere al menos ${minimumAdvanceDays} días de anticipación.` });
  if (maximumAdvanceDays !== null && advanceDays > maximumAdvanceDays) reasons.push({ code: "maximum_advance", value: maximumAdvanceDays, message: `La reserva admite hasta ${maximumAdvanceDays} días de anticipación.` });

  return {
    configured: true,
    allowed: reasons.length === 0,
    reasons,
    days,
    arrival,
    departure,
    minimumNights,
    maximumNights,
    advanceDays,
    requiresManualReview: days.some((day) => day.requires_manual_review),
    gapPolicyMode: arrival?.gap_policy_mode || null,
    appliedRuleIds: [...new Set([...days, arrival, departure].flatMap((day) => day?.appliedRuleIds || []))],
  };
}

function occupancyBand(prices, occupants) {
  return prices
    .filter(
      (item) =>
        item.is_active !== 0 &&
        Number(item.minimum_occupants) <= occupants &&
        Number(item.maximum_occupants) >= occupants,
    )
    .sort((left, right) => {
      const leftWidth = Number(left.maximum_occupants) - Number(left.minimum_occupants);
      const rightWidth = Number(right.maximum_occupants) - Number(right.minimum_occupants);
      return leftWidth - rightWidth || Number(right.id || 0) - Number(left.id || 0);
    })[0];
}

function adjustedPrice(base, type, value) {
  const amount = Number(value || 0);
  if (type === RATE_ADJUSTMENT_TYPE.FIXED) return Math.max(0, amount);
  if (type === RATE_ADJUSTMENT_TYPE.AMOUNT_DELTA) return Math.max(0, base + amount);
  if (type === RATE_ADJUSTMENT_TYPE.PERCENTAGE_DELTA) {
    return Math.max(0, base + (base * amount) / 100);
  }
  return Math.max(0, base);
}

export function resolveRatePricing({
  startsOn,
  endsOn,
  ratePlan,
  unitId,
  occupants,
  rules = [],
  planOccupancyPrices = [],
  ruleOccupancyPrices = [],
}) {
  if (!ratePlan) return { configured: false, currency: null, total: null, days: [] };
  const chargeableOccupants = Math.max(1, Math.trunc(Number(occupants || 1)));
  const planBand = occupancyBand(
    planOccupancyPrices.filter((item) => Number(item.rate_plan_id) === Number(ratePlan.id)),
    chargeableOccupants,
  );
  const baseRate =
    ratePlan.pricing_mode === RATE_PRICING_MODE.OCCUPANCY && planBand
      ? Number(planBand.nightly_rate)
      : Number(ratePlan.base_nightly_rate || 0);
  const days = enumerateLodgingNights(startsOn, endsOn).map((date) => {
    const effective = resolveRateDay({ date, ratePlan, unitId, rules });
    const matchingRulePrices = ruleOccupancyPrices
      .filter((price) => {
        const rule = rules.find((candidate) => Number(candidate.id) === Number(price.rate_rule_id));
        return (
          rule &&
          rule.status === "active" &&
          (!rule.rate_plan_id || Number(rule.rate_plan_id) === Number(ratePlan.id)) &&
          (!rule.unit_id || Number(rule.unit_id) === Number(unitId)) &&
          ruleAppliesOnDate(rule, date) &&
          Number(price.minimum_occupants) <= chargeableOccupants &&
          Number(price.maximum_occupants) >= chargeableOccupants
        );
      })
      .sort((left, right) => {
        const leftRule = rules.find((rule) => Number(rule.id) === Number(left.rate_rule_id));
        const rightRule = rules.find((rule) => Number(rule.id) === Number(right.rate_rule_id));
        return compareRank(
          ruleRank(rightRule, ratePlan.id, unitId),
          ruleRank(leftRule, ratePlan.id, unitId),
        );
      });
    const ruleBand = matchingRulePrices[0];
    const nightlyRate = ruleBand
      ? Number(ruleBand.nightly_rate)
      : adjustedPrice(
          baseRate,
          effective.price_adjustment_type,
          effective.price_adjustment_value,
        );
    const normalizedNightlyRate = Number(nightlyRate.toFixed(2));
    const explicitlyPriced = Boolean(
      normalizedNightlyRate > 0 &&
        (ruleBand || effective.price_adjustment_type === RATE_ADJUSTMENT_TYPE.FIXED),
    );
    return {
      date,
      configured: explicitlyPriced,
      nightlyRate: normalizedNightlyRate,
      source: ruleBand
        ? { type: "rule_occupancy", ruleId: Number(ruleBand.rate_rule_id) }
        : effective.price_adjustment_type
          ? {
              type: effective.price_adjustment_type,
              ruleId: effective.sources.price_adjustment_type?.ruleId || null,
            }
          : planBand
            ? { type: "plan_occupancy", occupancyPriceId: Number(planBand.id) }
            : { type: "plan_base", ratePlanId: Number(ratePlan.id) },
    };
  });
  return {
    configured: days.length > 0 && days.every((day) => day.configured),
    currency: ratePlan.currency,
    chargeableOccupants,
    total: Number(days.reduce((sum, day) => sum + day.nightlyRate, 0).toFixed(2)),
    averageNightlyRate: days.length
      ? Number((days.reduce((sum, day) => sum + day.nightlyRate, 0) / days.length).toFixed(2))
      : 0,
    days,
  };
}
