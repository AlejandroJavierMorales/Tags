export function parseLodgingBookingSearchParams(value) {
  const params = value instanceof URLSearchParams ? value : new URLSearchParams(String(value || ""));
  const startsOn = params.get("desde") || "", endsOn = params.get("hasta") || "";
  const rawAdults = Number(params.get("adultos") || 0), rawChildren = Number(params.get("menores") || 0);
  const unitOccupancies = String(params.get("distribucion") || "").split(",").filter(Boolean).map(Number);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn <= startsOn || !Number.isInteger(rawAdults) || rawAdults < 1 || !Number.isInteger(rawChildren) || rawChildren < 0) return null;
  if (unitOccupancies.some(value => !Number.isInteger(value) || value < 1 || value > 30) || (unitOccupancies.length && unitOccupancies.reduce((sum,value)=>sum+value,0) !== rawAdults + rawChildren)) return null;
  return { startsOn, endsOn, adults: Math.min(30, rawAdults), children: Math.min(30, rawChildren), couponCode: "", unitOccupancies };
}
