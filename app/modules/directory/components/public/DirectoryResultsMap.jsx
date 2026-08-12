"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaLocationCrosshairs, FaMapLocationDot, FaPhone, FaRoute, FaWhatsapp, FaXmark } from "react-icons/fa6";
import "./DirectoryResultsMap.css";

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__tagsDirectoryGoogleMapsPromise) return window.__tagsDirectoryGoogleMapsPromise;
  window.__tagsDirectoryGoogleMapsPromise = new Promise((resolve, reject) => {
    const callback = `tagsDirectoryMapsReady${Date.now()}`;
    window[callback] = () => { resolve(window.google.maps); delete window[callback]; };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=marker&callback=${callback}`;
    script.async = true;
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps."));
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

export default function DirectoryResultsMap({ listings = [], apiKey = "", mapId = "DEMO_MAP_ID" }) {
  const [open, setOpen] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [positionSource, setPositionSource] = useState("");
  const [selectingPosition, setSelectingPosition] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const mapElement = useRef(null);

  const ordered = useMemo(() => listings.map(item => ({
    ...item,
    distance: distanceKm(userPosition, { lat: Number(item.latitude), lng: Number(item.longitude) }),
  })).sort((a, b) => userPosition ? a.distance - b.distance : a.display_name.localeCompare(b.display_name)), [listings, userPosition]);

  useEffect(() => {
    if (!open || !apiKey || !mapElement.current) return;
    let cancelled = false;
    loadGoogleMaps(apiKey).then(async maps => {
      if (cancelled) return;
      const markerLibrary = await maps.importLibrary("marker");
      const bounds = new maps.LatLngBounds();
      const center = listings.length ? { lat: Number(listings[0].latitude), lng: Number(listings[0].longitude) } : { lat: -32.1, lng: -64.45 };
      const map = new maps.Map(mapElement.current, { center, zoom: 10, mapId, streetViewControl: false, mapTypeControl: false, fullscreenControl: true });
      const info = new maps.InfoWindow();

      for (const item of listings) {
        const position = { lat: Number(item.latitude), lng: Number(item.longitude) };
        bounds.extend(position);
        const pin = document.createElement("button");
        pin.className = "tags_directory_map_pin";
        pin.type = "button";
        pin.textContent = item.display_name.charAt(0);
        const marker = new markerLibrary.AdvancedMarkerElement({ map, position, title: item.display_name, content: pin });
        const show = () => {
          const content = document.createElement("div"), title = document.createElement("strong"), place = document.createElement("span"), link = document.createElement("a");
          title.textContent = item.display_name;
          place.textContent = item.locality_name || item.address || "Calamuchita";
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
    }).catch(reason => setError(reason.message));
    return () => { cancelled = true; };
  }, [open, apiKey, listings, userPosition, mapId, selectingPosition]);

  function locate() {
    if (!navigator.geolocation) { setError("Tu navegador no permite obtener la ubicación."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(position => {
      setUserPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
      setPositionSource("browser"); setLocating(false);
    }, () => {
      setError("No pudimos obtener tu ubicación. Revisá los permisos del navegador."); setLocating(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }

  if (!listings.length) return null;
  return <>
    <button type="button" className="tags_directory_show_map" onClick={() => setOpen(true)}><FaMapLocationDot /> Ver en el mapa <span>{listings.length}</span></button>
    {open && <div className="tags_directory_map_backdrop" role="dialog" aria-modal="true" aria-label="Mapa de prestadores"><div className="tags_directory_map_modal">
      <header><div><span>RESULTADOS EN EL MAPA</span><h2>Prestadores encontrados</h2></div><button onClick={() => setOpen(false)} aria-label="Cerrar mapa"><FaXmark /></button></header>
      <div className="tags_directory_map_toolbar">
        <button onClick={locate} disabled={locating}><FaLocationCrosshairs /> {locating ? "Buscando ubicación..." : userPosition ? "Actualizar mi ubicación" : "Usar mi ubicación"}</button>
        {userPosition && <button className="is_correct" onClick={() => setSelectingPosition(true)}><FaMapLocationDot /> Corregir en el mapa</button>}
        {selectingPosition && <strong>Hacé clic en tu ubicación correcta.</strong>}
        {userPosition && !selectingPosition && <span>Posición {positionSource === "manual" ? "seleccionada manualmente" : "informada por tu navegador"}: {userPosition.lat.toFixed(5)}, {userPosition.lng.toFixed(5)}</span>}
      </div>
      {!apiKey ? <div className="tags_directory_map_error">Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</div> : <div ref={mapElement} className="tags_directory_map_canvas" />}
      {error && <p className="tags_directory_map_error">{error}</p>}
      <section className="tags_directory_map_list">{ordered.map(item => {
        const whatsapp = whatsappUrl(item.whatsapp);
        return <article key={item.id}>
          <div className="tags_directory_map_business"><strong>{item.display_name}</strong><span>{item.address || "Domicilio no informado"}{item.locality_name ? ` · ${item.locality_name}` : ""}</span><div>{item.phone && <a href={`tel:${String(item.phone).replace(/[^\d+]/g, "")}`}><FaPhone /> {item.phone}</a>}{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="is_whatsapp"><FaWhatsapp /> WhatsApp</a>}</div></div>
          {item.distance != null && <b>{item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`}</b>}
          <a href={directionsUrl(item, userPosition)} target="_blank" rel="noreferrer" className="tags_directory_directions"><FaRoute /> Cómo llegar</a>
        </article>;
      })}</section>
    </div></div>}
  </>;
}
