'use client'

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function HeaderBusinesses() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params?.id || searchParams.get("business_id");

  const closeMenu = () => setOpen(false);

  const isActive = (path) => pathname === path;

  const Item = ({ href, label }) => (
    <Link
      href={href}
      onClick={closeMenu}
      className={`nav_item ${isActive(href) ? "active" : ""}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="tags_header_bar d-flex align-items-center m-0 p-1 pe-3">

      <div className="tags_logo">
        <Link href="/dashboard" onClick={closeMenu}>
          <Image
            src="/logo_tags.webp"
            alt="Logo"
            width={98}
            height={80}
          />
        </Link>
      </div>

      <div className="w-100 text-center">
        <h1 className="tags_header_title">
          Gestión y Reporting de Códigos QR
        </h1>
      </div>

      <button
        className="tags_hamburger"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>

      <nav className={`tags_nav ${open ? "open" : ""}`}>

        {/* 🔥 solo mostrar si hay id */}
        {id && (
          <>
            <Item
              href={`/dashboard/businesses/${id}`}
              label="Dashboard"
            />
            <Item
              href={`/dashboard/businesses/stats?business_id=${id}`}
              label="Estadísticas"
            />
          </>
        )}

      </nav>

      {open && <div className="tags_overlay" onClick={closeMenu} />}

    </header>
  );
}