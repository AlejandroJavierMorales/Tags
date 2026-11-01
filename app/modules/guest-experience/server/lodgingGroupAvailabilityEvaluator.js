import { evaluateLodgingAvailability } from "./lodgingAvailabilityEvaluator.js";

const ACTIONABLE = new Set(["available", "available_with_warning", "review_required"]);

function combinations(items, size, start = 0, current = [], output = []) {
  if (current.length === size) { output.push([...current]); return output; }
  for (let index = start; index <= items.length - (size - current.length); index += 1) {
    current.push(items[index]); combinations(items, size, index + 1, current, output); current.pop();
  }
  return output;
}

function allocations(units, requested, index = 0, current = [], output = []) {
  if (index === units.length) {
    if (requested === 0) output.push([...current]);
    return output;
  }
  const remainingUnits = units.length - index - 1;
  const remainingCapacity = units.slice(index + 1).reduce((sum, unit) => sum + unit.capacity, 0);
  const minimum = Math.max(1, requested - remainingCapacity);
  const maximum = Math.min(units[index].capacity, requested - remainingUnits);
  for (let occupants = minimum; occupants <= maximum; occupants += 1) {
    current.push(occupants); allocations(units, requested - occupants, index + 1, current, output); current.pop();
  }
  return output;
}

export async function evaluateLodgingGroupAvailability(connection, options) {
  const requested = Math.max(1, Number(options.adults || 0) + Number(options.children || 0));
  const requestedUnitOccupancies = Array.isArray(options.requestedUnitOccupancies) ? options.requestedUnitOccupancies.map(Number).filter(value => value > 0) : [];
  const [rows] = await connection.query("SELECT id,name,capacity_adults,capacity_children FROM tags_guest_units WHERE guest_app_id=? AND is_active=1 ORDER BY sort_order,name", [Number(options.app.id)]);
  const units = rows.map(unit => ({ id: Number(unit.id), name: unit.name, capacity: Number(unit.capacity_adults || 0) + Number(unit.capacity_children || 0) })).filter(unit => unit.capacity > 0);
  if (!units.length) return null;

  const evaluations = new Map();
  for (let occupants = 1; occupants <= Math.max(...units.map(unit => unit.capacity)); occupants += 1) {
    const result = await evaluateLodgingAvailability(connection, { ...options, adults: occupants, children: 0 });
    evaluations.set(occupants, new Map(result.units.map(item => [Number(item.unitId), item])));
  }
  const candidates = units.filter(unit => {
    for (let occupants = 1; occupants <= unit.capacity; occupants += 1) {
      const item = evaluations.get(occupants)?.get(unit.id);
      if (item?.pricing?.configured && ACTIONABLE.has(item.decision)) return true;
    }
    return false;
  });
  if (candidates.reduce((sum, unit) => sum + unit.capacity, 0) < requested) return null;

  let best = [];
  const minimumSize = requestedUnitOccupancies.length || 2;
  const maximumSize = requestedUnitOccupancies.length || candidates.length;
  for (let size = minimumSize; size <= maximumSize && !best.length; size += 1) {
    const viable = [];
    for (const subset of combinations(candidates, size)) {
      if (subset.reduce((sum, unit) => sum + unit.capacity, 0) < requested) continue;
      for (const distribution of allocations(subset, requested)) {
        if (requestedUnitOccupancies.length && [...distribution].sort((a,b)=>a-b).join(",") !== [...requestedUnitOccupancies].sort((a,b)=>a-b).join(",")) continue;
        const selected = subset.map((unit, index) => ({ unit, occupants: distribution[index], item: evaluations.get(distribution[index])?.get(unit.id) }));
        if (selected.some(entry => !entry.item?.pricing?.configured || !ACTIONABLE.has(entry.item.decision))) continue;
        const total = selected.reduce((sum, entry) => sum + Number(entry.item.pricing.total || 0), 0);
        const capacity = selected.reduce((sum, entry) => sum + entry.unit.capacity, 0);
        viable.push({ selected, total, capacity });
      }
    }
    viable.sort((left, right) => (left.capacity - requested) - (right.capacity - requested) || left.total - right.total);
    const seen = new Set();
    best = viable.filter(candidate => {
      const key = candidate.selected.map(entry => entry.unit.id).sort((a, b) => a - b).join("-");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, Math.max(1, Math.min(5, Number(options.maximumOptions || 3))));
  }
  if (!best.length) return [];
  return best.map(candidate => {
   const currency = candidate.selected[0]?.item?.pricing?.currency || options.app.currency || "ARS";
   const depositPercentage = Math.max(0, Math.min(100, Number(options.settings?.depositPercentage || 0)));
   const depositRequiredAmount = Number((candidate.total * depositPercentage / 100).toFixed(2));
   const key = candidate.selected.map(entry => `${entry.unit.id}:${entry.occupants}`).sort().join("|");
   return {
    key,
    requestedGuests: requested,
    totalCapacity: candidate.capacity,
    total: candidate.total,
    currency,
    depositPercentage,
    depositRequiredAmount,
    flexibleAssignment: true,
    units: candidate.selected.map(({ unit, occupants, item }) => ({
      unitId: unit.id,
      name: unit.name,
      capacity: unit.capacity,
      suggestedGuests: occupants,
      description: item.description || "",
      images: item.images || [],
      decision: item.decision,
      pricing: item.pricing,
    })),
   };
  });
}
