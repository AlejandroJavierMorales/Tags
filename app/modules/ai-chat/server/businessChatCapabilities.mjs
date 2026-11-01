function parseSettings(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

export function resolveBusinessChatCapabilities({ addonCodes = [], guestApp = null, listingSlug = "" } = {}) {
  const activeAddons = addonCodes.map(value => String(value || "")).filter(Boolean);
  const capabilities = { businessKnowledge: true, lodgingReservations: null, activeAddons };
  if (!activeAddons.includes("guest_experience") || !guestApp) return capabilities;
  const settings = parseSettings(guestApp.settings_json);
  if (guestApp.status !== "published" || settings.connectBookingToChatbot === false) return capabilities;
  capabilities.lodgingReservations = {
    app: guestApp,
    settings,
    bookingPath: `/${listingSlug || guestApp.slug}/reservar`,
  };
  return capabilities;
}
