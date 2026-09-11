"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "./page.css";

function branding(domain, appCode) {
  const value = String(domain || "").toLowerCase();
  if (appCode === "calamuchitar" || value.includes("calamuchita")) return { name: "CalamuchitAr", logo: "/directory/calamuchitar/footer/logo_calamuchitar_redondo_200x200.png" };
  if (value.includes("tags")) return { name: "Tags", logo: "/logo_tags_qr.webp" };
  return { name: domain || "Sin dominio", logo: "/logo_tags_qr.webp" };
}

export default function PwaInstallationsClient() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/pwa-installations?app_code=calamuchitar", { cache: "no-store" })
      .then(response => response.json().then(body => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok || !body.success) throw new Error(body.error || "No se pudieron cargar las instalaciones");
        setData(body);
      })
      .catch(err => setError(err.message));
  }, []);

  return <main className="tags_pwa_installations_page">
    <div className="tags_pwa_installations_heading">
      <div><span>MONITOREO DE APLICACIONES</span><h1>Instalaciones</h1><p>Seguimiento de instalaciones de las aplicaciones de Tags por dominio.</p></div>
      <Link href="/dashboard">Volver al Panel</Link>
    </div>
    {error && <div className="tags_pwa_installations_error">{error}</div>}
    {!data && !error && <div className="tags_pwa_installations_loading">Cargando instalaciones…</div>}
    {data && <>
      <section className="tags_pwa_installations_kpis">
        <article><strong>{data.summary?.total_installations || 0}</strong><span>Registros totales</span></article>
        <article><strong>{data.domains?.reduce((total, item) => total + Number(item.installed || 0), 0) || 0}</strong><span>Instaladas</span></article>
        <article><strong>{data.domains?.reduce((total, item) => total + Number(item.cancelled || 0), 0) || 0}</strong><span>Canceladas</span></article>
      </section>
      <section className="tags_pwa_installations_grid">
        {(data.domains || []).map(item => { const brand = branding(item.domain, data.app_code); return <article className="tags_pwa_domain_card" key={item.domain}>
          <div className="tags_pwa_domain_identity"><Image src={brand.logo} alt="" width={54} height={54} /><div><strong>{brand.name}</strong><small>{item.domain}</small></div></div>
          <div className="tags_pwa_domain_stats"><div><b>{item.installed || 0}</b><span>Instaladas</span></div><div><b>{item.cancelled || 0}</b><span>Canceladas</span></div><div><b>{item.attempts || 0}</b><span>Intentos</span></div></div>
          <small className="tags_pwa_domain_last">Última actividad: {item.last_activity ? new Date(item.last_activity).toLocaleString("es-AR") : "-"}</small>
        </article>; })}
      </section>
    </>}
  </main>;
}
