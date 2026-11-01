const money = (value, currency) => `${currency === "ARS" ? "$" : "U$S"} ${Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;

export function presentLodgingBookingResult({ setup, intent, actionable = [], groups = [], nights }) {
  const adults = Number(intent.adults || 0), children = Number(intent.children || 0), requested = adults + children;
  const guestLabel = intent.totalCapacityMode ? `${requested} huésped${requested === 1 ? "" : "es"}` : `${adults} adulto${adults === 1 ? "" : "s"} y ${children} menor${children === 1 ? "" : "es"}`;
  const actionParams = new URLSearchParams({ desde: intent.startsOn, hasta: intent.endsOn, adultos: String(adults), menores: String(children) });
  if (Array.isArray(intent.unitOccupancies) && intent.unitOccupancies.length > 1) actionParams.set("distribucion", intent.unitOccupancies.join(","));
  const action = { label: "Continuar con la reserva", href: `${setup.bookingPath}?${actionParams}` };
  if (actionable.length) {
    const lines = actionable.slice(0, 5).map(item => `• ${item.name}: total ${money(item.pricing.total, item.pricing.currency)}, ${money(item.pricing.averageNightlyRate, item.pricing.currency)} por noche. Reserva ${Number(item.ratePlan?.depositPercentage || 0)}%: ${money(Number(item.pricing.total || 0) * Number(item.ratePlan?.depositPercentage || 0) / 100, item.pricing.currency)}.`);
    return { answer: `Encontré ${actionable.length === 1 ? "esta opción disponible" : "estas opciones disponibles"} para ${guestLabel}, del ${intent.startsOn} al ${intent.endsOn} (${nights} noches):\n\n${lines.join("\n")}`, context: `RESULTADO VERIFICADO DEL MOTOR DE RESERVAS\n${lines.join("\n")}`, action };
  }
  if (groups.length) {
    const lines = groups.slice(0, 3).map((group, index) => `• Opción ${index + 1}: ${group.units.map(unit => unit.name).join(" + ")}. Total ${money(group.total, group.currency)}. Reserva ${group.depositPercentage}%: ${money(group.depositRequiredAmount, group.currency)}.`);
    const distribution = Array.isArray(intent.unitOccupancies) && intent.unitOccupancies.length > 1 ? ` respetando la distribución solicitada (${intent.unitOccupancies.join(" y ")} huéspedes)` : "";
    return { answer: `Para ${requested} personas encontré estas combinaciones disponibles${distribution} del ${intent.startsOn} al ${intent.endsOn} (${nights} noches):\n\n${lines.join("\n")}`, context: `RESULTADO VERIFICADO DEL MOTOR DE RESERVAS\n${lines.join("\n")}`, action };
  }
  return { answer: `No encontré unidades disponibles con precio configurado para ${guestLabel}, del ${intent.startsOn} al ${intent.endsOn}.`, context: "RESULTADO VERIFICADO DEL MOTOR DE RESERVAS: sin disponibilidad para la búsqueda indicada.", action };
}
