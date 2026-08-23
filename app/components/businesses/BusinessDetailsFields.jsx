"use client";

import MediaUploader from "@/app/components/MediaUploader";
import BusinessLocationFields from "@/app/components/businesses/BusinessLocationFields";

export const EMPTY_BUSINESS_DETAILS = {
  display_name: "", description: "", logo_url: "", cover_url: "", whatsapp: "", address: "",
  postal_code: "", latitude: "", longitude: "", primary_place_id: "", country_place_id: "", province_place_id: "", region_place_id: "",
  website_url: "", instagram_url: "", facebook_url: "", tiktok_url: "", youtube_url: "", linkedin_url: "", google_reviews_url: "", maps_url: ""
};

export default function BusinessDetailsFields({ values, onChange, businessId = null, places = [] }) {
  const update = (field, value) => onChange(current => ({ ...current, [field]: value }));
  const fields = [
    ["display_name", "Nombre visible"], ["whatsapp", "WhatsApp"], ["website_url", "Sitio web"],
    ["instagram_url", "Instagram"], ["facebook_url", "Facebook"], ["tiktok_url", "TikTok"],
    ["youtube_url", "YouTube"], ["linkedin_url", "LinkedIn"], ["google_reviews_url", "Google Reviews"], ["maps_url", "Google Maps"]
  ];
  return <>
    <label className="is_wide">Descripción<textarea value={values.description || ""} onChange={event => update("description", event.target.value)} /></label>
    {businessId ? <>
      <div className="is_wide"><span>Logo</span><MediaUploader businessId={businessId} value={values.logo_url} module="directory" variant="logo" entityId={businessId} accept="image/*" label="Cargar logo" onChange={media => update("logo_url", media?.url || "")} /></div>
      <div className="is_wide"><span>Portada</span><MediaUploader businessId={businessId} value={values.cover_url} module="directory" variant="hero" entityId={businessId} accept="image/*" label="Cargar portada" onChange={media => update("cover_url", media?.url || "")} /></div>
    </> : <p className="is_wide">El logo y la portada se cargan después de crear el cliente.</p>}
    <div className="is_wide"><BusinessLocationFields values={values} onChange={onChange} places={places} /></div>
    {fields.map(([field, label]) => <label key={field}>{label}<input value={values[field] || ""} onChange={event => update(field, event.target.value)} /></label>)}
  </>;
}
