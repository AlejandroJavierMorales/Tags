"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function TagsHeader() {
  const [open, setOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(null);
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

        {/* ===================================== */}
        {/* PRINCIPAL */}
        {/* ===================================== */}

        <Item
          href="/dashboard"
          label="Panel Admin"
        />

        {/* ===================================== */}
        {/* COMERCIAL */}
        {/* ===================================== */}

        <div className="nav_dropdown">

          <span
            className="nav_item"
            onClick={() =>
              setAdminOpen(
                adminOpen === "sales"
                  ? false
                  : "sales"
              )
            }
          >
            Ventas ▾
          </span>

          {adminOpen === "sales" && (

            <div className="dropdown_menu">

              <Item
                href="/dashboard/businesses"
                label="Clientes"
              />

              <div className="dropdown_divider" />

              <Item
                href="/admin/sales"
                label="Ventas"
              />

              <Item
                href="/admin/backorders"
                label="Órdenes Pendientes"
              />

            </div>
          )}

        </div>

        {/* ===================================== */}
        {/* OPERACIONES */}
        {/* ===================================== */}

        <div className="nav_dropdown">

          <span
            className="nav_item"
            onClick={() =>
              setAdminOpen(
                adminOpen === "ops"
                  ? false
                  : "ops"
              )
            }
          >
            Inventario ▾
          </span>

          {adminOpen === "ops" && (

            <div className="dropdown_menu">

              <Item
                href="/admin/stock"
                label="Stock"
              />

              <Item
                href="/admin/production"
                label="Producción"
              />

            </div>
          )}

        </div>

        {/* ===================================== */}
        {/* CATÁLOGO */}
        {/* ===================================== */}

        <div className="nav_dropdown">

          <span
            className="nav_item"
            onClick={() =>
              setAdminOpen(
                adminOpen === "catalog"
                  ? false
                  : "catalog"
              )
            }
          >
            Catálogo ▾
          </span>

          {adminOpen === "catalog" && (

            <div className="dropdown_menu">

              <Item
                href="/products"
                label="Productos"
              />

              <Item
                href="/supports"
                label="Prod. Materia Prima"
              />

              <Item
                href="/dashboard/qr-types"
                label="Tipos de QR"
              />

            </div>
          )}

        </div>

        {/* ===================================== */}
        {/* QR */}
        {/* ===================================== */}

        <div className="nav_dropdown">

          <span
            className="nav_item"
            onClick={() =>
              setAdminOpen(
                adminOpen === "qr"
                  ? false
                  : "qr"
              )
            }
          >
            QR ▾
          </span>

          {adminOpen === "qr" && (

            <div className="dropdown_menu">

              <Item
                href="/dashboard/create"
                label="Crear QR"
              />

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