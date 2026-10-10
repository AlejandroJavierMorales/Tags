"use client";

import { useEffect, useState } from "react";
import { FaCalendarCheck, FaUserGroup, FaXmark } from "react-icons/fa6";
import TurnosPublicRenderer from "@/app/modules/turnos/components/public/TurnosPublicRenderer";
import ClubPublicAccount from "@/app/modules/sports/components/public/ClubPublicAccount";
import "./DirectoryEmbeddedTurnos.css";

export default function DirectoryEmbeddedTurnos({ apps = [], returnUrl = "", presentation = {} }) {
  const configuredIds = Array.isArray(presentation.visibleAppIds) ? presentation.visibleAppIds.map(Number) : null;
  const visibleApps = configuredIds ? configuredIds.map(id => apps.find(item => Number(item.id) === id)).filter(Boolean) : apps;
  const [selectedId, setSelectedId] = useState(visibleApps[0]?.id || null);
  const [open, setOpen] = useState(false);
  const [clubOpen, setClubOpen] = useState(false);
  const selected = visibleApps.find(item => Number(item.id) === Number(selectedId)) || visibleApps[0];
  const modalMode = (presentation.displayMode || "modal") === "modal";
  useEffect(() => {
    if (!open && !clubOpen) return undefined;
    const previous = document.body.style.overflow;
    const closeOnEscape = event => { if (event.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", closeOnEscape); };
  }, [open, clubOpen]);
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search);
    if (selected?.business_profile_code === "sports_club" && mode.get("club") === "1") setClubOpen(true);
    if (mode.get("reservas") === "1") setOpen(true);
  }, [selected?.business_profile_code]);
  if (!selected) return null;
  const useDirectoryTheme = presentation.useDirectoryTheme !== false;
  const style = useDirectoryTheme
    ? { padding: presentation.padding || "24px", borderRadius: "var(--qr-radius)", background: "var(--qr-surface)" }
    : { "--qr-bg": presentation.backgroundColor || "#f3f7f5", "--qr-surface": presentation.surfaceColor || "#fff", "--qr-surface-alt": presentation.backgroundColor || "#f3f7f5", "--qr-text": presentation.textColor || "#17231d", "--qr-muted": presentation.textColor || "#52645a", "--qr-primary": presentation.accentColor || "#26734f", "--qr-primary-text": "#fff", "--qr-border": `${presentation.accentColor || "#26734f"}33`, "--qr-radius": presentation.borderRadius || "18px", padding: presentation.padding || "24px", borderRadius: presentation.borderRadius || "18px", background: presentation.backgroundColor || "#f3f7f5" };
  return <div className="tags_directory_embedded_turnos" style={style}>
    {presentation.showIntro !== false && <header className="tags_directory_embedded_turnos_intro"><span>{presentation.eyebrow || "RESERVAS ONLINE"}</span><h2>{presentation.title || "Reservá tu próximo turno"}</h2><p>{presentation.description || "Elegí la actividad, el día y el horario que prefieras."}</p></header>}
    {visibleApps.length > 1 && <nav aria-label="Agendas disponibles">{visibleApps.map(item => <button type="button" className={Number(item.id) === Number(selected.id) ? "is_active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>{item.name}</button>)}</nav>}
    {selected.business_profile_code === "sports_club" && <button type="button" className="tags_directory_embedded_turnos_cta is_club" onClick={() => setClubOpen(true)}><FaUserGroup /><span><strong>Mi Club</strong><small>Registrate o consultá tu perfil de jugador</small></span></button>}
    {modalMode ? <>
      <button type="button" className="tags_directory_embedded_turnos_cta" onClick={() => setOpen(true)}><FaCalendarCheck /><span><strong>{presentation.buttonLabel || "Solicitar un turno"}</strong><small>Consultá días y horarios disponibles</small></span></button>
      {open && <div className="tags_directory_turnos_modal_backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="tags_directory_turnos_modal" role="dialog" aria-modal="true" aria-label={`Reservas de ${selected.business_display_name || selected.business_name || selected.name}`} onMouseDown={event => event.stopPropagation()}>
        <header>{selected.business_logo_url ? <img src={selected.business_logo_url} alt={selected.business_display_name || selected.business_name || selected.name} /> : <FaCalendarCheck />}<div><small>RESERVAS ONLINE</small><strong>{selected.business_display_name || selected.business_name || selected.name}</strong></div><button type="button" aria-label="Cerrar reservas" onClick={() => setOpen(false)}><FaXmark /></button></header>
        <div className="tags_directory_turnos_modal_body"><TurnosPublicRenderer key={selected.id} page={selected.page} app={{ ...selected, hasPortal: true }} embedded embeddedReturnUrl={returnUrl} /></div>
      </section></div>}
      {clubOpen && <div className="tags_directory_turnos_modal_backdrop" role="presentation" onMouseDown={() => setClubOpen(false)}><section className="tags_directory_turnos_modal tags_directory_club_modal" role="dialog" aria-modal="true" aria-label={`Mi Club · ${selected.business_display_name || selected.business_name || selected.name}`} onMouseDown={event => event.stopPropagation()}>
        <header>{selected.business_logo_url ? <img src={selected.business_logo_url} alt={selected.business_display_name || selected.business_name || selected.name} /> : <FaUserGroup />}<div><small>COMUNIDAD DEPORTIVA</small><strong>{selected.business_display_name || selected.business_name || selected.name}</strong></div><button type="button" aria-label="Cerrar Mi Club" onClick={() => setClubOpen(false)}><FaXmark /></button></header>
        <div className="tags_directory_turnos_modal_body"><ClubPublicAccount slug={selected.slug} returnUrl={returnUrl}/></div>
      </section></div>}
    </> : <TurnosPublicRenderer key={selected.id} page={selected.page} app={{ ...selected, hasPortal: true }} embedded embeddedReturnUrl={returnUrl} />}
  </div>;
}
