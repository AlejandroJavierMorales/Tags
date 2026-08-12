"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa6";
import "./GuestExperienceAdminNavigation.css";

export default function GuestExperienceAdminNavigation({ groups, active, onChange }) {
    const [open, setOpen] = useState(false), root = useRef(null);
    const normalizedGroups = useMemo(() => groups.flatMap(group => {
        if (group.key !== "guest_services") return [group];
        const items = group.items;
        const commerce = items.find(item => item.key === "commerce");
        const storeOrders = items.find(item => item.key === "store_orders");
        const restoOrders = items.find(item => item.key === "resto_orders");
        const others = items.filter(item => !["commerce", "store_orders", "resto_orders"].includes(item.key));
        return [{ key: "store_services", label: "Tienda", icon: commerce?.icon || group.icon, items: [{ ...(commerce || {}), label: "Configuración" }, storeOrders].filter(Boolean) }, { key: "resto_services", label: "Gastronomía", icon: restoOrders?.icon || group.icon, items: [{ ...(commerce || {}), key: "commerce_resto", label: "Configuración" }, restoOrders].filter(Boolean) }, { ...group, items: others }];
    }), [groups]);
    const activeGroup = normalizedGroups.find(group => group.items.some(item => item.key === active)) || normalizedGroups[0];
    const activeItem = activeGroup.items.find(item => item.key === active) || activeGroup.items[0], ActiveIcon = activeItem.icon;
    useEffect(() => { function close(event) { if (root.current && !root.current.contains(event.target)) setOpen(false); } document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
    function choose(key) { onChange(key); setOpen(false); }
    return <div className="tags_guest_admin_navigation" ref={root}><div className="tags_guest_admin_navigation_desktop"><nav className="tags_guest_admin_navigation_groups">{normalizedGroups.map(group => { const Icon = group.icon; return <button key={group.key} className={group.key === activeGroup.key ? "is_active" : ""} onClick={() => onChange(group.items[0].key)}><Icon /><span>{group.label}</span></button>; })}</nav><nav className="tags_guest_admin_navigation_subitems">{activeGroup.items.map(item => { const Icon = item.icon; return <button key={item.key} className={item.key === active ? "is_active" : ""} onClick={() => onChange(item.key)}><Icon /><span>{item.label}</span></button>; })}</nav></div><div className="tags_guest_admin_navigation_compact"><span>NAVEGACIÓN DEL MÓDULO</span><button className="tags_guest_admin_navigation_trigger" type="button" aria-expanded={open} onClick={() => setOpen(!open)}><i><ActiveIcon /></i><span><small>{activeGroup.label}</small><strong>{activeItem.label}</strong></span><FaChevronDown className={open ? "is_open" : ""} /></button>{open && <div className="tags_guest_admin_navigation_menu">{normalizedGroups.map(group => { const GroupIcon = group.icon; return <section key={group.key}><header><GroupIcon /><span>{group.label}</span></header>{group.items.map(item => { const Icon = item.icon; return <button type="button" key={item.key} className={item.key === active ? "is_active" : ""} onClick={() => choose(item.key)}><i><Icon /></i><span>{item.label}</span>{item.key === active && <b>Actual</b>}</button>; })}</section>; })}</div>}</div></div>;
}
