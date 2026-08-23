export function effectiveSubscriptionStatus(subscription, now = new Date()) {
  if (!subscription) return "none";
  const status = String(subscription.status || "inactive").toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "inactive" || status === "paused") return "paused";
  if (status === "past_due") return "past_due";
  if (status === "trial") return "trial";
  if (subscription.expires_at && new Date(subscription.expires_at) < now) return "expired";
  return status === "active" ? "active" : status;
}

export function isEffectiveSubscriptionActive(subscription, now = new Date()) {
  const status = effectiveSubscriptionStatus(subscription, now);
  if (["active", "trial"].includes(status)) return true;
  if (status !== "past_due") return false;
  const graceDays = Math.max(0, Number(subscription?.grace_days || 0));
  if (!subscription?.expires_at || !graceDays) return false;
  const graceUntil = new Date(subscription.expires_at);
  graceUntil.setDate(graceUntil.getDate() + graceDays);
  return graceUntil >= now;
}

