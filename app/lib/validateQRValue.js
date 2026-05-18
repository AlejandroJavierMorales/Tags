function validateQRValue(type, value) {
  const normalized = value.trim();

  // -------------------------
  // WHATSAPP
  // -------------------------
  if (type === "whatsapp") {
    if (!/^[0-9+\s()-]+$/.test(normalized)) {
      return { error: "Formato de WhatsApp inválido" };
    }

    const phone = normalized.replace(/\D/g, "");

    if (phone.length < 10 || phone.length > 15) {
      return { error: "Número inválido" };
    }

    return { value: phone };
  }

  // -------------------------
  // INSTAGRAM / FACEBOOK
  // -------------------------
  if (type === "instagram" || type === "facebook") {
    if (!/^[a-zA-Z0-9._]+$/.test(normalized)) {
      return { error: "Usuario inválido" };
    }

    return { value: normalized };
  }

  // -------------------------
  // WEBSITE / URL / GOOGLE
  // -------------------------
  if (type === "website" || type === "google") {
    let url = normalized;

    if (!url.includes(".")) {
      return { error: "URL inválida" };
    }

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    try {
      const parsed = new URL(url);

      if (!parsed.hostname.includes(".")) {
        return { error: "Dominio inválido" };
      }

      return { value: url };

    } catch {
      return { error: "URL inválida" };
    }
  }

  // default
  return { value: normalized };
}
export {validateQRValue}