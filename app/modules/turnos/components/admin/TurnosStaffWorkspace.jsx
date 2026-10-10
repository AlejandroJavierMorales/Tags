"use client";

import { useEffect, useState } from "react";
import { FaCalendarCheck } from "react-icons/fa6";
import TurnosAdminAgenda from "./TurnosAdminAgenda";
import TurnosAdminBlocks from "./TurnosAdminBlocks";
import TurnosAdminCalendar from "./TurnosAdminCalendar";
import TagsSpinner from "@/app/components/TagsSpinner";
import "@/app/modules/turnos/styles/turnos-admin.css";
import "./TurnosStaffWorkspace.css";

export default function TurnosStaffWorkspace({ businessId, app }) {
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const query = `businessId=${businessId}&turnosId=${app.id}`;
      const [servicesResponse, resourcesResponse] = await Promise.all([
        fetch(`/api/turnos/admin/services?${query}`, { cache: "no-store" }),
        fetch(`/api/turnos/admin/resources?${query}`, { cache: "no-store" }),
      ]);
      const servicesPayload = await servicesResponse.json().catch(() => ({}));
      const resourcesPayload = await resourcesResponse.json().catch(() => ({}));
      if (!servicesResponse.ok || !resourcesResponse.ok) {
        throw new Error(servicesPayload.error || resourcesPayload.error || "No se pudo cargar la agenda");
      }
      setServices(servicesPayload.services || []);
      setResources(resourcesPayload.resources || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [businessId, app.id]);

  if (loading) return <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />;

  return <main className="tags_dashboard_page tags_turnos_staff_workspace">
    <header className="tags_dashboard_hero turnos_admin_platform_header"><div className="tags_dashboard_hero_left"><div className="tags_dashboard_logo_box"><FaCalendarCheck /></div><div><span className="tags_portal_dashboard_label">OPERACION DE TURNOS</span><h1 className="tags_dashboard_title">{app.name}</h1><p className="tags_dashboard_subtitle">Grilla de reservas, disponibilidad y bloqueos</p></div></div></header>
    {message && <div className="tags_portal_empty turnos_admin_notice">{message}</div>}
    <section className="tags_portal_section"><div className="tags_portal_section_header"><div><h2>Agenda operativa</h2><p>Gestiona reservas y disponibilidad. La configuracion general esta reservada al administrador.</p></div></div><TurnosAdminAgenda businessId={businessId} turnosId={app.id} services={services} resources={resources} intakeFields={app.settings?.intakeFields || []} /></section>
    <TurnosAdminBlocks businessId={businessId} turnosId={app.id} resources={resources} />
    <TurnosAdminCalendar businessId={businessId} turnosId={app.id} />
  </main>;
}
