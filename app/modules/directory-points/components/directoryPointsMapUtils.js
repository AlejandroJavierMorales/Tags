export function validPointCoordinates(point) {
  const latitude = Number(point?.latitude), longitude = Number(point?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 && latitude !== 0 && longitude !== 0;
}

export function distanceBetweenPoints(from, to) {
  if (!validPointCoordinates(from) || !validPointCoordinates(to)) return null;
  const radians = value => value * Math.PI / 180;
  const dLatitude = radians(Number(to.latitude) - Number(from.latitude));
  const dLongitude = radians(Number(to.longitude) - Number(from.longitude));
  const value = Math.sin(dLatitude / 2) ** 2 + Math.cos(radians(Number(from.latitude))) * Math.cos(radians(Number(to.latitude))) * Math.sin(dLongitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function loadDirectoryPointsGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__tagsDirectoryPointsMapsPromise) return window.__tagsDirectoryPointsMapsPromise;
  window.__tagsDirectoryPointsMapsPromise = new Promise((resolve, reject) => {
    const callback = `tagsDirectoryPointsMapsReady${Date.now()}`;
    window[callback] = () => { const maps = window.google?.maps;delete window[callback];maps ? resolve(maps) : reject(new Error("Google Maps no pudo inicializarse.")); };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=marker&callback=${callback}`;
    script.async = true;
    script.onerror = () => { delete window[callback];window.__tagsDirectoryPointsMapsPromise = null;reject(new Error("No se pudo cargar Google Maps. Revisá la clave y sus dominios autorizados.")); };
    document.head.appendChild(script);
  });
  return window.__tagsDirectoryPointsMapsPromise;
}

export async function reverseGeocodePoint(maps, latitude, longitude) {
  if (!maps?.Geocoder) return null;
  const geocoder = new maps.Geocoder();
  const response = await geocoder.geocode({ location: { lat: Number(latitude), lng: Number(longitude) } });
  const result = response.results?.[0];
  if (!result) return null;
  const component = type => result.address_components?.find(item => item.types.includes(type))?.long_name || "";
  return {
    address: result.formatted_address || "",
    locality: component("locality") || component("administrative_area_level_2") || component("sublocality"),
  };
}
