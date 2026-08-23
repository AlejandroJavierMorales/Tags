import { isValidEmail } from "@/app/lib/validators";

const digits = value => String(value || "").replace(/\D/g, "");

export function validateBusinessForm({ name, email, phone, details = {} }) {
  if (!String(name || "").trim()) return "El nombre del cliente es obligatorio.";
  if (!String(email || "").trim() || !isValidEmail(String(email).trim())) return "Ingresá un email válido.";
  if (phone && (digits(phone).length < 7 || digits(phone).length > 15)) return "El teléfono debe tener entre 7 y 15 dígitos.";
  if (details.whatsapp && (digits(details.whatsapp).length < 10 || digits(details.whatsapp).length > 15)) return "El WhatsApp debe tener entre 10 y 15 dígitos, incluyendo código de país.";
  const latitude = details.latitude === "" || details.latitude == null ? null : Number(details.latitude);
  const longitude = details.longitude === "" || details.longitude == null ? null : Number(details.longitude);
  if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) return "La latitud debe ser un número entre -90 y 90.";
  if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) return "La longitud debe ser un número entre -180 y 180.";
  return null;
}
