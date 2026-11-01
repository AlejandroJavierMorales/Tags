"use client";

import { useEffect, useMemo, useState } from "react";
import { FaCalendarDays, FaXmark } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import PushNotificationButton from "@/app/modules/notifications/components/PushNotificationButton";
import showAlert from "@/app/components/showAlert";
import "./GuestExperienceRateCalendar.css";
import "./GuestExperienceRatePeriod.css";
import "./GuestExperienceRateCalendarRefinements.css";

const localDate = (value = new Date()) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const plusDays = (value, amount) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDate(date);
};

const money = (value, currency = "ARS") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const read = (response) => response.json().catch(() => ({}));

function monthGroups(dates) {
  const groups = [];
  for (const date of dates) {
    const value = new Date(`${date}T12:00:00`);
    const key = `${value.getFullYear()}-${value.getMonth()}`;
    const label = value.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    const previous = groups[groups.length - 1];
    if (previous?.key === key) previous.count += 1;
    else groups.push({ key, label, count: 1 });
  }
  return groups;
}

function emptyPeriod(from, to) {
  return {
    startsOn: from,
    endsOn: to,
    minimumNights: "",
    maximumNights: "",
    isOpen: true,
    closedToArrival: false,
    closedToDeparture: false,
    requiresManualReview: false,
    unitRates: [],
  };
}

export default function GuestExperienceRateCalendar({ businessId, data }) {
  const guestAppId = data.app.id;
  const units = data.units || [];
  const settings = data.app.settings || {};
  const configuredStart = /^\d{4}-\d{2}-\d{2}$/.test(settings.occupancyStartDate || "")
    ? settings.occupancyStartDate
    : localDate();
  const initialFrom = settings.occupancyFixedPeriod ? configuredStart : localDate();
  const initialTo = plusDays(initialFrom, Math.min(120, Math.max(7, Number(settings.occupancyDays || 30))));
  const [draft, setDraft] = useState({ from: initialFrom, to: initialTo, occupants: 2 });
  const [range, setRange] = useState({ from: initialFrom, to: initialTo, occupants: 2 });
  const [calendar, setCalendar] = useState(null);
  const [periodForm, setPeriodForm] = useState(null);
  const [cellForm, setCellForm] = useState(null);
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    try {
      const common = `businessId=${businessId}&guestAppId=${guestAppId}`;
      const calendarResponse = await fetch(
        `/api/guest-experience/admin/rate-calendar?${common}&from=${range.from}&to=${range.to}&occupants=${range.occupants}`,
        { cache: "no-store" },
      );
      const calendarPayload = await read(calendarResponse);
      if (!calendarResponse.ok) {
        return showAlert({
          title: "No se pudo abrir el calendario",
          text: calendarPayload.error || "Reintentá nuevamente.",
          icon: "error",
        });
      }
      setCalendar(calendarPayload);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [businessId, guestAppId, range.from, range.to, range.occupants]);

  function applyRange(event) {
    event.preventDefault();
    if (!draft.from || !draft.to || draft.to <= draft.from) {
      return showAlert({
        title: "Revisá las fechas",
        text: "La fecha Hasta debe ser posterior a la fecha Desde.",
        icon: "warning",
      });
    }
    setRange({
      from: draft.from,
      to: draft.to,
      occupants: Math.max(1, Number(draft.occupants || 1)),
    });
  }

  function togglePeriodUnit(unit, selected) {
    setPeriodForm((current) => {
      if (!selected) {
        return {
          ...current,
          unitRates: current.unitRates.filter((item) => Number(item.unitId) !== Number(unit.id)),
        };
      }
      const capacity = Math.max(
        1,
        Number(unit.capacity_adults || 0) + Number(unit.capacity_children || 0),
      );
      return {
        ...current,
        unitRates: [
          ...current.unitRates,
          {
            unitId: Number(unit.id),
            unitName: unit.name,
            capacity,
            prices: Array.from({ length: capacity }, (_, index) => ({
              occupants: index + 1,
              nightlyRate: "",
            })),
          },
        ],
      };
    });
  }

  async function savePeriod(event, form = periodForm) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/guest-experience/admin/rate-calendar/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, guestAppId, ...form }),
      });
      const payload = await read(response);
      if (!response.ok) {
        return showAlert({
          title: "No se pudo guardar",
          text: payload.error,
          icon: "error",
        });
      }
      setPeriodForm(null);
      setCellForm(null);
      await load();
      await showAlert({
        title: "Calendario actualizado",
        text: "Los precios y restricciones quedaron aplicados.",
        icon: "success",
        timer: 1600,
      });
    } finally {
      setBusy(false);
    }
  }

  async function openCell(unit, cell) {
    setBusy(true);
    try {
      const query = new URLSearchParams({
        businessId: String(businessId),
        guestAppId: String(guestAppId),
        unitId: String(unit.id),
        date: cell.date,
      });
      const response = await fetch(`/api/guest-experience/admin/rate-calendar/cell?${query}`, {
        cache: "no-store",
      });
      const payload = await read(response);
      if (!response.ok) {
        return showAlert({ title: "No se pudo abrir la fecha", text: payload.error, icon: "error" });
      }
      setCellForm(payload.cell);
    } finally {
      setBusy(false);
    }
  }

  const visibleDates = calendar?.dates || [];
  const months = useMemo(() => monthGroups(visibleDates), [visibleDates]);

  return (
    <section className="tags_guest_rates">
      <header>
        <div>
          <span>TARIFAS Y DISPONIBILIDAD</span>
          <h2>Calendario de venta</h2>
          <p>Precios, estadía mínima, aperturas, cierres y restricciones por unidad.</p>
        </div>
        <div>
          <PushNotificationButton businessId={businessId} />
          <button type="button" onClick={() => setPeriodForm(emptyPeriod(range.from, range.to))}>
            <FaCalendarDays /> Cargar precios por fechas
          </button>
        </div>
      </header>

      <form className="tags_guest_rates_filters" onSubmit={applyRange}>
        <label>
          Desde
          <input
            type="date"
            value={draft.from}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            min={draft.from ? plusDays(draft.from, 1) : undefined}
            value={draft.to}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </label>
        <label className="tags_guest_rates_occupants">
          <span>Precio para</span>
          <input
            type="number"
            min="1"
            max="30"
            value={draft.occupants}
            onChange={(event) => setDraft({ ...draft, occupants: event.target.value })}
          />
          <span>huéspedes</span>
        </label>
        <button type="submit">Ver calendario</button>
      </form>

      <div className="tags_guest_rates_table_wrap">
        <table>
          <thead>
            <tr className="tags_guest_rates_months">
              <th rowSpan="2">Unidad</th>
              {months.map((month, index) => (
                <th key={month.key} colSpan={month.count} className={`is_month_tone_${index % 2}`}>{month.label}</th>
              ))}
            </tr>
            <tr className="tags_guest_rates_days">
              {visibleDates.map((date) => {
                const day = new Date(`${date}T12:00:00`);
                return (
                  <th key={date}>
                    <span>{day.toLocaleDateString("es-AR", { weekday: "short" })}</span>
                    <strong>{day.getDate()}</strong>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {calendar?.units?.map((unit) => (
              <tr key={unit.id}>
                <th>
                  <strong>{unit.name}</strong>
                  {unit.code && String(unit.code).trim().toLocaleLowerCase("es") !== String(unit.name).trim().toLocaleLowerCase("es") && <small>{unit.code}</small>}
                </th>
                {unit.cells.map((cell) => {
                  const sellable = cell.inventory.status === "free" && cell.price && cell.restriction?.isOpen !== false;
                  return (
                    <td key={cell.date}>
                      <button
                        type="button"
                        className={`${sellable ? "is_sellable" : "is_unavailable"} is_${cell.inventory.status}`}
                        onClick={() => openCell(unit, cell)}
                        title="Editar precios y restricciones"
                      >
                        <strong>{cell.price ? money(cell.price.nightlyRate, cell.price.currency) : "Sin tarifa"}</strong>
                        <span>
                          {cell.inventory.status === "occupied"
                            ? cell.inventory.code
                            : cell.inventory.status === "held"
                              ? "Retenida"
                              : cell.inventory.status === "blocked"
                                ? "Bloqueada"
                                : cell.restriction?.isOpen === false
                                  ? "Cerrada"
                                  : cell.price
                                    ? `Mín. ${cell.restriction?.minimumNights || 1} n.`
                                    : "No disponible"}
                        </span>
                        {cell.restriction?.closedToArrival && <i>Sin ingreso</i>}
                        {cell.restriction?.closedToDeparture && <i>Sin salida</i>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {periodForm && (
        <PeriodEditor
          form={periodForm}
          setForm={setPeriodForm}
          units={units}
          busy={busy}
          onClose={() => setPeriodForm(null)}
          onToggleUnit={togglePeriodUnit}
          onSave={savePeriod}
        />
      )}

      {cellForm && (
        <CellEditor
          form={cellForm}
          setForm={setCellForm}
          busy={busy}
          onClose={() => setCellForm(null)}
          onSave={(event) => savePeriod(event, cellForm)}
        />
      )}
      {busy && <TagsSpinner size={105} logoSize={55} borderSize={5} background="rgba(255,255,255,.72)" />}
    </section>
  );
}

function PriceMatrix({ unitRate, update }) {
  return (
    <section>
      <header><strong>{unitRate.unitName}</strong><span>Capacidad: {unitRate.capacity}</span></header>
      <div>
        {unitRate.prices.map((price) => (
          <label key={price.occupants}>
            <span>{price.occupants} huésped{price.occupants === 1 ? "" : "es"}</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={price.nightlyRate}
              onChange={(event) => update(price.occupants, event.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function RestrictionFields({ form, setForm }) {
  return (
    <div className="grid">
      <label>Mínimo de noches<input type="number" min="1" value={form.minimumNights} onChange={(event) => setForm({ ...form, minimumNights: event.target.value })} /></label>
      <label>Máximo de noches<input type="number" min="1" value={form.maximumNights} onChange={(event) => setForm({ ...form, maximumNights: event.target.value })} /></label>
      <label className="check"><input type="checkbox" checked={form.isOpen} onChange={(event) => setForm({ ...form, isOpen: event.target.checked })} />Venta abierta</label>
      <label className="check"><input type="checkbox" checked={form.closedToArrival} onChange={(event) => setForm({ ...form, closedToArrival: event.target.checked })} />Cerrar llegadas</label>
      <label className="check"><input type="checkbox" checked={form.closedToDeparture} onChange={(event) => setForm({ ...form, closedToDeparture: event.target.checked })} />Cerrar salidas</label>
      <label className="check"><input type="checkbox" checked={form.requiresManualReview} onChange={(event) => setForm({ ...form, requiresManualReview: event.target.checked })} />Revisión manual</label>
    </div>
  );
}

function PeriodEditor({ form, setForm, units, busy, onClose, onToggleUnit, onSave }) {
  return (
    <div className="tags_guest_rates_backdrop" onMouseDown={() => !busy && onClose()}>
      <form className="tags_guest_rates_modal is_period" onSubmit={onSave} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="close" onClick={onClose}><FaXmark /></button>
        <span>PRECIOS Y DISPONIBILIDAD</span>
        <h3>1. Seleccioná las fechas</h3>
        <div className="grid">
          <label>Desde<input required type="date" value={form.startsOn} onChange={(event) => setForm({ ...form, startsOn: event.target.value })} /></label>
          <label>Hasta<input required type="date" min={form.startsOn} value={form.endsOn} onChange={(event) => setForm({ ...form, endsOn: event.target.value })} /></label>
        </div>
        <h3>2. Seleccioná las unidades</h3>
        <fieldset className="tags_guest_period_units">
          {units.map((unit) => {
            const selected = form.unitRates.some((item) => Number(item.unitId) === Number(unit.id));
            const capacity = Math.max(1, Number(unit.capacity_adults || 0) + Number(unit.capacity_children || 0));
            return <label key={unit.id}><input type="checkbox" checked={selected} onChange={(event) => onToggleUnit(unit, event.target.checked)} /><span>{unit.name}</span><small>Hasta {capacity} huéspedes</small></label>;
          })}
        </fieldset>
        {form.unitRates.length > 0 && (
          <>
            <h3>3. Precio por unidad y cantidad de huéspedes</h3>
            <div className="tags_guest_period_prices">
              {form.unitRates.map((unitRate) => (
                <PriceMatrix
                  key={unitRate.unitId}
                  unitRate={unitRate}
                  update={(occupants, nightlyRate) => setForm((current) => ({
                    ...current,
                    unitRates: current.unitRates.map((candidate) => Number(candidate.unitId) === Number(unitRate.unitId)
                      ? { ...candidate, prices: candidate.prices.map((price) => price.occupants === occupants ? { ...price, nightlyRate } : price) }
                      : candidate),
                  }))}
                />
              ))}
            </div>
            <h3>4. Restricciones opcionales para esas fechas</h3>
            <RestrictionFields form={form} setForm={setForm} />
          </>
        )}
        <button className="save" disabled={busy || !form.unitRates.length}>Guardar precios y restricciones</button>
      </form>
    </div>
  );
}

function CellEditor({ form, setForm, busy, onClose, onSave }) {
  const unitRate = form.unitRates[0];
  return (
    <div className="tags_guest_rates_backdrop" onMouseDown={() => !busy && onClose()}>
      <form className="tags_guest_rates_modal is_period" onSubmit={onSave} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="close" onClick={onClose}><FaXmark /></button>
        <span>EDICIÓN DE FECHA</span>
        <h3>{unitRate.unitName} · {form.startsOn}</h3>
        <p>Definí el precio para todas las cantidades posibles de huéspedes y las restricciones de esta fecha.</p>
        <div className="tags_guest_period_prices">
          <PriceMatrix
            unitRate={unitRate}
            update={(occupants, nightlyRate) => setForm({
              ...form,
              unitRates: [{
                ...unitRate,
                prices: unitRate.prices.map((price) => price.occupants === occupants ? { ...price, nightlyRate } : price),
              }],
            })}
          />
        </div>
        <h3>Restricciones de la fecha</h3>
        <RestrictionFields form={form} setForm={setForm} />
        <button className="save" disabled={busy}>Guardar fecha</button>
      </form>
    </div>
  );
}
