export function effectiveSubscriptionStatus(subscription, now = new Date()) {
  if (!subscription) return "none";
  const status = String(subscription.status || "inactive").toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "inactive" || status === "paused") return "paused";
  if (!["active", "trial", "past_due"].includes(status)) return status;
  if (Number(subscription.auto_disable_on_expire) === 0) return status;
  if (subscription.admin_override_until && new Date(subscription.admin_override_until) >= now) return status;
  if (!subscription.expires_at) return status;
  const graceUntil = new Date(subscription.expires_at);
  graceUntil.setDate(graceUntil.getDate() + Math.max(0, Number(subscription.grace_days || 0)));
  return graceUntil >= now ? status : "expired";
}

export function isEffectiveSubscriptionActive(subscription, now = new Date()) {
  const status = effectiveSubscriptionStatus(subscription, now);
  if (["active", "trial"].includes(status)) return true;
  if (status !== "past_due") return false;
  if (Number(subscription?.auto_disable_on_expire) === 0) return true;
  if (subscription?.admin_override_until && new Date(subscription.admin_override_until) >= now) return true;
  if (!subscription?.expires_at) return false;
  const graceUntil = new Date(subscription.expires_at);
  graceUntil.setDate(graceUntil.getDate() + Math.max(0, Number(subscription.grace_days || 0)));
  return graceUntil >= now;
}
