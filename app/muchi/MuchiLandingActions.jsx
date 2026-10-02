"use client";

import { useState } from "react";
import { FaHouse, FaMapLocationDot, FaStore, FaSuitcaseRolling } from "react-icons/fa6";

const suggestions = {
  tourist:["Armame un día de paseo en familia","Busco dónde alojarme","¿Dónde podemos comer hoy?","Quiero conocer ríos y paseos"],
  resident:["Necesito encontrar un comercio","Busco un profesional o servicio","¿Dónde consigo un producto?","¿Qué hay para hacer este fin de semana?"]
};

function openMuchi(prompt = "",mode="tourist") {
  window.dispatchEvent(new CustomEvent("tags:destination-assistant:open", { detail: { prompt,mode } }));
}

export default function MuchiLandingActions() {
  const [mode,setMode]=useState("tourist");
  function selectMode(nextMode) {
    setMode(nextMode);
    window.dispatchEvent(new CustomEvent("tags:destination-assistant:mode", { detail: { mode: nextMode } }));
  }
  return <div className="tags_muchi_actions">
    <div className="tags_muchi_mode_picker" aria-label="Elegí tu contexto"><button type="button" data-active={mode==="tourist"} onClick={()=>selectMode("tourist")}><FaSuitcaseRolling/><span><b>Estoy de visita</b><small>Viaje, paseos, alojamiento y experiencias</small></span></button><button type="button" data-active={mode==="resident"} onClick={()=>selectMode("resident")}><FaHouse/><span><b>Vivo acá</b><small>Comercios, productos y servicios cotidianos</small></span></button></div>
    <button type="button" className="tags_muchi_primary_action" onClick={() => openMuchi("",mode)}>Iniciar conversación con Muchi</button>
    <div className="tags_muchi_suggestions" aria-label="Consultas sugeridas">
      {suggestions[mode].map(prompt => <button type="button" key={prompt} onClick={() => openMuchi(prompt,mode)}>{prompt}</button>)}
    </div>
    <div className="tags_muchi_action_notes"><span><FaMapLocationDot/> Ordena por cercanía si compartís tu ubicación</span><span><FaStore/> Busca en fichas, productos, platos, servicios y contenido turístico</span></div>
  </div>;
}
