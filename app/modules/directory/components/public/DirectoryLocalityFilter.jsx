"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FaLocationDot } from "react-icons/fa6";

export default function DirectoryLocalityFilter({ localities, query, categoryId, localityId }) {
  const router = useRouter();
  const [selected, setSelected] = useState(String(localityId || ""));
  const [pending, startTransition] = useTransition();
  useEffect(() => setSelected(String(localityId || "")), [localityId]);

  function submit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (categoryId) params.set("categoria", String(categoryId));
    if (selected) params.set("localidad", selected);
    const suffix = params.toString();
    startTransition(() => router.push(`${suffix ? `/directorio?${suffix}` : "/directorio"}#resultados`, { scroll: false }));
  }

  return <form onSubmit={submit} className="tags_directory_locality_filter">
    <FaLocationDot aria-hidden="true" />
    <select value={selected} onChange={event => setSelected(event.target.value)} aria-label="Filtrar por localidad">
      <option value="">Todas las localidades</option>
      {localities.map(locality => <option value={locality.id} key={locality.id}>{locality.name} ({locality.listing_count})</option>)}
    </select>
    <button type="submit" disabled={pending}>{pending ? "Aplicando..." : "Aplicar"}</button>
  </form>;
}
