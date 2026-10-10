"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaLocationCrosshairs, FaMagnifyingGlass, FaMapLocationDot, FaPhone, FaRoute, FaWhatsapp, FaXmark } from "react-icons/fa6";
import "./DirectoryResultsMap.css";
import "./DirectoryResultsMapIcons.css";

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__tagsDirectoryGoogleMapsPromise) return window.__tagsDirectoryGoogleMapsPromise;
  window.__tagsDirectoryGoogleMapsPromise = new Promise((resolve, reject) => {
    const callback = `tagsDirectoryMapsReady${Date.now()}`;
    window[callback] = () => {
      const maps = window.google?.maps;
      delete window[callback];
      if (maps) resolve(maps);
      else reject(new Error("Google Maps no pudo inicializarse. Revisá la clave y sus dominios autorizados."));
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=marker&callback=${callback}`;
    script.async = true;
    script.onerror = () => {
      delete window[callback];
      window.__tagsDirectoryGoogleMapsPromise = null;
      reject(new Error("No se pudo cargar Google Maps. Revisá la conexión y la configuración de la clave."));
    };
    document.head.appendChild(script);
  });
  return window.__tagsDirectoryGoogleMapsPromise;
}

function distanceKm(from, to) {
  if (!from) return null;
  const rad = value => value * Math.PI / 180;
  const dLat = rad(to.lat - from.lat), dLng = rad(to.lng - from.lng), earth = 6371;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function whatsappUrl(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits.startsWith("54")) digits = `54${digits.replace(/^0/, "")}`;
  return `https://wa.me/${digits}`;
}

function directionsUrl(item, origin) {
  const params = new URLSearchParams({ api: "1", destination: `${item.latitude},${item.longitude}` });
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function validCoordinates(item) {
  const latitude = Number(item?.latitude);
  const longitude = Number(item?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180
    && !(latitude === 0 && longitude === 0);
}

function searchableValue(value) {
  if (Array.isArray(value)) return value.map(searchableValue).join(" ");
  if (value && typeof value === "object") return searchableValue(value.name || value.title || value.label || Object.values(value));
  return String(value || "");
}

function normalizeSearch(value) {
  return searchableValue(value).toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

const SEARCH_EQUIVALENTS=[
  ["restaurante","restaurantes","restoran","restoranes"],
  ["alojamiento","alojamientos","cabana","cabanas","hotel","hoteles","hosteria","hosterias"],
  ["farmacia","farmacias"],
];

function equivalentTerms(term){return SEARCH_EQUIVALENTS.find(group=>group.includes(term))||[term];}
function markerVisual(item){
  const category=normalizeSearch(item.category_names);
  if(item.category_icon_url)return{url:item.category_icon_url,emoji:"📍"};
  if(/restaur|restoran|pizzer|gastronom|comida|bar|cafe/.test(category))return{emoji:"🍽️"};
  if(/aloj|caban|hotel|hosteria|posada|camping/.test(category))return{emoji:"🏡"};
  if(/farmacia|salud|medic|clinica|consultorio/.test(category))return{emoji:"⚕️"};
  if(/automotor|taller|gomeria|vehiculo/.test(category))return{emoji:"🚗"};
  if(/evento|fiesta|feria|espectaculo|encuentro|congreso|running|ciclismo|mountain bike/.test(category))return{emoji:"📅"};
  if(/museo|patrimonio|cultural|historico/.test(category))return{emoji:"🏛️"};
  if(/rio|balneario|playa|nautica/.test(category))return{emoji:"🏖️"};
  if(/cerro|mirador|sendero|caminata|trekking|reserva|parque natural/.test(category))return{emoji:"⛰️"};
  if(/turismo|paseo|excursion|recreacion|experiencia/.test(category))return{emoji:"🧭"};
  if(/educacion|escuela|instituto|profesor/.test(category))return{emoji:"🎓"};
  if(/construccion|corralon|arquitect|material/.test(category))return{emoji:"🧱"};
  if(/servicio|oficio|profesional/.test(category))return{emoji:"🛠️"};
  if(/comercio|tienda|almacen|supermercado|venta/.test(category))return{emoji:"🛍️"};
  return{emoji:"📍"};
}

const PAGE_SIZE = 10;

export default function DirectoryResultsMap({ listings = [], apiKey = "", mapId = "DEMO_MAP_ID", defaultOpen = false }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [userPosition, setUserPosition] = useState(null);
  const [positionSource, setPositionSource] = useState("");
  const [selectingPosition, setSelectingPosition] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const mapElement = useRef(null);
  const listElement = useRef(null);
  const validListings = useMemo(() => listings.filter(validCoordinates).map(item => ({
    ...item,
    display_name: String(item.display_name || item.name || "Ubicación").trim() || "Ubicación",
    locality_name: String(item.locality_name || item.locality || "").trim(),
    category_names: searchableValue(item.category_names || item.listing_categories || item.category_name || item.categories).trim(),
    item_names: searchableValue(item.item_names || item.product_names || item.products || item.services).trim(),
    search_aliases: searchableValue(item.search_aliases || item.aliases).trim(),
    category_icon_url: String(item.category_icon_url || "").trim(),
  })), [listings]);

  const filteredListings = useMemo(() => {
    const query = normalizeSearch(deferredSearch);
    if (!query) return validListings;
    const queryTerms = query.split(" ").filter(Boolean);
    return validListings.filter(item => {
      const haystack = normalizeSearch([item.display_name, item.category_names, item.item_names, item.search_aliases, item.short_description]);
      return queryTerms.every(term => equivalentTerms(term).some(equivalent=>haystack.includes(equivalent)));
    });
  }, [validListings, deferredSearch]);

  const ordered = useMemo(() => filteredListings.map(item => ({
    ...item,
    distance: distanceKm(userPosition, { lat: Number(item.latitude), lng: Number(item.longitude) }),
  })).sort((a, b) => userPosition ? a.distance - b.distance : a.display_name.localeCompare(b.display_name)), [filteredListings, userPosition]);
  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const pagedListings = useMemo(() => ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [ordered, page]);

  useEffect(() => { setPage(1); }, [deferredSearch]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => {
    document.body.classList.toggle("tags_directory_map_is_open", open);
    return () => document.body.classList.remove("tags_directory_map_is_open");
  }, [open]);

  useEffect(() => {
    if (!open || !apiKey || !mapElement.current) return;
    let cancelled = false;
    loadGoogleMaps(apiKey).then(async maps => {
      if (cancelled) return;
      const markerLibrary = await maps.importLibrary("marker");
      const bounds = new maps.LatLngBounds();
      const center = filteredListings.length ? { lat: Number(filteredListings[0].latitude), lng: Number(filteredListings[0].longitude) } : { lat: -32.1, lng: -64.45 };
      const map = new maps.Map(mapElement.current, { center, zoom: 10, mapId, streetViewControl: false, mapTypeControl: false, fullscreenControl: true });
      const info = new maps.InfoWindow();

      for (const item of filteredListings) {
        const position = { lat: Number(item.latitude), lng: Number(item.longitude) };
        bounds.extend(position);
        const pin = document.createElement("button");
        pin.className = "tags_directory_map_pin";
        pin.type = "button";
        const visual=markerVisual(item);
        if(visual.url){const icon=document.createElement("img");icon.src=visual.url;icon.alt="";icon.addEventListener("error",()=>{icon.remove();pin.textContent=visual.emoji;});pin.appendChild(icon);}else pin.textContent=visual.emoji;
        pin.setAttribute("aria-label",`${item.display_name}: ${item.category_names||"ubicación"}`);
        const marker = new markerLibrary.AdvancedMarkerElement({ map, position, title: item.display_name, content: pin });
        const show = () => {
          const content = document.createElement("div"), title = document.createElement("strong"), place = document.createElement("span"), link = document.createElement("a");
          title.textContent = item.display_name;
          place.textContent = [item.category_names, item.locality_name || item.address || "Calamuchita"].filter(Boolean).join(" · ");
          link.textContent = "Cómo llegar";
          link.href = directionsUrl(item, userPosition);
          link.target = "_blank";
          content.className = "tags_directory_map_popup";
          content.append(title, place, link);
          info.setContent(content);
          info.open({ map, anchor: marker });
        };
        marker.addListener("click", show);
        pin.addEventListener("mouseenter", show);
      }

      if (userPosition) {
        bounds.extend(userPosition);
        const userPin = document.createElement("div");
        userPin.className = "tags_directory_user_pin";
        userPin.title = "Tu ubicación";
        new markerLibrary.AdvancedMarkerElement({ map, position: userPosition, title: "Tu ubicación", content: userPin });
      }
      if (selectingPosition) {
        map.setOptions({ draggableCursor: "crosshair" });
        map.addListener("click", event => {
          setUserPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() });
          setPositionSource("manual");
          setSelectingPosition(false);
          setError("");
        });
      }
      if (!bounds.isEmpty()) map.fitBounds(bounds, 55);
    }).catch(reason => setError(reason?.message || "No se pudo mostrar el mapa."));
    return () => { cancelled = true; };
  }, [open, apiKey, filteredListings, userPosition, mapId, selectingPosition]);

  function locate() {
    if (!navigator.geolocation) { setError("Tu navegador no permite obtener la ubicación."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(position => {
      const lat = Number(position?.coords?.latitude), lng = Number(position?.coords?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setError("El navegador no devolvió una ubicación válida."); setLocating(false); return;
      }
      setUserPosition({ lat, lng });
      setPositionSource("browser"); setLocating(false);
    }, () => {
      setError("No pudimos obtener tu ubicación. Revisá los permisos del navegador."); setLocating(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }

  function changePage(nextPage){
    setPage(Math.min(totalPages,Math.max(1,nextPage)));
    window.requestAnimationFrame(()=>listElement.current?.scrollIntoView({behavior:"smooth",block:"start"}));
  }

  if (!validListings.length) return null;
  return <>
    <button type="button" className="tags_directory_show_map" onClick={() => setOpen(true)}><FaMapLocationDot /> Ver en el mapa <span>{validListings.length}</span></button>
    {open && <div className="tags_directory_map_backdrop" role="dialog" aria-modal="true" aria-label="Mapa de prestadores"><div className="tags_directory_map_modal">
      <header><div><span>RESULTADOS EN EL MAPA</span><h2>Prestadores y lugares</h2></div><button onClick={() => setOpen(false)} aria-label="Cerrar mapa"><FaXmark /></button></header>
      <div className="tags_directory_map_toolbar">
        <button onClick={locate} disabled={locating}><FaLocationCrosshairs /> {locating ? "Buscando ubicación..." : userPosition ? "Actualizar mi ubicación" : "Usar mi ubicación"}</button>
        {userPosition && <button className="is_correct" onClick={() => setSelectingPosition(true)}><FaMapLocationDot /> Corregir en el mapa</button>}
        {selectingPosition && <strong>Hacé clic en tu ubicación correcta.</strong>}
        {userPosition && !selectingPosition && <span>Posición {positionSource === "manual" ? "seleccionada manualmente" : "informada por tu navegador"}: {userPosition.lat.toFixed(5)}, {userPosition.lng.toFixed(5)}</span>}
      </div>
      <div className="tags_directory_map_search"><label><FaMagnifyingGlass /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre, rubro o producto" aria-label="Buscar en el mapa por nombre, rubro o producto" /></label><span><b>{filteredListings.length}</b> {filteredListings.length === 1 ? "coincidencia" : "coincidencias"}</span>{search && <button type="button" onClick={() => setSearch("")}>Limpiar</button>}</div>
      {!apiKey ? <div className="tags_directory_map_error">Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</div> : <div ref={mapElement} className="tags_directory_map_canvas" />}
      {error && <p className="tags_directory_map_error">{error}</p>}
      <section ref={listElement} className="tags_directory_map_list">{pagedListings.map(item => {
        const whatsapp = whatsappUrl(item.whatsapp);
        return <article key={`${item.result_type || item.layer || "business"}:${item.id}`}>
          <div className="tags_directory_map_business"><strong>{item.display_name}</strong>{item.category_names && <small>{item.category_names.split("|").slice(0,3).join(" · ")}</small>}<span>{item.address || "Domicilio no informado"}{item.locality_name ? ` · ${item.locality_name}` : ""}</span><div>{item.phone && <a href={`tel:${String(item.phone).replace(/[^\d+]/g, "")}`}><FaPhone /> {item.phone}</a>}{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="is_whatsapp"><FaWhatsapp /> WhatsApp</a>}</div></div>
          {item.distance != null && <b>{item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`}</b>}
          <a href={directionsUrl(item, userPosition)} target="_blank" rel="noreferrer" className="tags_directory_directions"><FaRoute /> Cómo llegar</a>
        </article>;
      })}{!pagedListings.length && <div className="tags_directory_map_empty"><FaMagnifyingGlass /><strong>No encontramos coincidencias</strong><span>Probá con otro nombre, rubro o producto.</span></div>}</section>
      {ordered.length > PAGE_SIZE && <nav className="tags_directory_map_pagination" aria-label="Páginas de prestadores"><button type="button" disabled={page === 1} onClick={() => changePage(page-1)}><FaChevronLeft /> Anterior</button><span>Página <b>{page}</b> de <b>{totalPages}</b></span><button type="button" disabled={page === totalPages} onClick={() => changePage(page+1)}>Siguiente <FaChevronRight /></button></nav>}
    </div></div>}
  </>;
}
