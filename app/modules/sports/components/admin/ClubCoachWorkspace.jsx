"use client";

import { useEffect, useState } from "react";
import showAlert from "@/app/components/showAlert";
import "./ClubCoachWorkspace.css";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ClubCoachWorkspace({ businessId, turnosId, mode = "manage" }) {
  const [data, setData] = useState({ coaches: [], courts: [], staff: [], grants: [], availability: [] });
  const [selectedCoach, setSelectedCoach] = useState("");
  const [link, setLink] = useState({ staffId: "", resourceId: "" });
  const [slot, setSlot] = useState({ grantId: "", weekday: 1, startTime: "09:00", endTime: "10:00", slotIntervalMinutes: 60 });
  const [grant, setGrant] = useState({ courtResourceId: "", weekday: 1, startTime: "09:00", endTime: "18:00" });
  const query = `businessId=${businessId}&turnosId=${turnosId}`;
  async function load() {
    const coachesResponse = await fetch(`/api/sports/admin/coaches?${query}`, { cache: "no-store" });
    const coaches = await coachesResponse.json().catch(() => ({}));
    if (!coachesResponse.ok) return;
    const coachId = selectedCoach || coaches.coaches?.[0]?.id || "";
    setSelectedCoach(String(coachId));
    const [grantsResponse, availabilityResponse] = await Promise.all([
      fetch(`/api/sports/admin/coach-grants?${query}&coachId=${coachId}`, { cache: "no-store" }),
      fetch(`/api/sports/admin/coach-availability?${query}&coachId=${coachId}`, { cache: "no-store" })
    ]);
    const grants = await grantsResponse.json().catch(() => ({}));
    const availability = await availabilityResponse.json().catch(() => ({}));
    const commissionResponse = await fetch(`/api/sports/admin/coach-commissions?${query}&coachId=${coachId}`, { cache: "no-store" });
    const commissions = await commissionResponse.json().catch(() => ({}));
    setData({ ...coaches, grants: grants.grants || [], availability: availability.availability || [], commissions: commissions.rules || [], scopedCoach: availability.coach || null });
  }
  useEffect(() => { load(); }, [businessId, turnosId, selectedCoach]);
  async function send(url, method, body) { const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, turnosId, coachId: Number(selectedCoach || 0), ...body }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) { await showAlert({ title: "No se pudo guardar", text: payload.error, icon: "error" }); return false; } await load(); return true; }
  async function linkCoach(event) { event.preventDefault(); if (await send("/api/sports/admin/coaches", "POST", link)) setLink({ staffId: "", resourceId: "" }); }
  async function addAvailability(event) { event.preventDefault(); if (await send("/api/sports/admin/coach-availability", "POST", slot)) setSlot(current => ({ ...current, grantId: "" })); }
  async function addGrant(event) { event.preventDefault(); if (await send("/api/sports/admin/coach-grants", "POST", grant)) setGrant(current => ({ ...current, courtResourceId: "" })); }
  const currentGrants = data.grants.filter(item => !selectedCoach || Number(item.coach_id) === Number(selectedCoach));
  return <section className="club_coach_workspace">
    <header><div><span>PROFESORES Y CANCHAS</span><h2>{mode === "agenda" ? "Agenda de profesores" : "Profesores del club"}</h2><p>El administrador autoriza cancha y franja. Cada profesor publica sus horarios dentro de ese límite.</p></div></header>
    {mode === "manage" && <form className="club_coach_card" onSubmit={linkCoach}><h3>Vincular colaborador con profesor</h3><label>Colaborador<select required value={link.staffId} onChange={e => setLink({ ...link, staffId: e.target.value })}><option value="">Seleccionar</option>{data.staff.map(item => <option value={item.id} key={item.id}>{item.name} · {item.email}</option>)}</select></label><label>Recurso profesor<select required value={link.resourceId} onChange={e => setLink({ ...link, resourceId: e.target.value })}><option value="">Seleccionar</option>{data.coaches.length === 0 && null}{(data.resources || []).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button>Vincular profesor</button></form>}
    {data.coaches.length > 0 && <label className="club_coach_selector">Profesor<select value={selectedCoach} onChange={e => setSelectedCoach(e.target.value)}>{data.coaches.map(item => <option value={item.id} key={item.id}>{item.display_name}</option>)}</select></label>}
    {mode === "manage" && selectedCoach && <form className="club_coach_card club_coach_slot_form" onSubmit={addGrant}><h3>Autorizar cancha y franja</h3><label>Cancha<select required value={grant.courtResourceId} onChange={e => setGrant({ ...grant, courtResourceId: e.target.value })}><option value="">Seleccionar</option>{data.courts.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Día<select value={grant.weekday} onChange={e => setGrant({ ...grant, weekday: Number(e.target.value) })}>{DAYS.map((day,index)=><option value={index} key={day}>{day}</option>)}</select></label><label>Desde<input type="time" value={grant.startTime} onChange={e => setGrant({ ...grant, startTime: e.target.value })}/></label><label>Hasta<input type="time" value={grant.endTime} onChange={e => setGrant({ ...grant, endTime: e.target.value })}/></label><button>Autorizar franja</button></form>}
    <div className="club_coach_columns"><article className="club_coach_card"><h3>Franjas autorizadas</h3>{currentGrants.length ? currentGrants.map(item => <div className="club_coach_row" key={item.id}><div><strong>{item.court_name}</strong><small>{DAYS[item.weekday]} · {String(item.start_time).slice(0,5)} a {String(item.end_time).slice(0,5)}</small></div></div>) : <p>No hay franjas autorizadas para este profesor.</p>}</article><article className="club_coach_card"><h3>Horarios publicados</h3>{data.availability.length ? data.availability.map(item => <div className="club_coach_row" key={item.id}><div><strong>{item.court_name}</strong><small>{DAYS[item.weekday]} · {String(item.start_time).slice(0,5)} a {String(item.end_time).slice(0,5)}</small></div><button type="button" onClick={() => send("/api/sports/admin/coach-availability", "DELETE", { availabilityId: item.id })}>Quitar</button></div>) : <p>Todavía no publicó horarios.</p>}</article></div>
    <form className="club_coach_card club_coach_slot_form" onSubmit={addAvailability}><h3>Publicar horario de clase</h3><label>Franja autorizada<select required value={slot.grantId} onChange={e => { const grant = currentGrants.find(item => String(item.id) === e.target.value); setSlot({ ...slot, grantId: e.target.value, weekday: grant?.weekday ?? slot.weekday, startTime: String(grant?.start_time || slot.startTime).slice(0,5), endTime: String(grant?.end_time || slot.endTime).slice(0,5) }); }}><option value="">Seleccionar</option>{currentGrants.map(item => <option value={item.id} key={item.id}>{item.court_name} · {DAYS[item.weekday]} {String(item.start_time).slice(0,5)}–{String(item.end_time).slice(0,5)}</option>)}</select></label><label>Desde<input type="time" value={slot.startTime} onChange={e => setSlot({ ...slot, startTime: e.target.value })}/></label><label>Hasta<input type="time" value={slot.endTime} onChange={e => setSlot({ ...slot, endTime: e.target.value })}/></label><label>Intervalo<select value={slot.slotIntervalMinutes} onChange={e => setSlot({ ...slot, slotIntervalMinutes: Number(e.target.value) })}><option value="30">30 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option></select></label><button>Publicar disponibilidad</button></form>
  </section>;
}
