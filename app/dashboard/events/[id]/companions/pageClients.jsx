// ========================================
// /events/[id]/companions/pageClient.jsx
// ========================================

"use client";

import {
    useEffect,
    useMemo,
    useState
} from "react";

import showAlert
    from "@/app/components/showAlert";

import "../../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";
import TagsSpinner from "@/app/components/TagsSpinner";

export default function EventCompanionsPageClient({
    session,
    eventId,
    attendeeId,
    modules
}) {

    const [companions, setCompanions] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const isFilteredByAttendee =
        Boolean(attendeeId);

    const [attendee, setAttendee] =
        useState(null);

    const attendeeName =
        companions?.[0]?.attendee_name || "";

    const [filters, setFilters] =
        useState({

            search: "",
            attendee_status: ""
        });

    const [selectedCompanion, setSelectedCompanion] =
        useState(null);

    // =========================
    // LOAD
    // =========================

    useEffect(() => {

        if (!eventId) return;

        load();

    }, [eventId, attendeeId, filters]);

    async function load() {

        try {

            setLoading(true);

            const params =
                new URLSearchParams();

            params.append(
                "event_id",
                eventId
            );

            if (filters.search) {

                params.append(
                    "search",
                    filters.search
                );
            }

            if (
                filters.attendee_status
            ) {

                params.append(
                    "attendee_status",
                    filters.attendee_status
                );
            }
            if (attendeeId) {

                params.append(
                    "attendee_id",
                    attendeeId
                );
            }

            const res =
                await fetch(
                    `/api/events/companions/list?${params.toString()}`,
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
                        "Error cargando acompañantes",

                    icon: "error"
                });

                return;
            }

            setCompanions(
                data.data || []
            );
            setAttendee(
                data.attendee || null
            );

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    // =========================
    // STATS
    // =========================

    const stats =
        useMemo(() => {

            let confirmed = 0;
            let checkedIn = 0;

            for (const c of companions) {

                if (
                    c.attendee_status ===
                    "confirmed"
                ) {
                    confirmed++;
                }

                if (
                    c.attendee_status ===
                    "checked_in"
                ) {
                    checkedIn++;
                }
            }

            return {

                total:
                    companions.length,

                confirmed,

                checkedIn,

                pending:
                    companions.length
                    -
                    confirmed
            };

        }, [companions]);

    // =========================
    // DELETE
    // =========================

    async function removeCompanion(id) {

        const confirm =
            await showAlert({

                title:
                    "Eliminar acompañante?",

                text:
                    "Esta acción no se puede deshacer",

                icon: "warning",

                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const res =
                await fetch(
                    "/api/events/companions/delete",
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
                        data.error,

                    icon: "error"
                });

                return;
            }

            load();

        } catch (err) {

            console.log(err);
        }
    }

    // =========================
    // STATUS BADGE
    // =========================

    function getStatus(item) {

        switch (
        item.attendee_status
        ) {

            case "confirmed":
                return {
                    label: "Confirmado",
                    bg: "#dcfce7",
                    color: "#166534"
                };

            case "checked_in":
                return {
                    label: "Ingresó",
                    bg: "#dbeafe",
                    color: "#1d4ed8"
                };

            case "declined":
                return {
                    label: "Rechazado",
                    bg: "#fee2e2",
                    color: "#b91c1c"
                };

            case "cancelled":
                return {
                    label: "Cancelado",
                    bg: "#f3f4f6",
                    color: "#374151"
                };

            default:
                return {
                    label: "Pendiente",
                    bg: "#fef9c3",
                    color: "#92400e"
                };
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

                {/* HEADER */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 24,
                        gap: 20,
                        flexWrap: "wrap"
                    }}
                >

                    <div>

                        <h2>

                            👥

                            {
                                attendeeId
                                    ?
                                    ` Acompañantes de ${attendee?.name || ""}`
                                    : " Acompañantes del evento"
                            }

                        </h2>

                        <p>

                            {
                                attendeeId
                                    ?
                                    "Acompañantes asociados al invitado titular."
                                    : "Administración global de acompañantes del evento."
                            }

                        </p>

                    </div>

                </div>

                {/* STATS */}
                <div className="row g-3 mb-4">

                    <StatCard
                        title="Total"
                        value={stats.total}
                    />

                    <StatCard
                        title="Confirmados"
                        value={stats.confirmed}
                    />

                    <StatCard
                        title="Check-in"
                        value={stats.checkedIn}
                    />

                    <StatCard
                        title="Pendientes"
                        value={stats.pending}
                    />

                </div>

                {/* FILTERS */}
                <div className="row g-2 mb-4 tags_text_normal">

                    <div className="col-md-8">

                        <input
                            className="tags_modal_input"
                            placeholder="Buscar acompañante"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    search:
                                        e.target.value
                                }))
                            }
                        />

                    </div>

                    <div className="col-md-4">

                        <select
                            className="tags_modal_input"
                            value={
                                filters.attendee_status
                            }
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    attendee_status:
                                        e.target.value
                                }))
                            }
                        >

                            <option value="">
                                Estado
                            </option>

                            <option value="pending">
                                Pendiente
                            </option>

                            <option value="confirmed">
                                Confirmado
                            </option>

                            <option value="checked_in">
                                Check-in
                            </option>

                            <option value="declined">
                                Rechazado
                            </option>

                            <option value="cancelled">
                                Cancelado
                            </option>

                        </select>

                    </div>

                </div>

                {/* GRID */}
                {
                    loading
                        ? (
                            <TagsSpinner/>
                        )
                        : (
                            <div className="row g-3">

                                {
                                    companions.map(item => {

                                        const status =
                                            getStatus(item);

                                        return (

                                            <div
                                                key={item.id}
                                                className="col-12 col-md-6 col-xl-4"
                                            >

                                                <div
                                                    style={{
                                                        background: "#fff",
                                                        borderRadius: 24,
                                                        padding: 20,
                                                        border:
                                                            "1px solid #ececec",
                                                        height: "100%"
                                                    }}
                                                >

                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "flex-start",
                                                            gap: 16,
                                                            marginBottom: 18
                                                        }}
                                                    >

                                                        <div>

                                                            <div
                                                                style={{
                                                                    fontSize: 20,
                                                                    fontWeight: 700,
                                                                    color: "#111827"
                                                                }}
                                                            >
                                                                {item.name}
                                                            </div>

                                                            <div
                                                                style={{
                                                                    marginTop: 6,
                                                                    fontSize: 13,
                                                                    color: "#666"
                                                                }}
                                                            >
                                                                {item.email || "Sin email"}
                                                            </div>

                                                        </div>

                                                        <div
                                                            style={{
                                                                padding: "6px 12px",
                                                                borderRadius: 999,
                                                                background:
                                                                    status.bg,
                                                                color:
                                                                    status.color,
                                                                fontSize: 12,
                                                                fontWeight: 700
                                                            }}
                                                        >
                                                            {status.label}
                                                        </div>

                                                    </div>

                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 10,
                                                            marginBottom: 20
                                                        }}
                                                    >

                                                        <Info
                                                            label="Invitado principal"
                                                            value={item.attendee_name}
                                                        />

                                                        <Info
                                                            label="Mesa"
                                                            value={
                                                                item.table_name
                                                                ||
                                                                "-"
                                                            }
                                                        />

                                                        <Info
                                                            label="Token QR"
                                                            value={
                                                                item.qr_token
                                                                ||
                                                                "-"
                                                            }
                                                        />

                                                        <Info
                                                            label="Teléfono"
                                                            value={
                                                                item.phone
                                                                ||
                                                                "-"
                                                            }
                                                        />

                                                    </div>

                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: 10
                                                        }}
                                                    >

                                                        <button
                                                            className="tags_btn"
                                                            style={{
                                                                flex: 1
                                                            }}
                                                            onClick={() =>
                                                                setSelectedCompanion(item)
                                                            }
                                                        >
                                                            Ver detalle
                                                        </button>

                                                        <button
                                                            className="tags_modal_btn tags_modal_btn_cancel"
                                                            onClick={() =>
                                                                removeCompanion(
                                                                    item.id
                                                                )
                                                            }
                                                        >
                                                            Eliminar
                                                        </button>

                                                    </div>

                                                </div>

                                            </div>

                                        );
                                    })
                                }

                            </div>
                        )
                }

            </div>

            {/* Modal de Ver Detalle */}
            {
                selectedCompanion
                &&
                (
                    <div className="tags_modal_overlay">

                        <div
                            className="tags_modal"
                            style={{
                                maxWidth: 620
                            }}
                        >

                            <div className="tags_modal_header">

                                <h3>
                                    Detalle del acompañante
                                </h3>

                                <button
                                    className="tags_modal_close"
                                    onClick={() =>
                                        setSelectedCompanion(null)
                                    }
                                >
                                    ✕
                                </button>

                            </div>

                            <div className="tags_modal_body">

                                <DetailRow
                                    label="Nombre"
                                    value={selectedCompanion.name}
                                />

                                <DetailRow
                                    label="Email"
                                    value={selectedCompanion.email || "-"}
                                />

                                <DetailRow
                                    label="Teléfono"
                                    value={selectedCompanion.phone || "-"}
                                />

                                <DetailRow
                                    label="Estado"
                                    value={formatCompanionStatus(
                                        selectedCompanion.attendee_status
                                    )}
                                />

                                <DetailRow
                                    label="Invitación"
                                    value={formatInvitationStatus(
                                        selectedCompanion.invitation_status
                                    )}
                                />

                                <DetailRow
                                    label="Relación"
                                    value={formatRelationType(
                                        selectedCompanion.relation_type
                                    )}
                                />

                                <DetailRow
                                    label="Confirmado"
                                    value={formatDate(
                                        selectedCompanion.confirmed_at
                                    )}
                                />

                                <DetailRow
                                    label="Token QR"
                                    value={selectedCompanion.qr_token || "-"}
                                />

                                <DetailRow
                                    label="Notas alimentarias"
                                    value={selectedCompanion.dietary_notes || "-"}
                                />

                                <DetailRow
                                    label="Confirmado"
                                    value={selectedCompanion.confirmed_at || "-"}
                                />

                                <DetailRow
                                    label="Check-in"
                                    value={selectedCompanion.checked_in_at || "-"}
                                />

                            </div>

                            <div className="tags_modal_actions">

                                <button
                                    className="tags_modal_btn tags_modal_btn_cancel"
                                    onClick={() =>
                                        setSelectedCompanion(null)
                                    }
                                >
                                    Cerrar
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

function StatCard({

    title,
    value

}) {

    return (

        <div className="col-6 col-md-3">

            <div
                style={{
                    background: "#fff",
                    border: "1px solid #ececec",
                    borderRadius: 22,
                    padding: 20
                }}
            >

                <div
                    style={{
                        fontSize: 13,
                        color: "#666",
                        marginBottom: 10
                    }}
                >
                    {title}
                </div>

                <div
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: "#111827"
                    }}
                >
                    {value}
                </div>

            </div>

        </div>

    );
}

function Info({

    label,
    value

}) {

    return (

        <div
            style={{
                display: "flex",
                justifyContent: "start",
                gap: 10,
                fontSize: 14
            }}
        >

            <span
                style={{
                    color: "#666"
                }}
            >
                {label}
            </span>

            <strong>
                {value}
            </strong>



        </div>


    );
}

function DetailRow({
    label,
    value
}) {

    return (

        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid #e5e7eb"
            }}
        >

            <span
                style={{
                    color: "#666"
                }}
            >
                {label}
            </span>

            <strong
                style={{
                    textAlign: "left",
                    wordBreak: "break-word"
                }}
            >
                {value}
            </strong>

        </div>
    );
}
function formatCompanionStatus(value) {

    const labels = {
        pending: "Pendiente",
        confirmed: "Confirmado",
        declined: "Rechazado",
        checked_in: "Ingresó",
        cancelled: "Cancelado"
    };

    return labels[value] || "-";
}

function formatInvitationStatus(value) {

    const labels = {
        not_sent: "No enviada",
        sent: "Enviada",
        opened: "Abierta",
        failed: "Fallida"
    };

    return labels[value] || "-";
}

function formatRelationType(value) {

    const labels = {
        partner: "Pareja",
        family: "Familia",
        friend: "Amistad",
        staff: "Staff",
        child: "Menor",
        guest: "Invitado"
    };

    return labels[value] || "-";
}

function formatDate(value) {

    if (!value) return "-";

    try {

        return new Date(value)
            .toLocaleString("es-AR");

    } catch (err) {

        return "-";
    }
}