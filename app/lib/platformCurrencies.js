export const PLATFORM_CURRENCIES = Object.freeze([
  { code: "ARS", symbol: "$", label: "Pesos argentinos" },
  { code: "USD", symbol: "U$S", label: "Dólares estadounidenses" },
]);

export function normalizePlatformCurrency(value, fallback = "") {
  const raw = String(value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!raw) return fallback;
  if (["ARS", "$", "PESO", "PESOS", "PESO ARGENTINO", "PESOS ARGENTINOS"].includes(raw)) return "ARS";
  if (["USD", "U$S", "US$", "U$D", "DOLAR", "DÓLAR", "DOLARES", "DÓLARES", "DOLAR ESTADOUNIDENSE", "DÓLAR ESTADOUNIDENSE"].includes(raw)) return "USD";
  return fallback;
}

export function platformCurrencySymbol(value) {
  const code = normalizePlatformCurrency(value, String(value || "").toUpperCase());
  return PLATFORM_CURRENCIES.find(item => item.code === code)?.symbol || code;
}
