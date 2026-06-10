"use client";

import "../../styles/tags_landing.css";

import Image from "next/image";
import Link from "next/link";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const mainLinks = [
    {
        href: "/",
        label: "Inicio",
        icon: "🏠",
    },
    {
        href: "/qr-inteligente",
        label: "QR Inteligente",
        icon: "⌗",
    },
    {
        href: "/qr-page",
        label: "QR-Page",
        icon: "🌐",
    },
    {
        href: "/tags-id",
        label: "Tags Id",
        icon: "🪪",
    },
    {
        href: "/tags-reviews",
        label: "Reviews",
        icon: "⭐",
    },
    {
        href: "/e-events",
        label: "eEvents",
        icon: "🎟️",
    },
    {
        href: "/store-products",
        label: "Tienda",
        icon: "🛒",
    },
    {
        href: "/demo",
        label: "Demo",
        icon: "🚀",
    },
    {
        href: "/contact",
        label: "Contacto",
        icon: "📲",
    },
];

export default function Header() {

    const router =
        useRouter();

    const [scrolled, setScrolled] =
        useState(false);

    const [open, setOpen] =
        useState(false);

    const [clientOpen, setClientOpen] =
        useState(false);

    const desktopDropdownRef =
        useRef(null);

    const mobileDropdownRef =
        useRef(null);

    useEffect(() => {

        const onScroll = () => {
            setScrolled(
                window.scrollY > 20
            );
        };

        window.addEventListener(
            "scroll",
            onScroll
        );

        return () => {
            window.removeEventListener(
                "scroll",
                onScroll
            );
        };

    }, []);

    useEffect(() => {

        const handleClick = (e) => {

            const desktopInside =
                desktopDropdownRef.current &&
                desktopDropdownRef.current.contains(
                    e.target
                );

            const mobileInside =
                mobileDropdownRef.current &&
                mobileDropdownRef.current.contains(
                    e.target
                );

            if (
                !desktopInside &&
                !mobileInside
            ) {
                setClientOpen(false);
            }
        };

        document.addEventListener(
            "click",
            handleClick
        );

        return () => {
            document.removeEventListener(
                "click",
                handleClick
            );
        };

    }, []);

    const closeMenus = () => {
        setOpen(false);
        setClientOpen(false);
    };

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

                <Link
                    href="/"
                    aria-label="Ir al inicio de Tags"
                    onClick={closeMenus}
                >
                    <Image
                        src="/logo_tags_transparente.webp"
                        alt="Tags"
                        width={90}
                        height={75}
                        priority
                    />
                </Link>

                {/* DESKTOP */}
                <ul className="d-none d-xl-flex list-unstyled m-0 gap-3 align-items-center">

                    {mainLinks.map((item) => (

                        <li key={item.href}>
                            <Link href={item.href}>
                                {item.label}
                            </Link>
                        </li>

                    ))}

                    <li
                        ref={desktopDropdownRef}
                        className="position-relative"
                    >

                        <button
                            type="button"
                            className="tags_clients_btn"
                            onClick={() =>
                                setClientOpen((v) => !v)
                            }
                        >
                            🔐 Acceso Clientes ▾
                        </button>

                        {clientOpen && (
                            <ClientMenu
                                onClose={() =>
                                    setClientOpen(false)
                                }
                            />
                        )}

                    </li>

                </ul>

                {/* MOBILE BUTTON */}
                <button
                    type="button"
                    className="tags_landing_menu_btn d-xl-none"
                    onClick={() =>
                        setOpen(!open)
                    }
                    aria-label="Abrir menú"
                >
                    ☰
                </button>

            </div>

            {/* MOBILE MENU */}
            {open && (

                <div
                    className="tags_landing_overlay"
                    onClick={closeMenus}
                >

                    <div
                        className="tags_landing_mobile_modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {mainLinks.map((item) => (

                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMenus}
                            >
                                {item.icon} {item.label}
                            </Link>

                        ))}

                        <div
                            className="tags_mobile_clients"
                            ref={mobileDropdownRef}
                        >

                            <button
                                type="button"
                                className="tags_mobile_clients_btn tags_mobile_clients_btn_access"
                                onClick={() =>
                                    setClientOpen((v) => !v)
                                }
                            >
                                🔐 Acceso Clientes ▾
                            </button>

                            {clientOpen && (

                                <div className="tags_mobile_clients_menu">

                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeMenus();
                                            router.push("/login");
                                        }}
                                    >
                                        👤 Ingresar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeMenus();
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