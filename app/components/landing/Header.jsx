"use client";

import "../../styles/tags_landing.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Header() {

    const router = useRouter();

    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    const [clientOpen, setClientOpen] = useState(false);

    const desktopDropdownRef = useRef(null);
    const mobileDropdownRef = useRef(null);

    // SCROLL
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);

        window.addEventListener("scroll", onScroll);

        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // CLOSE OUTSIDE
    useEffect(() => {

        const handleClick = (e) => {

            const desktopInside =
                desktopDropdownRef.current &&
                desktopDropdownRef.current.contains(e.target);

            const mobileInside =
                mobileDropdownRef.current &&
                mobileDropdownRef.current.contains(e.target);

            if (!desktopInside && !mobileInside) {
                setClientOpen(false);
            }
        };

        document.addEventListener("click", handleClick);

        return () => {
            document.removeEventListener("click", handleClick);
        };

    }, []);

    const ClientMenu = ({ onClose }) => (
        <div className="tags_clients_menu">

            <Link
                href="/login"
                onClick={onClose}
            >
                👤 Ingresar
            </Link>

            <Link
                href="/logout"
                onClick={onClose}
            >
                🔄 Cambiar cuenta
            </Link>

        </div>
    );

    return (
        <nav
            className={`fixed-top tags_landing_nav ${scrolled ? "tags_landing_nav_scrolled" : ""}`}
        >

            <div className="container tags_landing_nav_inner">

                {/* LOGO */}
                <Link href="/tags">
                    <Image
                        src="/logo_tags_transparente.webp"
                        alt="Logo"
                        width={90}
                        height={75}
                    />
                </Link>

                {/* DESKTOP */}
                <ul className="d-none d-lg-flex list-unstyled m-0 gap-3 align-items-center">

                    <li>
                        <a href="/">Inicio</a>
                    </li>

                    <li>
                        <a href="/store-products">Productos</a>
                    </li>

                    <li>
                        <a href="/demo">Demo</a>
                    </li>

                    <li>
                        <a href="/contact">Contacto</a>
                    </li>

                    {/* CLIENTES DESKTOP */}
                    <li
                        ref={desktopDropdownRef}
                        className="position-relative"
                    >

                        <button
                            type="button"
                            className="tags_clients_btn"
                            onClick={() => setClientOpen((v) => !v)}
                        >
                            <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M8 1a2 2 0 0 0-2 2v3H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H10V3a2 2 0 0 0-2-2zm1 5H7V3a1 1 0 1 1 2 0z" />
                                </svg>
                            Acceso Clientes ▾
                        </button>

                        {clientOpen && (
                            <ClientMenu
                                onClose={() => setClientOpen(false)}
                            />
                        )}

                    </li>

                </ul>

                {/* MOBILE BUTTON */}
                <button
                    className="tags_landing_menu_btn d-lg-none"
                    onClick={() => setOpen(!open)}
                >
                    ☰
                </button>

            </div>

            {/* MOBILE MENU */}
            {open && (

                <div
                    className="tags_landing_overlay"
                    onClick={() => setOpen(false)}
                >

                    <div
                        className="tags_landing_mobile_modal"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <Link
                            href="/"
                            onClick={() => setOpen(false)}
                        >
                            🏠 Inicio
                        </Link>

                        <Link
                            href="/store-products"
                            onClick={() => setOpen(false)}
                        >
                            🛒 Productos
                        </Link>

                        <a
                            href="/demo"
                            onClick={() => setOpen(false)}
                        >
                            🚀 Demo
                        </a>
<a
                            href="/contact"
                            onClick={() => setOpen(false)}
                        >
                            📲 Contacto
                        </a>
                        

                        {/* CLIENTES MOBILE */}
                        <div
                            className="tags_mobile_clients"
                            ref={mobileDropdownRef}
                        >

                            <button
                                type="button"
                                className="tags_mobile_clients_btn tags_mobile_clients_btn_access"
                                onClick={() => setClientOpen((v) => !v)}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M8 1a2 2 0 0 0-2 2v3H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H10V3a2 2 0 0 0-2-2zm1 5H7V3a1 1 0 1 1 2 0z" />
                                </svg>
                                Acceso Clientes ▾
                            </button>

                            {clientOpen && (

                                <div className="tags_mobile_clients_menu">

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpen(false);
                                            setClientOpen(false);
                                            router.push("/login");
                                        }}
                                    >
                                        👤 Ingresar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpen(false);
                                            setClientOpen(false);
                                            router.push("/logout");
                                        }}
                                    >
                                        🔄 Cambiar cuenta
                                    </button>

                                </div>

                            )}

                        </div>

                    </div>

                </div>

            )}

        </nav>
    );
}