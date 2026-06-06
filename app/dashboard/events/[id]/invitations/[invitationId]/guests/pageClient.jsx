"use client";

import { useEffect, useState }
    from "react";

import { useRouter }
    from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import "../../../../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";

import TagsSpinner
    from "@/app/components/TagsSpinner";
import InvitationNavigation from "@/app/modules/e-events/components/invitations/InvitationNavigation";

export default function InvitationGuestsPageClient({

    session,
    eventId,
    invitationId,
    modules

}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [guests, setGuests] =
        useState([]);

    const [attendees, setAttendees] =
        useState([]);

    const [showModal, setShowModal] =
        useState(false);

    const [search, setSearch] =
        useState("");

    const [selectedAttendee, setSelectedAttendee] =
        useState(null);

    const [personalizedMessage, setPersonalizedMessage] =
        useState("");

    const [maxCompanions, setMaxCompanions] =
        useState("");

    const [expandedGuestId, setExpandedGuestId] =
        useState(null);

    useEffect(() => {

        if (!invitationId) return;

        loadGuests();

    }, [invitationId]);

    useEffect(() => {

        if (!showModal) return;

        loadAttendees();

    }, [showModal, search]);

    async function loadGuests() {

        try {

            setLoading(true);

            const res =
                await fetch(
                    `/api/events/invitations/guests/list?invitation_id=${invitationId}`,
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
                        "Error cargando invitados",
                    icon: "error"
                });

                return;
            }

            setGuests(
                data.data || []
            );

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    async function loadAttendees() {

        try {

            const params =
                new URLSearchParams();

            params.append(
                "event_id",
                eventId
            );

            if (search) {

                params.append(
                    "search",
                    search
                );
            }

            const res =
                await fetch(
                    `/api/events/attendees/list?${params.toString()}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                return;
            }

            const currentIds =
                guests.map(item =>
                    Number(item.attendee_id)
                );

            const available =
                (data.data || [])
                    .filter(item =>
                        !currentIds.includes(
                            Number(item.id)
                        )
                    );

            setAttendees(
                available
            );

        } catch (err) {

            console.log(err);
        }
    }

    function openCreate() {

        setSelectedAttendee(null);

        setPersonalizedMessage("");

        setMaxCompanions("");

        setSearch("");

        setShowModal(true);
    }

    async function createGuest() {

        try {

            if (!selectedAttendee) {

                showAlert({
                    title: "Error",
                    text: "Seleccioná un invitado",
                    icon: "error"
                });

                return;
            }

            setSaving(true);

            const res =
                await fetch(
                    "/api/events/invitations/guests/create",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                invitation_id:
                                    Number(invitationId),

                                attendee_id:
                                    Number(selectedAttendee.id),

                                personalized_message:
                                    personalizedMessage || null,

                                max_companions:
                                    maxCompanions !== ""
                                        ? Number(maxCompanions)
                                        : null
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo agregar el invitado",
                    icon: "error"
                });

                return;
            }

            setShowModal(false);

            await loadGuests();

            showAlert({
                title: "OK",
                text: "Invitado agregado a la invitación",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    async function deleteGuest(id) {

        const confirm =
            await showAlert({
                title: "Eliminar invitado",
                text: "Se quitará de esta invitación. No se elimina del evento.",
                icon: "warning",
                showCancelButton: true
            });

        if (!confirm) return;

        try {

            setSaving(true);

            const res =
                await fetch(
                    "/api/events/invitations/guests/delete",
                    {
                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                id
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo eliminar",
                    icon: "error"
                });

                return;
            }

            await loadGuests();

            showAlert({
                title: "OK",
                text: "Invitado removido",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    async function generateToken(guestId) {

        const confirmed =
            await showAlert({

                title:
                    "Regenerar token",

                text:
                    "El enlace anterior dejará de funcionar. ¿Deseás continuar?",

                icon:
                    "warning",

                showCancelButton:
                    true
            });

        if (!confirmed) return;

        try {

            setSaving(true);

            const res =
                await fetch(
                    "/api/events/invitations/guests/generate-token",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                guest_id:
                                    guestId
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo generar token",
                    icon: "error"
                });

                return;
            }

            await loadGuests();

            showAlert({
                title: "OK",
                text: "Token generado",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    async function generateQr(guestId) {

        const confirmed =
            await showAlert({

                title:
                    "Generar QR",

                text:
                    "Se generará un nuevo QR para este invitado.",

                icon:
                    "question",

                showCancelButton:
                    true
            });

        if (!confirmed) return;

        try {

            setSaving(true);

            const res =
                await fetch(
                    "/api/events/invitations/guests/generate-qr",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                guest_id:
                                    guestId
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo generar QR",
                    icon: "error"
                });

                return;
            }

            await copyText(
                data.qr_code
            );

            showAlert({
                title: "OK",
                text: "QR generado y copiado",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    async function sendGuest(guestId) {

        const confirmed =
            await showAlert({

                title:
                    "Enviar invitación",

                text:
                    `Se enviará la invitación por e-mail. ¿Continuar?`,

                icon:
                    "question",

                showCancelButton:
                    true
            });

        if (!confirmed) return;

        try {

            setSaving(true);

            const res =
                await fetch(
                    "/api/events/invitations/guests/send",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                invitation_guest_id:
                                    guestId
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo enviar",
                    icon: "error"
                });

                return;
            }

            showAlert({
                title: "OK",
                text: "Invitación enviada por email",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    async function copyText(text) {

        if (!text) {

            showAlert({
                title: "Error",
                text: "No hay texto para copiar",
                icon: "error"
            });

            return;
        }

        try {

            await navigator.clipboard.writeText(
                text
            );

            showAlert({
                title: "Copiado",
                text: "Copiado al portapapeles",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "No se pudo copiar",
                icon: "error"
            });
        }
    }

    function getPublicUrl(token) {

        if (!token) return "";

        if (typeof window === "undefined") {

            return "";
        }

        return `${window.location.origin}/e/invite/${token}`;
    }

    function getRsvpBadgeClass(status) {

        if (status === "confirmed") {

            return "tags_badge_success";
        }

        if (status === "declined") {

            return "tags_badge_danger";
        }

        return "tags_badge_warning";
    }

    function getRsvpLabel(status) {

        if (status === "confirmed") {

            return "Confirmado";
        }

        if (status === "declined") {

            return "Rechazado";
        }

        return "Pendiente";
    }

    function formatDate(value) {

        if (!value) return "-";

        try {

            return new Date(value)
                .toLocaleString();

        } catch (err) {

            return "-";
        }
    }

    return (

        <div className="container-fluid tags_container m-0 p-0">

            <EventOwnerHeader
                session={session}
            />

            <div className="m-0 p-0 pt-4 px-2 px-md-3">

                {
                    (
                        session.role === "admin"
                        ||
                        session.role === "event_client"
                    )
                    &&
                    <OwnerNavigation />
                }

                {
                    modules
                    &&
                    (
                        <EventNavigation
                            eventId={eventId}
                            modules={modules}
                        />
                    )
                }

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 24,
                        gap: 12,
                        flexWrap: "wrap"
                    }}
                >

                    <div>

                        <h2>
                            👥 Invitados de la Invitación
                        </h2>

                        <p>
                            Asociá invitados del evento a esta invitación,
                            enviá el enlace y gestioná RSVP.
                        </p>

                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap"
                        }}
                    >


                        <InvitationNavigation
                            eventId={eventId}
                            invitationId={invitationId}
                            active="guests"
                        />
                        <div>
                            <button
                                className="tags_btn"
                                onClick={openCreate}
                                disabled={saving}
                            >
                                ✚ Agregar Invitado
                            </button>
                        </div>


                    </div>

                </div>

                <div className="row g-3 mb-4">

                    <div className="col-6 col-md-3">

                        <div className="card">

                            <div className="card-body">

                                <small>
                                    Total
                                </small>

                                <h3>
                                    {guests.length}
                                </h3>

                            </div>

                        </div>

                    </div>

                    <div className="col-6 col-md-3">

                        <div className="card">

                            <div className="card-body">

                                <small>
                                    Confirmados
                                </small>

                                <h3>
                                    {
                                        guests.filter(
                                            item =>
                                                item.rsvp_status === "confirmed"
                                        ).length
                                    }
                                </h3>

                            </div>

                        </div>

                    </div>

                    <div className="col-6 col-md-3">

                        <div className="card">

                            <div className="card-body">

                                <small>
                                    Rechazados
                                </small>

                                <h3>
                                    {
                                        guests.filter(
                                            item =>
                                                item.rsvp_status === "declined"
                                        ).length
                                    }
                                </h3>

                            </div>

                        </div>

                    </div>

                    <div className="col-6 col-md-3">

                        <div className="card">

                            <div className="card-body">

                                <small>
                                    Abiertos
                                </small>

                                <h3>
                                    {
                                        guests.filter(
                                            item =>
                                                item.viewed_at
                                        ).length
                                    }
                                </h3>

                            </div>

                        </div>

                    </div>

                </div>

                {
                    loading
                    &&
                    (
                        <TagsSpinner />
                    )
                }

                {
                    !loading
                    &&
                    guests.length === 0
                    &&
                    (
                        <div className="card">

                            <div className="card-body">

                                <h5>
                                    Todavía no hay invitados asociados.
                                </h5>

                                <p>
                                    Agregá invitados del evento para generar sus links públicos.
                                </p>

                                <button
                                    className="tags_btn"
                                    onClick={openCreate}
                                >
                                    ✚ Agregar primer invitado
                                </button>

                            </div>

                        </div>
                    )
                }

                {
                    !loading
                    &&
                    guests.length > 0
                    &&
                    (
                        <div className="table-responsive">

                            <table className="tags_table tags_text_normal">

                                <thead>

                                    <tr>

                                        <th>
                                            Invitado
                                        </th>

                                        <th>
                                            RSVP
                                        </th>

                                        <th>
                                            Acompañantes
                                        </th>

                                        <th>
                                            Visto
                                        </th>

                                        <th>
                                            Token
                                        </th>

                                        <th>
                                            Acciones
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {
                                        guests.map(item => (

                                            <tr key={item.id}>

                                                <td>

                                                    <strong>
                                                        {item.name}
                                                    </strong>

                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            color: "#666"
                                                        }}
                                                    >
                                                        {item.email || "-"}
                                                    </div>

                                                    {
                                                        item.personalized_message
                                                        &&
                                                        (
                                                            <div
                                                                style={{
                                                                    fontSize: 12,
                                                                    marginTop: 6
                                                                }}
                                                            >
                                                                “{item.personalized_message}”
                                                            </div>
                                                        )
                                                    }

                                                    {
                                                        expandedGuestId === item.id
                                                        &&
                                                        (
                                                            <div
                                                                style={{
                                                                    marginTop: 10,
                                                                    padding: 10,
                                                                    border: "1px solid #e5e7eb",
                                                                    borderRadius: 12
                                                                }}
                                                            >

                                                                <strong>
                                                                    Acompañantes
                                                                </strong>

                                                                {
                                                                    !item.companions?.length
                                                                    &&
                                                                    (
                                                                        <p
                                                                            style={{
                                                                                margin: "6px 0 0",
                                                                                color: "#666"
                                                                            }}
                                                                        >
                                                                            Sin acompañantes.
                                                                        </p>
                                                                    )
                                                                }

                                                                {
                                                                    item.companions?.map(companion => (

                                                                        <div
                                                                            key={companion.id}
                                                                            style={{
                                                                                marginTop: 8,
                                                                                fontSize: 13
                                                                            }}
                                                                        >
                                                                            • {companion.name}
                                                                            {
                                                                                companion.attendee_status
                                                                                &&
                                                                                (
                                                                                    <>
                                                                                        {" "}
                                                                                        ({companion.attendee_status})
                                                                                    </>
                                                                                )
                                                                            }
                                                                        </div>
                                                                    ))
                                                                }

                                                            </div>
                                                        )
                                                    }

                                                </td>

                                                <td>

                                                    <span
                                                        className={
                                                            getRsvpBadgeClass(
                                                                item.rsvp_status
                                                            )
                                                        }
                                                    >
                                                        {
                                                            getRsvpLabel(
                                                                item.rsvp_status
                                                            )
                                                        }
                                                    </span>

                                                </td>

                                                <td className="text-start">
                                                    {item.companions?.length || 0}
                                                    {"/"}
                                                    {item.max_companions ??
                                                        item.plus_ones_allowed ??
                                                        0}

                                                    <button
                                                        className="icon_btn"
                                                        title={
                                                            expandedGuestId === item.id
                                                                ? "Cerrar Detalle"
                                                                : "Ver Detalle"
                                                        }
                                                        onClick={() =>
                                                            setExpandedGuestId(
                                                                expandedGuestId === item.id
                                                                    ? null
                                                                    : item.id
                                                            )
                                                        }
                                                    >
                                                        {expandedGuestId === item.id ? "❌" : "🔍"}
                                                    </button>
                                                </td>

                                                <td>
                                                    {
                                                        item.viewed_at
                                                            ? formatDate(
                                                                item.viewed_at
                                                            )
                                                            : "-"
                                                    }
                                                </td>

                                                <td>

                                                    {
                                                        item.access_token
                                                            ?
                                                            (
                                                                <span className="tags_badge">
                                                                    OK
                                                                </span>
                                                            )
                                                            :
                                                            (
                                                                <span className="tags_badge_warning">
                                                                    Sin token
                                                                </span>
                                                            )
                                                    }

                                                </td>

                                                <td>

                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: 6,
                                                            flexWrap: "wrap"
                                                        }}
                                                    >

                                                        <button
                                                            className="icon_btn"
                                                            title="Copiar link"
                                                            onClick={() =>
                                                                item.access_token
                                                                    ? copyText(
                                                                        getPublicUrl(
                                                                            item.access_token
                                                                        )
                                                                    )
                                                                    : generateToken(
                                                                        item.id
                                                                    )
                                                            }
                                                        >
                                                            🔗
                                                        </button>

                                                        <button
                                                            className="icon_btn"
                                                            title="Ver invitación"
                                                            onClick={() => {

                                                                if (!item.access_token) {

                                                                    showAlert({
                                                                        title: "Sin token",
                                                                        text: "Primero generá el token de acceso.",
                                                                        icon: "warning"
                                                                    });

                                                                    return;
                                                                }

                                                                window.open(
                                                                    getPublicUrl(
                                                                        item.access_token
                                                                    ),
                                                                    "_blank"
                                                                );
                                                            }}
                                                        >
                                                            🔎
                                                        </button>

                                                        <button
                                                            className="icon_btn"
                                                            title="Regenerar token"
                                                            onClick={() =>
                                                                generateToken(
                                                                    item.id
                                                                )
                                                            }
                                                        >
                                                            🔑
                                                        </button>

                                                        <button
                                                            className="icon_btn"
                                                            title="Enviar invitación"
                                                            onClick={() =>
                                                                sendGuest(
                                                                    item.id
                                                                )
                                                            }
                                                        >
                                                            📨
                                                        </button>

                                                        <button
                                                            className="icon_btn"
                                                            title="Generar QR"
                                                            onClick={() =>
                                                                generateQr(
                                                                    item.id
                                                                )
                                                            }
                                                        >
                                                            ▣
                                                        </button>

                                                        <button
                                                            className="icon_btn danger"
                                                            title="Eliminar"
                                                            onClick={() =>
                                                                deleteGuest(
                                                                    item.id
                                                                )
                                                            }
                                                        >
                                                            🗑
                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>

                                        ))
                                    }

                                </tbody>

                            </table>

                        </div>
                    )
                }

            </div>

            {
                showModal
                &&
                (
                    <div className="tags_modal_overlay">

                        <div
                            className="tags_modal"
                            style={{
                                maxWidth: 760
                            }}
                        >

                            <div className="tags_modal_header">

                                <h3>
                                    Agregar Invitado
                                </h3>

                                <button
                                    className="tags_modal_close"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                >
                                    ✕
                                </button>

                            </div>

                            <div className="tags_modal_body">

                                <div className="mb-3">

                                    <label>
                                        Buscar invitado del evento
                                    </label>

                                    <input
                                        className="form-control"
                                        placeholder="Nombre, email o teléfono"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                                <div
                                    style={{
                                        maxHeight: 260,
                                        overflowY: "auto",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 12,
                                        marginBottom: 16
                                    }}
                                >

                                    {
                                        attendees.map(item => (

                                            <div
                                                key={item.id}
                                                onClick={() => {

                                                    setSelectedAttendee(
                                                        item
                                                    );

                                                    setMaxCompanions(
                                                        item.plus_ones_allowed ?? 0
                                                    );
                                                }}
                                                style={{
                                                    padding: 12,
                                                    cursor: "pointer",
                                                    borderBottom: "1px solid #eee",
                                                    background:
                                                        selectedAttendee?.id === item.id
                                                            ? "#f3f4f6"
                                                            : "#fff"
                                                }}
                                            >

                                                <strong>
                                                    {item.name}
                                                </strong>

                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#666"
                                                    }}
                                                >
                                                    {item.email || "-"}
                                                </div>

                                            </div>
                                        ))
                                    }

                                    {
                                        attendees.length === 0
                                        &&
                                        (
                                            <div
                                                style={{
                                                    padding: 14,
                                                    color: "#666"
                                                }}
                                            >
                                                No hay invitados disponibles.
                                            </div>
                                        )
                                    }

                                </div>

                                {
                                    selectedAttendee
                                    &&
                                    (
                                        <div
                                            className="tags_text_normal"
                                            style={{
                                                padding: 12,
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 12,
                                                marginBottom: 16,
                                                background: "#f9fafb",
                                                maxHeight: 170,
                                                overflowY: "auto"
                                            }}
                                        >

                                            <div className="tags_subtitle mb-2">
                                                Invitado seleccionado
                                            </div>

                                            <div>
                                                <strong>
                                                    {selectedAttendee.name}
                                                </strong>
                                            </div>

                                            <div
                                                style={{
                                                    color: "#666",
                                                    fontSize: 13
                                                }}
                                            >
                                                {selectedAttendee.email || "Sin email"}
                                                {" · "}
                                                {selectedAttendee.phone || "Sin teléfono"}
                                            </div>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 8,
                                                    flexWrap: "wrap",
                                                    marginTop: 10
                                                }}
                                            >

                                                <span className="tags_badge">
                                                    Estado: {selectedAttendee.status || "pending"}
                                                </span>

                                                <span className="tags_badge_warning">
                                                    Invitación: {selectedAttendee.invitation_status || "not_sent"}
                                                </span>

                                                <span className="tags_badge">
                                                    Acompañantes: {selectedAttendee.plus_ones_allowed ?? 0}
                                                </span>

                                            </div>

                                            {
                                                (
                                                    selectedAttendee.dietary_notes
                                                    ||
                                                    selectedAttendee.custom_dietary_notes
                                                )
                                                &&
                                                (
                                                    <div
                                                        style={{
                                                            marginTop: 10,
                                                            fontSize: 13,
                                                            color: "#555"
                                                        }}
                                                    >

                                                        {
                                                            selectedAttendee.dietary_notes
                                                            &&
                                                            (
                                                                <div>
                                                                    <strong>Notas:</strong>{" "}
                                                                    {selectedAttendee.dietary_notes}
                                                                </div>
                                                            )
                                                        }

                                                        {
                                                            selectedAttendee.custom_dietary_notes
                                                            &&
                                                            (
                                                                <div>
                                                                    <strong>Restricciones:</strong>{" "}
                                                                    {selectedAttendee.custom_dietary_notes}
                                                                </div>
                                                            )
                                                        }

                                                    </div>
                                                )
                                            }

                                        </div>
                                    )
                                }

                                <div className="mb-3">

                                    <label>
                                        Mensaje personalizado
                                    </label>

                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        value={personalizedMessage}
                                        onChange={(e) =>
                                            setPersonalizedMessage(
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                                <div className="mb-3">

                                    <label>
                                        Máximo acompañantes
                                    </label>

                                    <input
                                        type="number"
                                        className="form-control"
                                        value={maxCompanions}
                                        onChange={(e) =>
                                            setMaxCompanions(
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                            </div>

                            <div className="tags_modal_actions">

                                <button
                                    className="tags_modal_btn tags_modal_btn_cancel"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="tags_btn"
                                    onClick={createGuest}
                                    disabled={saving}
                                >
                                    {
                                        saving
                                            ? "Guardando..."
                                            : "Agregar Invitado"
                                    }
                                </button>

                            </div>

                        </div>

                    </div>
                )
            }

            <div
                style={{
                    minHeight: 200
                }}
            />

        </div>
    );
}