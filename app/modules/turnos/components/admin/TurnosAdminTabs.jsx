"use client";import "./TurnosAdminTabs.css";
const ITEMS=[['agenda','Agenda'],['reservations','Reservas'],['customers','Clientes'],['setup','Servicios y recursos'],['availability','Disponibilidad'],['blocks','Bloqueos'],['settings','Configuración'],['publication','Publicación']];
export default function TurnosAdminTabs({value,onChange}){return <nav className="tags_turnos_admin_tabs" aria-label="Administración del turnero">{ITEMS.map(([id,label])=><button key={id} type="button" className={value===id?"is_active":""} onClick={()=>onChange(id)}>{label}</button>)}</nav>}
