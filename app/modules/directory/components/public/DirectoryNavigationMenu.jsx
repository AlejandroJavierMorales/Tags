"use client";

import { useState } from "react";
import { FaBars, FaCalendarCheck, FaXmark } from "react-icons/fa6";
import "./DirectoryNavigationMenu.css";

export default function DirectoryNavigationMenu({ sections = [], direction = "right", links = [] }) {
  const [open,setOpen]=useState(false);
  const items=[...sections.filter(section=>Number(section.is_visible)).map(section=>({id:section.id,label:section.title||"Sección",href:`#directory-section-${section.id}`})),...links.filter(item=>item?.href&&item?.label).map((item,index)=>({id:`link-${index}-${item.href}`,label:item.label,href:item.href,featured:Boolean(item.featured)}))];
  if(!items.length)return null;
  const close=()=>setOpen(false);
  return <nav className="tags_directory_navigation" aria-label="Navegación de la Web">
    <div className="tags_directory_navigation_desktop">{items.map(item=><a className={item.featured?"is_featured":""} href={item.href} key={item.id}>{item.featured&&<FaCalendarCheck />}{item.label}</a>)}</div>
    <button type="button" className="tags_directory_navigation_toggle" onClick={()=>setOpen(true)} aria-expanded={open} aria-label="Abrir menú"><FaBars /></button>
    {open&&<div className="tags_directory_navigation_overlay" onClick={close}><div className={`tags_directory_navigation_drawer from_${["top","bottom","left","right"].includes(direction)?direction:"right"}`} onClick={event=>event.stopPropagation()}><header><strong>Menú</strong><button type="button" onClick={close} aria-label="Cerrar menú"><FaXmark /></button></header><div>{items.map(item=><a className={item.featured?"is_featured":""} href={item.href} key={item.id} onClick={close}>{item.featured&&<FaCalendarCheck />}{item.label}</a>)}</div></div></div>}
  </nav>;
}
