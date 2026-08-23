export const DIRECTORY_MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function currentDirectoryMonth(date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", month: "numeric" }).format(date));
}

export function directoryCalendarAmount(priceRow, startMonth, durationMonths) {
  const start = Math.min(12, Math.max(1, Number(startMonth || 1)));
  const duration = Math.min(11, Math.max(1, Number(durationMonths || 1)));
  let amount = 0;
  const months = [];
  let hasMissingPrice = false;
  for (let offset = 0; offset < duration; offset += 1) {
    const month = ((start - 1 + offset) % 12) + 1;
    const monthAmount = Number(priceRow?.[`manual_month_${String(month).padStart(2, "0")}`] || 0);
    if (monthAmount <= 0) hasMissingPrice = true;
    amount += monthAmount;
    months.push(month);
  }
  return { amount, months, hasMissingPrice };
}

export function directoryCalendarLabel(months) {
  if (!months?.length) return "";
  if (months.length === 1) return DIRECTORY_MONTH_NAMES[months[0] - 1];
  return `${DIRECTORY_MONTH_NAMES[months[0] - 1]} a ${DIRECTORY_MONTH_NAMES[months[months.length - 1] - 1]}`;
}
