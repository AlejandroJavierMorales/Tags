"use client";

import { useEffect, useState } from "react";
import { FaCirclePlay, FaVideo } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import "./BusinessTutorialLibrary.css";

export default function BusinessTutorialLibrary({ businessId, businessName }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activeGroupId, setActiveGroupId] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/business/tutorials?businessId=${businessId}`, { cache: "no-store" })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los tutoriales");
        if (active) setData(payload);
      })
      .catch(reason => {
        if (active) setError(reason.message);
      });
    return () => { active = false; };
  }, [businessId]);

  const groups = data?.groups || [];
  const selectedGroup = groups.find(group => String(group.id) === String(activeGroupId)) || groups[0] || null;

  useEffect(() => {
    const loadedGroups = data?.groups || [];
    if (loadedGroups.length && !loadedGroups.some(group => String(group.id) === String(activeGroupId))) {
      setActiveGroupId(String(loadedGroups[0].id));
    }
  }, [data, activeGroupId]);

  if (!data && !error) return <main className="tags_business_tutorials loading"><TagsSpinner /></main>;

  return <main className="tags_business_tutorials">
    <header>
      <span>AYUDA Y CAPACITACIÓN</span>
      <h1><FaVideo />Tutoriales</h1>
      <p>{businessName}: aprendé a configurar y aprovechar las herramientas de la plataforma.</p>
    </header>

    {error && <section className="empty">{error}</section>}

    {groups.length > 0 && <nav className="tags_business_tutorial_navigation" aria-label="Grupos de tutoriales">
      <div className="tags_business_tutorial_tabs" role="tablist">
        {groups.map(group => <button
          type="button"
          role="tab"
          aria-selected={String(group.id) === String(selectedGroup?.id)}
          className={String(group.id) === String(selectedGroup?.id) ? "is_active" : ""}
          onClick={() => setActiveGroupId(String(group.id))}
          key={group.id}
        >
          <span>{group.name}</span>
          <b>{group.videos.length}</b>
        </button>)}
      </div>
      <label className="tags_business_tutorial_select">
        <span>Grupo de tutoriales</span>
        <select value={String(selectedGroup?.id || "")} onChange={event => setActiveGroupId(event.target.value)}>
          {groups.map(group => <option value={group.id} key={group.id}>{group.name} ({group.videos.length})</option>)}
        </select>
      </label>
    </nav>}

    {selectedGroup && <section className="tags_business_tutorial_group" role="tabpanel" key={selectedGroup.id}>
      <header><div><small>{selectedGroup.productCode === "general" ? "PLATAFORMA" : selectedGroup.productCode.replaceAll("_", " ").toUpperCase()}</small><h2>{selectedGroup.name}</h2>{selectedGroup.description && <p>{selectedGroup.description}</p>}</div><b>{selectedGroup.videos.length} video{selectedGroup.videos.length === 1 ? "" : "s"}</b></header>
      <div>{selectedGroup.videos.map(video => <article key={video.id}><div className="media"><video src={video.videoUrl} controls preload="metadata" playsInline /></div><div><span><FaCirclePlay />TUTORIAL</span><h3>{video.title}</h3>{video.description && <p>{video.description}</p>}</div></article>)}</div>
    </section>}

    {data && !groups.length && <section className="empty">Todavía no hay tutoriales publicados.</section>}
  </main>;
}
