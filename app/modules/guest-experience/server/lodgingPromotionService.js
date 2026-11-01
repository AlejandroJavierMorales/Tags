import { countLodgingNights } from "../lib/lodgingReservationRules.js";

const normalizeCode = value => String(value || "").trim().toLocaleUpperCase("es");

export async function loadLodgingPromotionContext(connection, { guestAppId, startsOn, endsOn }) {
  const [promotions] = await connection.query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM tags_guest_lodging_promotion_uses u
              LEFT JOIN tags_guest_booking_requests br ON br.id=u.booking_request_id AND br.guest_app_id=u.guest_app_id
              WHERE u.promotion_id=p.id
                AND (u.status='confirmed' OR (u.status='reserved' AND ((u.booking_request_id IS NULL AND u.expires_at>NOW()) OR br.status IN ('held','review_required','pending_payment'))))) used_count
       FROM tags_guest_lodging_promotions p
      WHERE p.guest_app_id=? AND p.status='published'
        AND p.stay_starts_on<=? AND DATE_ADD(p.stay_ends_on,INTERVAL 1 DAY)>=?
        AND (p.booking_starts_at IS NULL OR p.booking_starts_at<=NOW())
        AND (p.booking_ends_at IS NULL OR p.booking_ends_at>=NOW())
      ORDER BY p.created_at DESC,p.id DESC`,
    [guestAppId, startsOn, endsOn],
  );
  if (!promotions.length) return [];
  const ids = promotions.map(item => Number(item.id));
  const [scopes] = await connection.query(
    `SELECT promotion_id,unit_id FROM tags_guest_lodging_promotion_units WHERE guest_app_id=? AND promotion_id IN (${ids.map(() => "?").join(",")})`,
    [guestAppId, ...ids],
  );
  return promotions.map(promotion => ({
    ...promotion,
    unitIds: scopes.filter(scope => Number(scope.promotion_id) === Number(promotion.id)).map(scope => Number(scope.unit_id)),
  }));
}

export function applyLodgingPromotion({ promotions = [], unitId, startsOn, endsOn, pricing, couponCode = "" }) {
  if (!pricing?.configured) return pricing;
  const nights = countLodgingNights(new Date(`${startsOn}T12:00:00`), new Date(`${endsOn}T12:00:00`));
  const advanceDays = countLodgingNights(new Date(), new Date(`${startsOn}T12:00:00`));
  const normalizedCoupon = normalizeCode(couponCode);
  const eligible = promotions.filter(promotion => {
    if (promotion.unitIds.length && !promotion.unitIds.includes(Number(unitId))) return false;
    if (promotion.minimum_nights && nights < Number(promotion.minimum_nights)) return false;
    if (promotion.minimum_advance_days && advanceDays < Number(promotion.minimum_advance_days)) return false;
    if (promotion.maximum_uses && Number(promotion.used_count || 0) >= Number(promotion.maximum_uses)) return false;
    if (promotion.application_mode === "coupon") return normalizedCoupon && normalizeCode(promotion.coupon_code) === normalizedCoupon;
    return promotion.application_mode === "automatic";
  });
  const baseTotal = Number(pricing.total || 0);
  const candidates = eligible.map(promotion => {
    const rawDiscount = promotion.discount_type === "fixed"
      ? Number(promotion.discount_value || 0)
      : baseTotal * Number(promotion.discount_value || 0) / 100;
    return { promotion, discount: Math.min(baseTotal, Math.max(0, Number(rawDiscount.toFixed(2)))) };
  }).sort((left, right) => right.discount - left.discount);
  if (!candidates[0]?.discount) return { ...pricing, subtotal: baseTotal, discountTotal: 0, promotion: null };
  const selected = candidates[0];
  return {
    ...pricing,
    subtotal: baseTotal,
    discountTotal: selected.discount,
    total: Number((baseTotal - selected.discount).toFixed(2)),
    averageNightlyRate: nights ? Number(((baseTotal - selected.discount) / nights).toFixed(2)) : 0,
    promotion: {
      id: Number(selected.promotion.id),
      name: selected.promotion.name,
      description: selected.promotion.description || "",
      discountType: selected.promotion.discount_type,
      discountValue: Number(selected.promotion.discount_value),
      applicationMode: selected.promotion.application_mode,
      couponCode: selected.promotion.application_mode === "coupon" ? normalizeCode(selected.promotion.coupon_code) : null,
    },
  };
}
