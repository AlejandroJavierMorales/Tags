"use client";

import { useEffect, useState } from "react";
import { FaEnvelope, FaPlus, FaToggleOff, FaToggleOn, FaUserShield } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import { GUEST_STAFF_PERMISSIONS, GUEST_STAFF_ROLES } from "@/app/modules/business-staff/lib/businessStaffPermissions";
import "./GuestExperienceTeamManager.css";

const EMPTY = { name: "", email: "", phone: "", roleCode: "reception", permissions: [] };

export default function GuestExperienceTeamManager({ businessId, data }) {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const base = `businessId=${businessId}&guestAppId=${data.app.id}`;

  async function load() {
    setBusy(true);
    try {
      const response = await fetch(`/api/guest-experience/admin/team?${base}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return showAlert({ title: "No se pudo cargar", text: payload.error, icon: "error" });
      setStaff(payload.staff || []);
    } finally { setBusy(false); }
  }
  useEffect(() => { load(); }, [businessId, data.app.id]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/guest-experience/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, guestAppId: data.app.id, ...form }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return showAlert({ title: "No se pudo completar", text: payload.error, icon: "error" });
      setForm(EMPTY);
      await load();
      await showAlert({ title: "Invitación enviada", text: "La persona recibirá un enlace de acceso válido por 15 minutos.", icon: "success" });
    } finally { setBusy(false); }
  }

  async function action(item, actionName, status) {
    setBusy(true);
    try {
      const response = await fetch("/api/guest-experience/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, guestAppId: data.app.id, staffId: item.id, action: actionName, status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return showAlert({ title: "No se pudo completar", text: payload.error, icon: "error" });
      await load();
      await showAlert({ title: actionName === "invite" ? "Invitación reenviada" : "Acceso actualizado", icon: "success", timer: 1400 });
    } finally { setBusy(false); }
  }

  const selectedPermissions = form.roleCode === "custom"
    ? form.permissions
    : GUEST_STAFF_ROLES[form.roleCode]?.permissions || [];

  return <section className="tags_guest_team">
    <header><div><span>EQUIPO Y ACCESOS</span><h2>Personas que pueden administrar Mi Estadía</h2><p>Cada integrante entra con su propio email y ve solamente las funciones autorizadas.</p></div></header>
    <div className="tags_guest_team_layout">
      <form onSubmit={save}>
        <h3><FaPlus /> Invitar una persona</h3>
        <label>Nombre<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label>Email<input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
        <label>Teléfono<input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label>
        <label>Qué podrá hacer<select value={form.roleCode} onChange={event => setForm({ ...form, roleCode: event.target.value, permissions: [] })}>{Object.entries(GUEST_STAFF_ROLES).map(([code, role]) => <option key={code} value={code}>{role.name}</option>)}</select></label>
        {form.roleCode === "custom" && <fieldset><legend>Elegir permisos</legend>{GUEST_STAFF_PERMISSIONS.map(([code, label]) => <label className="is_check" key={code}><input type="checkbox" checked={form.permissions.includes(code)} onChange={event => setForm(current => ({ ...current, permissions: event.target.checked ? [...current.permissions, code] : current.permissions.filter(item => item !== code) }))} />{label}</label>)}</fieldset>}
        {form.roleCode !== "custom" && <ul>{selectedPermissions.map(code => <li key={code}>{GUEST_STAFF_PERMISSIONS.find(item => item[0] === code)?.[1]}</li>)}</ul>}
        <button disabled={busy}><FaEnvelope /> Guardar y enviar acceso</button>
      </form>
      <div className="tags_guest_team_list">
        {staff.map(item => <article key={item.id}>
          <div><i><FaUserShield /></i><span><strong>{item.name}</strong><small>{item.email}</small><b>{GUEST_STAFF_ROLES[item.role_code]?.name || item.role_code}</b></span></div>
          <footer><button onClick={() => action(item, "invite")} disabled={item.status !== "active"}><FaEnvelope /> Reenviar acceso</button><button onClick={() => action(item, "status", item.status === "active" ? "inactive" : "active")}>{item.status === "active" ? <FaToggleOn /> : <FaToggleOff />}{item.status === "active" ? "Desactivar" : "Activar"}</button></footer>
        </article>)}
        {!staff.length && <p>Todavía no agregaste personas al equipo.</p>}
      </div>
    </div>
    {busy && <TagsSpinner size={110} logoSize={58} borderSize={5} background="rgba(255,255,255,.72)" />}
  </section>;
}

