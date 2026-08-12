"use client";

import { FaArrowUp, FaWhatsapp } from "react-icons/fa6";
import { directoryWhatsappUrl } from "../../lib/directoryPublicFormatting";
import "./DirectoryFloatingActions.css";

export default function DirectoryFloatingActions({ whatsapp, showWhatsapp = true, showBackToTop = true }) {
  const whatsappUrl = directoryWhatsappUrl(whatsapp, "Hola, quiero hacer una consulta.");
  return <div className="tags_directory_floating_actions">{showBackToTop&&<button type="button" className="back" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="Volver arriba"><FaArrowUp /></button>}{showWhatsapp&&whatsappUrl&&<a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Consultar por WhatsApp"><FaWhatsapp /></a>}</div>;
}
