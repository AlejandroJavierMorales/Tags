"use client";

import { useState } from "react";
import TurnosPublicRenderer from "@/app/modules/turnos/components/public/TurnosPublicRenderer";
import "./DirectoryEmbeddedTurnos.css";

export default function DirectoryEmbeddedTurnos({ apps = [], returnUrl = "", presentation = {} }) {
  const configuredIds = Array.isArray(presentation.visibleAppIds) ? presentation.visibleAppIds.map(Number) : null;
  const visibleApps = configuredIds ? configuredIds.map(id => apps.find(item => Number(item.id) === id)).filter(Boolean) : apps;
  const [selectedId, setSelectedId] = useState(visibleApps[0]?.id || null);
  const selected = visibleApps.find(item => Number(item.id) === Number(selectedId)) || visibleApps[0];
  if (!selected) return null;
  const style = { "--qr-bg": presentation.backgroundColor || "#f3f7f5", "--qr-surface": presentation.surfaceColor || "#fff", "--qr-surface-alt": presentation.backgroundColor || "#f3f7f5", "--qr-text": presentation.textColor || "#17231d", "--qr-muted": presentation.textColor || "#52645a", "--qr-primary": presentation.accentColor || "#26734f", "--qr-primary-text": "#fff", "--qr-border": `${presentation.accentColor || "#26734f"}33`, "--qr-radius": presentation.borderRadius || "18px", padding: presentation.padding || "24px", borderRadius: presentation.borderRadius || "18px", background: presentation.backgroundColor || "#f3f7f5" };
  return <div className="tags_directory_embedded_turnos" style={style}>
    {presentation.showIntro !== false && <header className="tags_directory_embedded_turnos_intro"><span>{presentation.eyebrow || "RESERVAS ONLINE"}</span><h2>{presentation.title || "Reservá tu próximo turno"}</h2><p>{presentation.description || "Elegí la actividad, el día y el horario que prefieras."}</p></header>}
    {visibleApps.length > 1 && <nav aria-label="Agendas disponibles">{visibleApps.map(item => <button type="button" className={Number(item.id) === Number(selected.id) ? "is_active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}>{item.name}</button>)}</nav>}
    <TurnosPublicRenderer key={selected.id} page={selected.page} app={{ ...selected, hasPortal: true }} embedded embeddedReturnUrl={returnUrl} />
  </div>;
}
