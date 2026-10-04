"use client";

import { useEffect, useState } from "react";
import { FaArrowDown, FaArrowUp, FaPlus, FaTrash } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import PushNotificationButton from "@/app/modules/notifications/components/PushNotificationButton";
import "./TurnosAdminPolicies.css";

const TYPE_LABELS = { text: "Respuesta breve", textarea: "Respuesta extensa", select: "Lista de opciones", checkbox: "Casilla de aceptación" };

function createField() {
    return { key: `pregunta_${Date.now()}`, label: "", type: "text", required: false, options: [] };
}

export default function TurnosAdminPolicies({ businessId, turnosId, settings, publicPolicy, depositPolicy, onSaved }) {
    const [policy, setPolicy] = useState(publicPolicy || {});
    const [fields, setFields] = useState(Array.isArray(settings?.intakeFields) ? settings.intakeFields : []);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => setPolicy(publicPolicy || {}), [publicPolicy]);
    useEffect(() => setFields(Array.isArray(settings?.intakeFields) ? settings.intakeFields : []), [settings]);

    function updateField(index, changes) {
        setFields(current => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...changes } : field));
    }

    function moveField(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= fields.length) return;
        const next = [...fields];
        [next[index], next[target]] = [next[target], next[index]];
        setFields(next);
    }

    async function save(event) {
        event.preventDefault();
        if (fields.some(field => !String(field.label || "").trim())) {
            setMessage("Todas las preguntas deben tener un título.");
            return;
        }
        setBusy(true);
        try {
            const response = await fetch("/api/turnos/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, turnosId, settings: { ...settings, intakeFields: fields }, depositPolicy, publicBookingPolicy: policy })
            });
            const payload = await response.json();
            setMessage(response.ok ? "Configuración guardada." : payload.error || "No se pudo guardar.");
            if (response.ok) onSaved?.();
        } finally { setBusy(false); }
    }

    return <section className="tags_turnos_admin_policies">
        <header><h2>Datos y cambios de las reservas</h2><p>Definí la identificación, las políticas y la información operativa que necesitás antes de atender.</p></header>
        <form onSubmit={save}>
            <label>Identificación del cliente<select value={policy.defaultIdentification || "contact"} onChange={event => setPolicy({ ...policy, defaultIdentification: event.target.value })}><option value="contact">Nombre y contacto, sin iniciar sesión</option><option value="magic_link">Verificación mediante enlace por email</option></select></label>
            <label>Cancelar hasta<input type="number" min="0" step="1" value={Number(policy.cancellationNoticeMinutes || 0) / 60} onChange={event => setPolicy({ ...policy, cancellationNoticeMinutes: Number(event.target.value) * 60 })} /><small>Horas antes. Ejemplo: 24 equivale a un día.</small></label>
            <label>Reprogramar hasta<input type="number" min="0" step="1" value={Number(policy.rescheduleNoticeMinutes || 0) / 60} onChange={event => setPolicy({ ...policy, rescheduleNoticeMinutes: Number(event.target.value) * 60 })} /><small>Horas antes. Ejemplo: 48 equivale a dos días.</small></label>
            <fieldset className="tags_turnos_intake_editor">
                <legend>Preguntas previas a la reserva</legend>
                <p>Se mostrarán después de elegir el turno. Evitá solicitar datos sensibles que no sean necesarios.</p>
                <div className="tags_turnos_intake_editor_list">
                    {fields.map((field, index) => <article key={field.key || index}>
                        <label>Pregunta<input value={field.label || ""} onChange={event => updateField(index, { label: event.target.value })} placeholder="Ej.: ¿Es tu primera consulta?" /></label>
                        <label>Tipo<select value={field.type || "text"} onChange={event => updateField(index, { type: event.target.value, options: event.target.value === "select" ? field.options || [] : [] })}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                        {field.type === "select" && <label className="is_wide">Opciones<textarea rows="3" value={Array.isArray(field.options) ? field.options.join("\n") : field.options || ""} onChange={event => updateField(index, { options: event.target.value.split("\n") })} placeholder={"Presencial\nTelefónica\nVideollamada"} /><small>Escribí una opción por línea.</small></label>}
                        <label className="is_check"><input type="checkbox" checked={field.required === true} onChange={event => updateField(index, { required: event.target.checked })} /> Obligatoria</label>
                        <nav><button type="button" disabled={index === 0} onClick={() => moveField(index, -1)} aria-label="Subir pregunta"><FaArrowUp /></button><button type="button" disabled={index === fields.length - 1} onClick={() => moveField(index, 1)} aria-label="Bajar pregunta"><FaArrowDown /></button><button type="button" className="is_danger" onClick={() => setFields(current => current.filter((_, fieldIndex) => fieldIndex !== index))} aria-label="Eliminar pregunta"><FaTrash /></button></nav>
                    </article>)}
                    {!fields.length && <p className="tags_turnos_intake_editor_empty">No hay preguntas adicionales. El formulario pedirá solamente nombre y contacto.</p>}
                </div>
                <button type="button" className="tags_turnos_intake_add" onClick={() => setFields(current => [...current, createField()])}><FaPlus /> Agregar pregunta</button>
            </fieldset>
            <button disabled={busy}>Guardar configuración</button>
        </form>
        <PushNotificationButton businessId={businessId} />
        {message && <p className="tags_turnos_admin_policies_notice">{message}</p>}
        {busy && <TagsSpinner size={120} logoSize={66} borderSize={5} background="rgba(255,255,255,.72)" />}
    </section>;
}
