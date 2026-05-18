function extractEditableValue(qr) {
  const type = qr.qr_type_code;

  const url = qr.destination_url || qr.final_url || "";

  // -------------------------
  // WHATSAPP
  // -------------------------
  if (type === "whatsapp") {
    return url.replace("https://wa.me/", "");
  }

  // -------------------------
  // INSTAGRAM
  // -------------------------
  if (type === "instagram") {
    return url.replace("https://instagram.com/", "").replace("/", "");
  }

  // -------------------------
  // FACEBOOK
  // -------------------------
  if (type === "facebook") {
    return url.replace("https://facebook.com/", "").replace("/", "");
  }

  // -------------------------
  // WEB / GOOGLE
  // -------------------------
  return url; // tal cual
}
export {extractEditableValue}