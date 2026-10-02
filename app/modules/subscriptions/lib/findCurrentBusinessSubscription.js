const CURRENT_STATUS_SQL = `CASE
  WHEN s.status='cancelled' THEN 'cancelled'
  WHEN s.status='inactive' THEN 'paused'
  WHEN s.status='past_due' THEN 'past_due'
  WHEN s.expires_at IS NOT NULL AND s.expires_at<NOW() THEN 'expired'
  WHEN s.status='trial' THEN 'trial'
  ELSE s.status END`;

export async function findCurrentBusinessSubscription(queryDb, businessId) {
  const [[subscription]] = await queryDb.query(
    `SELECT s.id,s.business_id,s.plan_id,s.status,s.expires_at,
            ${CURRENT_STATUS_SQL} effective_status,
            p.name plan_name,p.code plan_code
       FROM tags_subscriptions s
       INNER JOIN tags_plans p ON p.id=s.plan_id
      WHERE s.business_id=?
        AND (${CURRENT_STATUS_SQL}) IN ('active','trial','past_due','paused')
      ORDER BY s.id DESC
      LIMIT 1`,
    [Number(businessId)]
  );
  return subscription || null;
}

export function existingSubscriptionError(subscription) {
  return Object.assign(
    new Error(`El cliente ya tiene la suscripción ${subscription.plan_name} (${subscription.effective_status}). Modificá esa suscripción en lugar de crear una segunda.`),
    { status: 409, code: "BUSINESS_SUBSCRIPTION_EXISTS", subscription }
  );
}
