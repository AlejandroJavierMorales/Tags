// =====================================
// FILE: /dashboard/businesses/[id]/resto/pageClient.jsx
// Descripción:
// Panel principal de administración
// de Tags Resto.
// =====================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import showAlert
    from "@/app/components/showAlert";

import {
    FaUtensils,
    FaChair,
    FaClipboardList,
    FaFire,
    FaUsers,
    FaCog,
    FaChartBar,
    FaCashRegister,
    FaCheckCircle,
    FaChevronDown,
    FaChevronRight,
    FaChevronUp,
    FaCircle,
    FaTags,
    FaHistory,
    FaTruck
    ,FaPaintBrush,
    FaStar
} from "react-icons/fa";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";

import "../../../../modules/resto/styles/resto-dashboard.css";

export default function RestoDashboardClient({
    businessId,
    session,
    isStaff = false,
    permissions = ["*"]
}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [store, setStore] =
        useState(null);

    const [status, setStatus] =
        useState("draft");

    const [publishing, setPublishing] =
        useState(false);

    const [setup, setSetup] =
        useState(null);

    const [setupExpanded, setSetupExpanded] =
        useState(false);

    const canReadSettings =
        permissions.includes("*") ||
        permissions.includes(
            "settings.view"
        );

    useEffect(() => {

        if (canReadSettings) {
            load();
        } else {
            setLoading(false);
        }

        // eslint-disable-next-line
    }, []);

    async function load() {

        setLoading(true);

        try {

            const res =
                await fetch(
                    `/api/resto/admin/settings?businessId=${businessId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                throw new Error(
                    data.error
                );

            }

            setStore(
                data.store
            );

            setStatus(
                data.store?.status ||
                "draft"
            );

            if (!isStaff) {
                await loadSetup();
            }

        } catch (err) {

            console.error(err);

            showAlert({
                icon: "error",
                title: "Error",
                text: err.message
            });

        } finally {

            setLoading(false);

        }

    }

    function go(path) {

        router.push(
            `/dashboard/businesses/${businessId}/resto/${path}`
        );

    }

    async function publish(nextStatus) {

        if (!store?.id) {

            showAlert({
                icon: "info",
                title: "Primero configurá el restaurante."
            });

            return;

        }

        setPublishing(true);

        try {
            const response =
                await fetch(
                    "/api/resto/admin/settings/status",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            status: nextStatus
                        })
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result?.error ||
                    "No se pudo actualizar la publicación"
                );
            }

            setStatus(result.status);

            await loadSetup();

            showAlert({
                icon: "success",
                title:
                    nextStatus === "published"
                        ? "Restaurante publicado"
                        : "Restaurante despublicado",
                text:
                    nextStatus === "published"
                        ? "La carta pública ya está disponible."
                        : "La carta pública quedó en borrador.",
                timer: 1500
            });
        } catch (error) {
            showAlert({
                icon: "error",
                title: "Tags Resto",
                text: error.message
            });
        } finally {
            setPublishing(false);
        }

    }

    async function loadSetup() {
        try {
            const response =
                await fetch(
                    `/api/resto/admin/setup/status?businessId=${encodeURIComponent(
                        businessId
                    )}`,
                    {
                        cache:
                            "no-store"
                    }
                );

            const data =
                await response
                    .json()
                    .catch(
                        () => null
                    );

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudo calcular la configuración"
                );
            }

            setSetup(
                data
            );

            setSetupExpanded(false);
        } catch (error) {
            console.error(
                "RESTO SETUP LOAD ERROR:",
                error
            );
        }
    }

    if (loading) {

        return (

            <div className="qr_page_builder">

                <TagsSpinner />

            </div>

        );

    }

    const publicUrl =
        store?.slug
            ? `/p/${store.slug}`
            : "#";

    const operationalModules = [
        {
            icon: FaCashRegister,
            title: "Caja",
            text: "Abrir caja, cobrar y realizar el arqueo",
            route: "cash",
            step: "1",
            permission: "cash.view"
        },
        {
            icon: FaChair,
            title: "Mesas - Estados en Tiempo Real",
            text: "Abrir mesas y controlar la ocupación",
            route: "tables",
            step: "2",
            permission: "tables.view"
        },
        {
            icon: FaClipboardList,
            title: "Pedidos",
            text: "Administrar todos los pedidos en curso",
            route: "orders",
            step: "3",
            permission: "orders.view"
        },
        {
            icon: FaFire,
            title: "Cocina",
            text: "Preparar y marcar platos listos",
            route: "kitchen",
            step: "4",
            permission: "kitchen.view"
        },
        {
            icon: FaUsers,
            title: "Mozo",
            text: "Llamados, cuentas y entregas",
            route: "waiter",
            step: "5",
            permission: "waiter.view"
        },
        {
            icon: FaTruck,
            title: "Delivery",
            text: "Despachos, repartidores y rendiciones",
            route: "delivery",
            step: "6",
            permission: "delivery.view"
        }
    ];

    const administrationModules = [
        {
            icon: FaStar,
            title: "Opiniones",
            text: "Encuestas, respuestas y métricas",
            route: "reviews",
            permission: "reviews.view",
            requiresReviews: true
        },
        {
            icon: FaPaintBrush,
            title: "Diseño de la página",
            text: "Ordenar y personalizar la página pública",
            route: "builder",
            permission: "builder.view"
        },
        {
            icon: FaUtensils,
            title: "Productos",
            text: "Carta gastronómica",
            route: "products",
            permission: "products.view"
        },
        {
            icon: FaTags,
            title: "Categorías",
            text: "Entradas, bebidas...",
            route: "categories",
            permission: "categories.view"
        },
        {
            icon: FaChair,
            title: "Sectores y mesas",
            text: "Configuración de ubicaciones y QR",
            route: "locations",
            permission: "locations.view"
        },
        {
            icon: FaHistory,
            title: "Historial",
            text: "Todos los pedidos y períodos",
            route: "orders/history",
            permission: "history.view"
        },
        {
            icon: FaUsers,
            title: "Personal",
            text: "Mozos y permisos",
            route: "staff",
            permission: "staff.view"
        },

        {
            icon: FaChartBar,
            title: "Reportes",
            text: "Ventas, productos y modalidades",
            route: "reports",
            permission: "history.view"
        },

        {
            icon: FaCog,
            title: "Configuración",
            text: "Restaurante",
            route: "settings",
            permission: "settings.view"
        }
    ];

    const hasPermission =
        permission =>
            permissions.includes("*") ||
            permissions.includes(
                permission
            );

    const visibleOperationalModules =
        operationalModules.filter(
            item =>
                hasPermission(
                    item.permission
                )
        );

    const visibleAdministrationModules =
        administrationModules.filter(
            item =>
                (!item.requiresReviews || Boolean(store?.has_reviews)) &&
                (
                    !isStaff ||
                    (
                        item.permission &&
                        hasPermission(item.permission)
                    )
                )
        );

    return (

        <div className="qr_page_builder">

            {/* HEADER */}

            <div className="qr_page_header">

                <div>

                    <div className="resto_dashboard_identity">

                        {

                            store?.logo_url

                                ? (

                                    <img
                                        src={store.logo_url}
                                        alt={`Logo de ${store.name}`}
                                    />

                                )

                                : (

                                    <span className="resto_dashboard_identity_fallback">
                                        <FaUtensils />
                                    </span>

                                )

                        }

                        <div>

                            <h1 className="qr_page_title">
                                {
                                    store?.name ||
                                    session?.businessName ||
                                    "Restaurante"
                                }
                            </h1>

                            <span className="resto_dashboard_brand">
                                <FaUtensils />
                                Tags Resto
                            </span>

                        </div>

                    </div>

                    <p className="qr_page_subtitle">

                        Administración profesional del restaurante.

                    </p>

                    <small
                        className="resto_dashboard_email"
                    >
                        {session?.email}
                    </small>

                </div>

                <div className="qr_page_actions">

                    {!isStaff && <button
                        className="qr_page_btn secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}`
                            )
                        }
                    >
                        Volver
                    </button>}

                    {!isStaff && <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="qr_page_btn secondary"
                    >
                        Ver restaurante
                    </a>}

                    {!isStaff && (
                        status === "published"

                            ?

                            <button
                                className="qr_page_btn"
                                disabled={publishing}
                                onClick={() =>
                                    publish("draft")
                                }
                            >
                                Despublicar
                            </button>

                            :

                            <button
                                className="qr_page_btn success"
                                disabled={publishing}
                                onClick={() =>
                                    publish("published")
                                }
                            >
                                Publicar
                            </button>
                    )}

                </div>

            </div>

            {!isStaff && <div className="qr_page_status">

                Estado:&nbsp;

                <strong>

                    {

                        status === "published"

                            ? "Publicado"

                            : "Borrador"

                    }

                </strong>

            </div>}

            {
                !isStaff &&
                setup && (
                    <section
                        className={[
                            "resto_dashboard_setup",
                            setup.ready
                                ? "is_ready"
                                : ""
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                        <header className="resto_dashboard_setup_header">
                            <div className="resto_dashboard_setup_heading">
                                <span className="resto_dashboard_setup_icon">
                                    <FaCheckCircle />
                                </span>

                                <div>
                                    <span className="resto_dashboard_setup_eyebrow">
                                        Configuración guiada
                                    </span>
                                    <h2>
                                        {
                                            setup.ready
                                                ? "Restaurante listo para operar"
                                                : "Prepará el restaurante para comenzar"
                                        }
                                    </h2>
                                    <p>
                                        {setup.completed} de {setup.total} puntos completados
                                    </p>
                                </div>
                            </div>

                            <div className="resto_dashboard_setup_header_actions">
                                <strong>
                                    {setup.progress}%
                                </strong>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSetupExpanded(
                                            current =>
                                                !current
                                        )
                                    }
                                    aria-expanded={
                                        setupExpanded
                                    }
                                >
                                    {
                                        setupExpanded
                                            ? <FaChevronUp />
                                            : <FaChevronDown />
                                    }
                                    {
                                        setupExpanded
                                            ? "Ocultar"
                                            : "Revisar"
                                    }
                                </button>
                            </div>
                        </header>

                        <div className="resto_dashboard_setup_progress">
                            <span
                                style={{
                                    width:
                                        `${setup.progress}%`
                                }}
                            />
                        </div>

                        {
                            setupExpanded && (
                                <div className="resto_dashboard_setup_steps">
                                    {
                                        setup.steps.map(
                                            step => (
                                                <article
                                                    key={step.key}
                                                    className={
                                                        step.complete
                                                            ? "is_complete"
                                                            : ""
                                                    }
                                                >
                                                    <span className="resto_dashboard_setup_step_state">
                                                        {
                                                            step.complete
                                                                ? <FaCheckCircle />
                                                                : <FaCircle />
                                                        }
                                                    </span>

                                                    <div>
                                                        <h3>
                                                            {step.title}
                                                        </h3>
                                                        <p>
                                                            {step.description}
                                                        </p>
                                                    </div>

                                                    {
                                                        !step.complete && (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    publishing &&
                                                                    step.key ===
                                                                    "publication"
                                                                }
                                                                onClick={() => {
                                                                    if (
                                                                        step.key ===
                                                                        "publication"
                                                                    ) {
                                                                        publish(
                                                                            "published"
                                                                        );
                                                                        return;
                                                                    }

                                                                    go(
                                                                        step.route
                                                                    );
                                                                }}
                                                            >
                                                                {
                                                                    step.key ===
                                                                    "publication"
                                                                        ? "Publicar"
                                                                        : "Completar"
                                                                }
                                                                <FaChevronRight />
                                                            </button>
                                                        )
                                                    }
                                                </article>
                                            )
                                        )
                                    }
                                </div>
                            )
                        }
                    </section>
                )
            }

            <section className="resto_dashboard_operation">
                <header>
                    <div>
                        <span>Operación diaria</span>
                        <h2>Comenzar a operar el restaurante</h2>
                        <p>
                            Accesos principales para abrir el turno y gestionar el servicio.
                        </p>
                    </div>
                </header>

                <div className="resto_dashboard_operation_grid">
                    {
                        visibleOperationalModules.map(item => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.title}
                                    className="resto_dashboard_operation_card"
                                    onClick={() => go(item.route)}
                                >
                                    <span className="resto_dashboard_step">
                                        {item.step}
                                    </span>
                                    <div className="resto_dashboard_icon">
                                        <Icon />
                                    </div>
                                    <h3>{item.title}</h3>
                                    <p>{item.text}</p>
                                </button>
                            );
                        })
                    }
                </div>
            </section>

            {visibleAdministrationModules.length > 0 && (
            <section className="resto_dashboard_admin">
                <header>
                    <span>Administración</span>
                    <h2>Configuración y gestión</h2>
                    <p>
                        Carta, estructura, historial y datos del restaurante.
                    </p>
                </header>

                <div className="resto_dashboard_grid">

                {

                    visibleAdministrationModules.map(item => {

                        const Icon =
                            item.icon;

                        return (

                            <button

                                key={item.title}

                                disabled={item.disabled}

                                className={
                                    item.disabled
                                        ? "resto_dashboard_card disabled"
                                        : "resto_dashboard_card"
                                }

                                onClick={() =>
                                    !item.disabled &&
                                    go(item.route)
                                }

                            >

                                <div
                                    className="resto_dashboard_icon"
                                >

                                    <Icon />

                                </div>

                                <h3>

                                    {item.title}

                                </h3>

                                <p>

                                    {item.text}

                                </p>

                            </button>

                        );

                    })

                }

                </div>
            </section>
            )}

        </div>

    );

}
