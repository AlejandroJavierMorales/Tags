"use client";

import { useState } from "react";
import { FaBars, FaXmark } from "react-icons/fa6";
import "./DirectoryNavigationMenu.css";

export default function DirectoryNavigationMenu({ sections = [], direction = "right" }) {
  const [open,setOpen]=useState(false);
  const items=sections.filter(section=>Number(section.is_visible)).map(section=>({id:section.id,label:section.title||"Sección"}));
  if(!items.length)return null;
  const close=()=>setOpen(false);
  return <nav className="tags_directory_navigation" aria-label="Navegación de la Web">
    <div className="tags_directory_navigation_desktop">{items.map(item=><a href={`#directory-section-${item.id}`} key={item.id}>{item.label}</a>)}</div>
    <button type="button" className="tags_directory_navigation_toggle" onClick={()=>setOpen(true)} aria-expanded={open} aria-label="Abrir menú"><FaBars /></button>
    {open&&<div className="tags_directory_navigation_overlay" onClick={close}><div className={`tags_directory_navigation_drawer from_${["top","bottom","left","right"].includes(direction)?direction:"right"}`} onClick={event=>event.stopPropagation()}><header><strong>Menú</strong><button type="button" onClick={close} aria-label="Cerrar menú"><FaXmark /></button></header><div>{items.map(item=><a href={`#directory-section-${item.id}`} key={item.id} onClick={close}>{item.label}</a>)}</div></div></div>}
  </nav>;
}
