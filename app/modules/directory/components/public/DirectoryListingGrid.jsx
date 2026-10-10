"use client";

import { useEffect, useRef } from "react";
import { FaArrowRight, FaCalendarDays, FaClock, FaEye, FaLocationDot, FaMapLocationDot, FaPhone, FaWhatsapp } from "react-icons/fa6";
import Link from "next/link";
import Image from "next/image";
import { directoryImageUrl, directoryWhatsappUrl } from "../../lib/directoryPublicFormatting";
import "./DirectoryListingGrid.css";

function providerHref(slug, returnHref, navigationTrail) {
  const params = new URLSearchParams();
  if (returnHref?.startsWith("/directorio")) params.set("volver", returnHref);
  if (navigationTrail?.length) params.set("ruta", JSON.stringify(navigationTrail));
  const query = params.toString();
  return `/${slug}${query ? `?${query}` : ""}`;
}

const CONTENT_TYPE_LABELS={attraction:"Atractivo",walk:"Paseo",experience:"Experiencia",excursion:"Excursión",event:"Evento",beach:"Balneario",river_access:"Acceso al río",viewpoint:"Mirador",museum:"Museo",route:"Circuito",public_service:"Servicio público",recommendation:"Recomendación",other:"Lugar de interés"};

function displayDate(value){
  if(!value)return"";
  const raw=String(value).trim(),date=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return date?`${date[3]}/${date[2]}/${date[1]}`:raw;
}

export default function DirectoryListingGrid({ listings, returnHref = "", navigationTrail = [] }) {
  const gridRef = useRef(null);

  useEffect(() => {
    const root = gridRef.current;
    if (!root || !globalThis.IntersectionObserver) return undefined;
    const query = new URLSearchParams(window.location.search).get("q") || null;
    const send = payload => {
      const body = JSON.stringify({
        host: window.location.hostname,
        path: window.location.pathname,
        sessionId: window.sessionStorage.getItem("tags_audience_session"),
        visitorId: window.localStorage.getItem("tags_audience_visitor"),
        searchQuery: query,
        ...payload,
      });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/public/audience/events", new Blob([body], { type: "application/json" }));
      else fetch("/api/public/audience/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) continue;
        const listingId = Number(entry.target.dataset.listingId || 0);
        const impressionKey = `tags_result_impression:${window.location.pathname}:${window.location.search}:${listingId}`;
        let recorded = false;
        try { recorded = window.sessionStorage.getItem(impressionKey) === "1"; } catch {}
        if (!recorded) {
          try { window.sessionStorage.setItem(impressionKey, "1"); } catch {}
          send({ eventType: "result_impression", eventKey: "listing_card", eventLabel: entry.target.dataset.listingName, listingId });
        }
        observer.unobserve(entry.target);
      }
    }, { threshold: [0.35] });
    root.querySelectorAll("[data-listing-id]").forEach(element => observer.observe(element));
    const onClick = event => {
      const action = event.target.closest("[data-result-action]");
      if (!action) return;
      const card = action.closest("[data-listing-id]");
      if (!card) return;
      send({ eventType: "result_click", eventKey: action.dataset.resultAction, eventLabel: card.dataset.listingName, targetUrl: action.getAttribute("href"), listingId: Number(card.dataset.listingId || 0) });
    };
    root.addEventListener("click", onClick, true);
    return () => { observer.disconnect(); root.removeEventListener("click", onClick, true); };
  }, [listings]);

  if (!listings.length) return <div className="tags_directory_empty"><strong>No encontramos resultados</strong><span>Probá con otro rubro, localidad o término de búsqueda.</span></div>;
  return <div className="tags_directory_listing_grid" ref={gridRef}>
    {listings.map(listing => {
      const whatsapp = directoryWhatsappUrl(listing.whatsapp);
      const phone=String(listing.phone||"").replace(/[^\d+]/g,"");
      const directions = listing.latitude != null && listing.longitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}` : null;
      const tourism=listing.result_type==="tourism";
      return <article className={`tags_directory_listing_card${tourism?" is_tourism":""}`} key={`${listing.result_type||"provider"}:${listing.id}`} {...(!tourism?{"data-listing-id":listing.id,"data-listing-name":listing.display_name}:{})}>
        <div className="tags_directory_listing_image">
          {listing.image_url ? <Image src={directoryImageUrl(listing.image_url)} alt={`Imagen de ${listing.display_name}`} width={260} height={220} sizes="(max-width: 380px) 80px, (max-width: 700px) 94px, 130px" /> : <span>{listing.display_name.charAt(0)}</span>}
        </div>
        <div className="tags_directory_listing_body">
          <div>{tourism&&<span className="tags_directory_tourism_badge">{CONTENT_TYPE_LABELS[listing.content_type]||"Información turística"}</span>}<h3>{listing.display_name}</h3>{listing.locality_name && <p><FaLocationDot /> {listing.locality_name}</p>}</div>
          {listing.short_description && <p className="tags_directory_listing_description">{listing.short_description}</p>}
          {tourism&&<div className="tags_directory_tourism_facts">{listing.event_start&&<small><FaCalendarDays/> {displayDate(listing.event_start)}{listing.event_end&&listing.event_end!==listing.event_start?` al ${displayDate(listing.event_end)}`:""}</small>}{listing.schedule&&<small><FaClock/> {listing.schedule}</small>}</div>}
          <div className="tags_directory_listing_actions">
            {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="is_whatsapp" data-result-action="whatsapp" aria-label={`WhatsApp de ${listing.display_name}`}><FaWhatsapp /> WhatsApp</a>}
            {tourism&&phone&&<a href={`tel:${phone}`}><FaPhone/> Llamar</a>}
            {directions && <a href={directions} target="_blank" rel="noreferrer" data-result-action="directions"><FaMapLocationDot /> Cómo llegar</a>}
            {tourism&&listing.public_url&&<a href={listing.public_url} target="_blank" rel="noreferrer" className="is_detail"><FaEye/> Ver información</a>}
            {!tourism&&Number(listing.is_free) === 0
              ? <Link href={providerHref(listing.slug, returnHref, navigationTrail)} className="is_detail" data-result-action="view">Ver sitio web <FaArrowRight /></Link>
              : !tourism&&<span className="is_free_badge">Publicación gratuita</span>}
          </div>
        </div>
      </article>;
    })}
  </div>;
}
