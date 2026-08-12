"use client";

import "./BusinessLocationFields.css";

const TYPE_ALIASES = {
  country: ["country"],
  province: ["province", "state"],
  region: ["region"],
  locality: ["locality", "city"]
};

const byName = (a, b) => String(a.name).localeCompare(String(b.name), "es");

export default function BusinessLocationFields({ values, onChange, places = [] }) {
  const update = (field, value) => onChange(current => ({ ...current, [field]: value }));
  const countries = places.filter(place => TYPE_ALIASES.country.includes(place.place_type)).sort(byName);
  const provinces = places.filter(place => TYPE_ALIASES.province.includes(place.place_type) && Number(place.parent_id) === Number(values.country_place_id)).sort(byName);
  const regions = places.filter(place => TYPE_ALIASES.region.includes(place.place_type) && Number(place.parent_id) === Number(values.province_place_id)).sort(byName);
  const localities = places.filter(place => TYPE_ALIASES.locality.includes(place.place_type) && Number(place.parent_id) === Number(values.region_place_id || values.province_place_id)).sort(byName);

  function changeCountry(value) {
    onChange(current => ({ ...current, country_place_id: value, province_place_id: "", region_place_id: "", primary_place_id: "" }));
  }

  function changeProvince(value) {
    onChange(current => ({ ...current, province_place_id: value, region_place_id: "", primary_place_id: "" }));
  }

  function changeRegion(value) {
    onChange(current => ({ ...current, region_place_id: value, primary_place_id: "" }));
  }

  return (
    <section className="business-location-fields" aria-labelledby="business-location-title">
      <div className="business-location-fields__heading">
        <h3 id="business-location-title">Ubicación del negocio</h3>
        <p>Estos datos se comparten con Directorio y los demás módulos del cliente.</p>
      </div>
      <div className="business-location-fields__grid">
        <label>País<select value={values.country_place_id || ""} onChange={event => changeCountry(event.target.value)}><option value="">Seleccionar país</option>{countries.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <label>Provincia<select value={values.province_place_id || ""} onChange={event => changeProvince(event.target.value)} disabled={!values.country_place_id}><option value="">Seleccionar provincia</option>{provinces.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <label>Región<select value={values.region_place_id || ""} onChange={event => changeRegion(event.target.value)} disabled={!values.province_place_id}><option value="">Seleccionar región</option>{regions.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <label>Localidad<select value={values.primary_place_id || ""} onChange={event => update("primary_place_id", event.target.value)} disabled={!values.region_place_id && !values.province_place_id}><option value="">Seleccionar localidad</option>{localities.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <label className="business-location-fields__wide">Calle, número y referencia<input value={values.address || ""} onChange={event => update("address", event.target.value)} placeholder="Ej.: Av. San Martín 1250" /></label>
        <label>Código postal<input value={values.postal_code || ""} onChange={event => update("postal_code", event.target.value)} /></label>
        <label>Latitud<input type="number" step="any" value={values.latitude ?? ""} onChange={event => update("latitude", event.target.value)} placeholder="-31.9052179" /></label>
        <label>Longitud<input type="number" step="any" value={values.longitude ?? ""} onChange={event => update("longitude", event.target.value)} placeholder="-64.5758841" /></label>
      </div>
    </section>
  );
}
