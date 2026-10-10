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

const SPORTS_GROUPS = [
    {
        id: "operations",
        label: "Agenda y reservas",
        items: [["agenda", "Agenda"], ["reservations", "Reservas"], ["availability", "Horarios"], ["blocks", "Bloqueos"]]
    },
    {
        id: "community",
        label: "Comunidad",
        items: [["community", "Jugadores y categorías"], ["teams", "Parejas y equipos"]]
    },
    {
        id: "competition",
        label: "Competencias",
        items: [["tournaments", "Torneos e inscripciones"], ["fixtures", "Fixture"], ["scoring", "Formatos y resultados"], ["rankings", "Clasificación y ranking"]]
    },
    {
        id: "club",
        label: "Club y clases",
        items: [["courts", "Canchas"], ["coaches", "Profesores"], ["coach-agenda", "Agenda de profesores"], ["activities", "Clases y actividades"]]
    },
    {
        id: "management",
        label: "Gestión",
        items: [["club-reports", "Ventas y comisiones"]]
    },
    {
        id: "configuration",
        label: "Configuración",
        items: [["settings", "Identidad y deportes"], ["setup", "Servicios y recursos"], ["publication", "Página pública"], ["chatbot", "Chatbot IA"]]
    }
];

export default function TurnosAdminTabs({ value, onChange, sportsEnabled = false }) {
    if (!sportsEnabled) {
        return <nav className="tags_turnos_admin_tabs" aria-label="Administración del turnero">
            {ITEMS.map(([id, label]) => <button key={id} type="button" className={value === id ? "is_active" : ""} onClick={() => onChange(id)}>{label}</button>)}
        </nav>;
    }

    const activeGroup = SPORTS_GROUPS.find(group => group.items.some(([id]) => id === value)) || SPORTS_GROUPS[0];
    return <div className="tags_turnos_admin_navigation">
        <nav className="tags_turnos_admin_tabs tags_turnos_admin_tabs_primary" aria-label="Áreas de Tags Club">
            {SPORTS_GROUPS.map(group => <button key={group.id} type="button" className={activeGroup.id === group.id ? "is_active" : ""} onClick={() => onChange(group.items[0][0])}>{group.label}</button>)}
        </nav>
        <nav className="tags_turnos_admin_tabs tags_turnos_admin_tabs_secondary" aria-label={`Opciones de ${activeGroup.label}`}>
            {activeGroup.items.map(([id, label]) => <button key={id} type="button" className={value === id ? "is_active" : ""} onClick={() => onChange(id)}>{label}</button>)}
        </nav>
    </div>;
}
