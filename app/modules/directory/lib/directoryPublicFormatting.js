export function directoryImageUrl(imageUrl, depth = 0) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const folders = ["categories", "subcategories", "subsubcategories"];
  const value = String(imageUrl).replace(/^\/+/, "");
  if (value.startsWith("directory/calamuchitar/")) return `/${value}`;
  const legacyMatch = value.match(/^assets\/images\/(categories|subcategories|subsubcategories)\/(.+)$/i);
  if (legacyMatch) return `/directory/calamuchitar/${legacyMatch[1].toLowerCase()}/${encodeURIComponent(legacyMatch[2])}`;
  const filename = value.split("/").pop();
  return `/directory/calamuchitar/${folders[depth] || folders[0]}/${encodeURIComponent(filename)}`;
}

export function directoryWhatsappUrl(value, message = "") {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits.startsWith("54")) digits = `54${digits.replace(/^0/, "")}`;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
