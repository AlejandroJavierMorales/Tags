"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function TagsHeader() {
  const [open, setOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const navRef = useRef(null);
  const dropdownRef = useRef(null);

  const pathname = usePathname();

  useEffect(() => {

    function handleClickOutside(event) {

      // CERRAR HAMBURGER
      if (
        navRef.current &&
        !navRef.current.contains(event.target)
      ) {
        setOpen(false);
      }

      // CERRAR DROPDOWN ADMIN
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setAdminOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };

  }, []);

  const isActive = (path) => pathname === path;

  const Item = ({ href, label }) => (
    <Link
      href={href}
      className={`nav_item ${isActive(href) ? "active" : ""}`}
      onClick={() => {
        setOpen(false);
        setAdminOpen(false);
      }}
    >
      {label}
    </Link>
  );

  return (
    <header className="tags_header_bar m-0 p-1">

      {/* LOGO */}
      <div className="tags_logo">
        <Link href="/dashboard">
          <Image src="/logo_tags.webp" alt="Logo" width={90} height={70} />
        </Link>

      </div>
      <div className="text-center">
        <span className="ms-3 tags_subtitle d-flex justify-content-center" style={{ fontWeight: "500" }}>Gestión y Reporting de Códigos QR</span>
      </div>

      {/* NAV */}
      <nav ref={navRef} className={`tags_nav ${open ? "open" : ""} pe-2`}>

        <Item href="/dashboard" label="Dashboard" />
        <Item href="/dashboard/businesses" label="Clientes" />

        {/* ADMIN DROPDOWN */}
        <div className="nav_dropdown">

          <span
            className="nav_item"
            onClick={() => setAdminOpen(!adminOpen)}
          >
            Administración ▾
          </span>

          {adminOpen && (
            <div className="dropdown_menu">

              <Item href="/dashboard/create" label="Crear QR" />

              {/* SEPARADOR */}
              <div className="dropdown_divider" />

              <Item href="/dashboard/qr-types" label="Tipos QR" />
              <Item href="/supports" label="Prod. Materia Prima" />
              <Item href="/products" label="Productos" />

              {/* SEPARADOR */}
              <div className="dropdown_divider" />

              <Item href="/admin/stock" label="Stock" />
              <Item href="/admin/production" label="Producción" />

            </div>
          )}

        </div>

      </nav>

      {/* HAMBURGER */}
      <button
        className="tags_hamburger me-3"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>

    </header>
  );
}