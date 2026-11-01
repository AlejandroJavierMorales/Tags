const BOOKING_START = /\b(reserv|disponib|cotiz|tarifa|cu[aá]nto\s+(?:sale|cuesta)|precio\s+(?:para|de)|alojarme|hospedarme|estad[ií]a\s+(?:del|desde)|ingreso\s+(?:el|desde)|check.?in|\d+\s+noches?|(?:hay|tienen|ten[eé]s)\s+lugar|lugar\s+para|(?:est[aá]|queda)\s+libre)\w*/i;
const LODGING_REQUEST = /(?:\b(?:necesito|busco|quiero|quisiera|queremos)\b.{0,80}\b(?:alojamiento|cabañ|caban|habitaci|hospedaje)\w*|\b(?:alojamiento|cabañ|caban|habitaci|hospedaje)\w*.{0,50}\b(?:necesito|busco|quiero|quisiera)\b)/i;
const BOOKING_DATA = /\b(?:\d+\s*\/\s*\d+|\d+\s*adult|\d+\s*(?:menor|niñ)|\d+\s*(?:persona|hu[eé]sped)|ya\s+(?:te\s+)?(?:lo|la|los|las)\s+(?:pas[ée]|di)|somos\s+\d+)\b/i;
const INFORMATION_QUESTION = /\b(?:c[oó]mo\s+es|qu[eé]\s+(?:tiene|incluye|servicios)|equipamiento|caracter[ií]sticas|distancia|d[oó]nde\s+(?:est[aá]|queda)|ubicaci[oó]n|cerca\s+de|r[ií]o|pileta|piscina|wifi|mascotas)\b/i;

export function classifyLodgingConversation({ message, state, hasCapability }) {
  if (!hasCapability) return "business_information";
  const text = String(message || "").trim();
  if (INFORMATION_QUESTION.test(text)) return "business_information";
  if (BOOKING_START.test(text) || LODGING_REQUEST.test(text)) return "lodging_booking";
  if ((state?.active === true || state?.bookingIntent === true) && BOOKING_DATA.test(text)) return "lodging_booking";
  return "business_information";
}

export function extractLodgingFacts(value, now = new Date()) {
  const text = String(value || "").toLocaleLowerCase("es-AR");
  const range = [...text.matchAll(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\s*(?:al|a|hasta)\s*(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/gi)].at(-1);
  let startsOn = "", endsOn = "";
  if (range) {
    const fullYear = raw => raw ? Number(raw) + (Number(raw) < 100 ? 2000 : 0) : now.getFullYear();
    let startYear = fullYear(range[3]);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!range[3] && new Date(startYear, Number(range[2]) - 1, Number(range[1])) < today) startYear += 1;
    let endYear = range[6] ? fullYear(range[6]) : startYear;
    if (!range[6] && (Number(range[5]) < Number(range[2]) || (Number(range[5]) === Number(range[2]) && Number(range[4]) <= Number(range[1])))) endYear += 1;
    const iso = (year, month, day) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    startsOn = iso(startYear, Number(range[2]), Number(range[1]));
    endsOn = iso(endYear, Number(range[5]), Number(range[4]));
  }
  const adults = [...text.matchAll(/(\d+)\s*adult(?:o|os|a|as)\b/gi)].at(-1);
  const children = [...text.matchAll(/(\d+)\s*(?:menor(?:es)?|niñ(?:o|os|a|as))\b/gi)].at(-1);
  const unitOccupancies = [...text.matchAll(/\b(?:una?|1)\b(?:\s+(?:caba[nñ]a|habitaci[oó]n|unidad))?.{0,20}?\bpara\s+(\d+)\s+(?:personas?|hu[eé]spedes?)\b/gi)].map(match => Number(match[1])).filter(value => value > 0);
  const people = [...text.matchAll(/(\d+)\s*(?:personas?|hu[eé]spedes?)\b/gi)].at(-1);
  const totalGuests = unitOccupancies.length > 1 ? unitOccupancies.reduce((sum, value) => sum + value, 0) : Number(people?.[1] || 0);
  return { startsOn, endsOn, adults: Number(adults?.[1] || 0), children: Number(children?.[1] || 0), totalGuests, unitOccupancies, hasAdults: Boolean(adults), hasChildren: Boolean(children), hasTotalGuests: Boolean(people) };
}

export function mergeLodgingConversationState({ previous, message, userHistory = [], now = new Date() }) {
  const current = extractLodgingFacts(message, now);
  const conversation = extractLodgingFacts([...userHistory, message].join(" "), now);
  return {
    active: true,
    completed: false,
    startsOn: current.startsOn || previous?.startsOn || conversation.startsOn || "",
    endsOn: current.endsOn || previous?.endsOn || conversation.endsOn || "",
    adults: Number(current.hasAdults ? current.adults : previous?.adults || conversation.adults || 0),
    children: Number(current.hasChildren ? current.children : previous?.children ?? conversation.children ?? 0),
    totalGuests: Number(current.hasTotalGuests ? current.totalGuests : previous?.totalGuests || conversation.totalGuests || 0),
    unitOccupancies: current.unitOccupancies.length ? current.unitOccupancies : (previous?.unitOccupancies || conversation.unitOccupancies || []),
  };
}
