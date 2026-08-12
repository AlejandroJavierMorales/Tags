"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FaMagnifyingGlass } from "react-icons/fa6";
import "./DirectorySearchForm.css";

export default function DirectorySearchForm({ initialQuery = "", variant = "hero" }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  useEffect(() => setQuery(initialQuery), [initialQuery]);

  function submit(event) {
    event.preventDefault();
    const value = query.trim();
    const target = value ? `/directorio?q=${encodeURIComponent(value)}#resultados` : "/directorio";
    startTransition(() => router.push(target, { scroll: false }));
  }

  return <form onSubmit={submit} className={variant === "compact" ? "tags_directory_compact_search_form" : "tags_directory_hero_search"}>
    <FaMagnifyingGlass aria-hidden="true" />
    <input value={query} onChange={event => setQuery(event.target.value)} placeholder={variant === "compact" ? "Buscar comercios, productos o servicios" : "¿Qué necesitás encontrar?"} aria-label="Buscar comercios, productos o servicios" />
    <button type="submit" disabled={pending}>{pending ? "Buscando..." : "Buscar"}</button>
  </form>;
}
