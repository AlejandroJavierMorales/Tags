const imageText = image => `${image?.alt || ""} ${image?.url || ""}`.toLocaleLowerCase("es");
// "Playa" por sí sola también describe fotos del río y no demuestra que sea la
// piscina del alojamiento. Eso hacía que una imagen del río bloqueara el
// reemplazo de la plaza de juegos por la verdadera Piscina Playa.
const isPoolImage = image => /piscina|pileta|solarium|solárium/.test(imageText(image));
const isPlaygroundImage = image => /juego|tobogan|tobogán|escalador|playground|\/parque(?:[._-]|$)/.test(imageText(image));
const BUSINESS_HERO_OVERRIDES = {
  5: { index: 2, image: { url: "/assets/images/piscina_1.webp", alt: "Exclusiva Piscina Playa" } },
};

export function selectBookingHeroImages(images = [], coverUrl = "", limit = 4) {
  const available = images.filter(image => image?.url && image.url !== coverUrl);
  const pool = available.find(isPoolImage);
  const candidates = pool ? available.filter(image => !isPlaygroundImage(image)) : available;
  const selected = candidates.slice(0, limit);
  if (!pool || selected.some(image => image.url === pool.url)) return selected;
  if (selected.length < limit) return [...selected, pool];
  return selected.map((image, index) => index === selected.length - 1 ? pool : image);
}

export function selectBusinessBookingHeroImages(images = [], coverUrl = "", businessId, limit = 4) {
  const override = BUSINESS_HERO_OVERRIDES[Number(businessId)];
  if (!override) return selectBookingHeroImages(images, coverUrl, limit);
  const selected = images.filter(image => image?.url && image.url !== coverUrl).slice(0, limit);
  if (selected.length > override.index) selected[override.index] = override.image;
  return selected;
}
