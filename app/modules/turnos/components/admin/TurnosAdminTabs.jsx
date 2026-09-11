"use client";

import "./TurnosAdminTabs.css";

const ITEMS = [
    ["agenda", "Agenda"],
    ["reservations", "Reservas"],
    ["customers", "Clientes"],
    ["setup", "Servicios y recursos"],
    ["availability", "Disponibilidad"],
    ["blocks", "Bloqueos"],
    ["settings", "Configuración"],
    ["chatbot", "Chatbot IA"],
    ["publication", "Publicación"]
];

export default function TurnosAdminTabs({ value, onChange, sportsEnabled = false, isPlatformAdmin = false }) {
    const items = sportsEnabled ? [
        ["agenda", "Agenda"], ["reservations", "Reservas"], ["courts", "Canchas"],
        ["coaches", "Profesores"], ["activities", "Actividades"], ["availability", "Horarios"],
        ["blocks", "Bloqueos"], ["publication", "Página pública"], ["chatbot", "Chatbot IA"]
    ] : ITEMS;
    return <nav className="tags_turnos_admin_tabs" aria-label="Administración del turnero">
        {items.map(([id, label]) => <button key={id} type="button" className={value === id ? "is_active" : ""} onClick={() => onChange(id)}>{label}</button>)}
    </nav>;
}
