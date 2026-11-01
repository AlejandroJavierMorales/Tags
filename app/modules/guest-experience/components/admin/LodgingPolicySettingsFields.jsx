"use client";

import "./LodgingPolicySettingsFields.css";

export default function LodgingPolicySettingsFields({ value, onChange }) {
 const update=(key,next)=>onChange({...value,[key]:next});
 return <section className="tags_guest_settings_group tags_lodging_policy_fields">
  <h3>Políticas del motor de reservas</h3>
  <p>Reglas generales del alojamiento. Las excepciones operativas se registrarán sin reemplazar estas políticas.</p>
  <div>
   <label>Modelo de capacidad<select value={value.capacityMode} onChange={e=>update("capacityMode",e.target.value)}><option value="total_occupancy">Capacidad total</option><option value="adult_child_limits">Límites separados de adultos y menores</option></select></label>
   <label>Edad hasta la que no abona<input type="number" min="0" max="17" value={value.childFreeAge} onChange={e=>update("childFreeAge",e.target.value)}/><small>La ocupación de cama puede consultarse por separado.</small></label>
   <label className="tags_lodging_policy_check"><span><input type="checkbox" checked={value.askBedOccupancy} onChange={e=>update("askBedOccupancy",e.target.checked)}/> Consultar si el menor ocupa cama</span></label>
   <label>Estadía mínima<input type="number" min="1" max="365" value={value.minimumNights} onChange={e=>update("minimumNights",e.target.value)}/><small>Noches</small></label>
   <label>Estadía máxima<input type="number" min="1" max="730" value={value.maximumNights} onChange={e=>update("maximumNights",e.target.value)}/><small>Noches</small></label>
   <label>Anticipación mínima<input type="number" min="0" max="730" value={value.minimumAdvanceDays} onChange={e=>update("minimumAdvanceDays",e.target.value)}/><small>Días</small></label>
   <label>Anticipación máxima<input type="number" min="1" max="1095" value={value.maximumAdvanceDays} onChange={e=>update("maximumAdvanceDays",e.target.value)}/><small>Días</small></label>
   <label>Protección de huecos<select value={value.gapProtectionMode} onChange={e=>update("gapProtectionMode",e.target.value)}><option value="disabled">Desactivada</option><option value="warn">Advertir</option><option value="manual_review">Enviar a revisión manual</option><option value="block">Bloquear solicitud</option><option value="auto_adjust">Proponer fechas alternativas</option></select></label>
   <label>Hueco mínimo anterior<input type="number" min="0" max="30" value={value.minimumGapBefore} onChange={e=>update("minimumGapBefore",e.target.value)}/><small>Noches residuales permitidas antes</small></label>
   <label>Hueco mínimo posterior<input type="number" min="0" max="30" value={value.minimumGapAfter} onChange={e=>update("minimumGapAfter",e.target.value)}/><small>Noches residuales permitidas después</small></label>
   <label>Nivel de automatización<select value={value.automationMode} onChange={e=>update("automationMode",e.target.value)}><option value="availability_only">Sólo consultar disponibilidad</option><option value="quote_whatsapp">Cotizar y continuar por WhatsApp</option><option value="request_review">Recibir solicitud para revisar</option><option value="automatic">Reserva automática</option></select></label>
   <label>Duración de la retención<input type="number" min="5" max="120" value={value.holdMinutes} onChange={e=>update("holdMinutes",e.target.value)}/><small>Minutos durante los que una solicitud directa conserva la unidad.</small></label>
  </div>
 </section>;
}
