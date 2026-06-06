"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import showAlert from "@/app/components/showAlert";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";
import TagsSpinner from "@/app/components/TagsSpinner";
import EventOwnerHeader from "@/app/modules/e-events/components/EventOwnerHeader";
import { badgeStatusEvent, statusLabelEvent } from "@/app/modules/e-events/lib/helpers/labelsAndBadgesStatus";



export default function EventDashboardPage({

    session,
    eventId,
    modules

}) {


    const [event, setEvent] =
        useState(null);


    const [loading, setLoading] =
        useState(true);

    // =========================
    // LOAD
    // =========================

    useEffect(() => {
        load();
    }, []);

    async function load() {

        try {

            const res =
                await fetch(
                    `/api/events/get?id=${eventId}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo cargar",
                    icon: "error"
                });

                return;
            }

            setEvent(data.data);


        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text:
                    "Error interno",
                icon: "error"
            });

        } finally {

            setLoading(false);
        }
    }

    // =========================
    // LOADING
    // =========================

    if (loading) {

        return (

            <div className="container-fluid p-4">
                <TagsSpinner />
            </div>

        );
    }

    if (!event) {

        return (

            <div className="container-fluid p-4">
                Evento no encontrado
            </div>

        );
    }

    // =========================
    // UI
    // =========================

    return (

        <div className="container-fluid tags_container m-0 p-0 mb-5 pb-5">
            <EventOwnerHeader session={session} />

            <div className="m-0 p-0 pt-4 px-2">
                {/* {
                    (
                        session.role === "admin"
                        ||
                        session.role === "event_client"
                    )
                    &&
                    <OwnerNavigation />
                } */}
                <OwnerNavigation session={session} staffPermissions={modules}/>

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-start mb-4">

                    <div>

                        <div className="text-muted tags_text_normal pb-2">

                            <span className="me-3" style={{ fontSize: "20px", fontWeight: "700" }}>Evento</span>{`🚩 ${event.location || "-"}`}

                        </div>
                        <h1 className="tags_title mb-1">
                            🎫 {event.name}
                        </h1>



                    </div>

                </div>

                {/* STATUS */}
                <div className="row g-3 mb-4">

                    <div className="col-md-3">

                        <div className="tags_card p-3">

                            <div className="small text-muted">
                                Estado
                            </div>

                            <div className={`${badgeStatusEvent(event.status)} fs-6 fw-bold`}>
                              { statusLabelEvent(event.status)}
                            </div>

                        </div>

                    </div>

                    <div className="col-md-3">

                        <div className="tags_card p-3">

                            <div className="small text-muted">
                                Inicio
                            </div>

                            <div className="fw-bold">
                                {
                                    formatDate(
                                        event.starts_at
                                    )
                                }
                            </div>

                        </div>

                    </div>

                    <div className="col-md-3">

                        <div className="tags_card p-3">

                            <div className="small text-muted">
                                Fin
                            </div>

                            <div className="fw-bold">
                                {
                                    formatDate(
                                        event.ends_at
                                    )
                                }
                            </div>

                        </div>

                    </div>

                    <div className="col-md-3">

                        <div className="tags_card p-3">

                            <div className="small text-muted">
                                Checkins
                            </div>

                            <div className="fs-4 fw-bold">
                                0
                            </div>

                        </div>

                    </div>

                </div>

                {/* MODULES */}
                <div className="row g-3">

                    {/* STAFF */}
                    {modules?.staff && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/staff`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            👥
                                        </div>

                                        <h4 className="tags_module_title">
                                            Staff
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Gestión de personal,
                                            permisos y accesos.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* ATTENDEES */}
                    {modules?.attendees && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/attendees`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            🎟
                                        </div>

                                        <h4 className="tags_module_title">
                                            Invitados
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Gestión completa de invitados,
                                            QR y confirmaciones.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* ATTENDEES */}
                    {modules?.invitations && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/invitations`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            ✉️
                                        </div>

                                        <h4 className="tags_module_title">
                                            Invitaciones
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Gestión y personalización de Invitaciones

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* EVENT */}
                    {modules?.event && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/event-timeline`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            📅
                                        </div>

                                        <h4 className="tags_module_title">
                                            Cronograma
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Gestión del cronograma
                                            completo del evento.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}
                    {/* TABLES */}
                    {modules?.tables && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/tables`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            🍽️
                                        </div>

                                        <h4 className="tags_module_title">
                                            Mesas
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Gestión de Mesas y distrubución de Invitados.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* MENU */}
                    {modules?.menu && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/menu`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            🧾
                                        </div>

                                        <h4 className="tags_module_title">
                                            Menú
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Gestión de la carta
                                            y menú del evento.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* PLAYLIST */}
                    {modules?.playlist && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/playlist`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            🎵
                                        </div>

                                        <h4 className="tags_module_title">
                                            Música
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Playlist colaborativa
                                            y control musical.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* SOCIAL */}
                    {modules?.guests && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/social-media`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            🫶
                                        </div>

                                        <h4 className="tags_module_title">
                                            Social
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Los asistentes comparten
                                            imágenes, videos y mensajes
                                            en vivo durante el evento.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* CHECKIN */}
                    {modules?.checkin && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/checkin`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            ✅
                                        </div>

                                        <h4 className="tags_module_title">
                                            Checkin
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Validación QR,
                                            ingresos y accesos
                                            al evento.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* SCANNER */}
                    {modules?.scanner && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/scanner`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            📷
                                        </div>

                                        <h4 className="tags_module_title">
                                            Scanner
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Escaneo rápido
                                            de códigos QR
                                            para accesos.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* ANALYTICS */}
                    {modules?.analytics && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/analytics`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            📊
                                        </div>

                                        <h4 className="tags_module_title">
                                            Analytics
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Métricas,
                                            actividad y estadísticas
                                            del evento.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                    {/* ACTIVITY */}
                    {modules?.activity && (
                        <div className="col-md-6 col-lg-4 col-12">

                            <Link
                                href={`/dashboard/events/${eventId}/activity`}
                                className="text-decoration-none"
                            >

                                <div className="tags_module_card">

                                    <div className="tags_module_left">

                                        <div className="tags_module_icon">
                                            📝
                                        </div>

                                        <h4 className="tags_module_title">
                                            Actividad
                                        </h4>

                                    </div>

                                    <div className="tags_module_right">

                                        <p className="tags_module_description">

                                            Logs, acciones
                                            y movimientos
                                            del staff.

                                        </p>

                                    </div>

                                </div>

                            </Link>

                        </div>
                    )}

                </div>

            </div>

        </div>
    );
}

// =========================
// HELPERS
// =========================

function formatDate(date) {

    if (!date) return "-";

    return new Date(date)
        .toLocaleString();
}