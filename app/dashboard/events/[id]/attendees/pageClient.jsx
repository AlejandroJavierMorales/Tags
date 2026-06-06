"use client";

import { useEffect, useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

import "../../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";
import QRDownloadModal from "@/app/components/QRDownloadModal";
import { FiDownload, FiUsers, FiAlertCircle } from "react-icons/fi";
import EventAttendeeDrawer from "@/app/modules/e-events/components/EventAttendeeDrawer";
import { useRouter } from "next/navigation";




export default function EventAttendeesPageClient({

    session,
    eventId,
    modules

}) {



    const [filters, setFilters] =
        useState({

            search: "",

            status: "",

            invitation_status: "",
        });
    const [selectedAttendee, setSelectedAttendee] =
        useState(null);

    const [showDrawer, setShowDrawer] =
        useState(false);
    const [attendees, setAttendees] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [showModal, setShowModal] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [editing, setEditing] =
        useState(null);

    const [selectedQr, setSelectedQr] =
        useState(null);

    const [showQrModal, setShowQrModal] = useState(false);
    const router = useRouter();
    const [form, setForm] =
        useState({

            name: "",
            email: "",
            phone: "",
            status: "pending"
        });

    // =========================
    // LOAD
    // =========================

    useEffect(() => {

        if (!eventId) return;

        load();

    }, [eventId, filters]);

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

            if (filters.status) {

                params.append(
                    "status",
                    filters.status
                );
            }

            if (filters.invitation_status) {

                params.append(
                    "invitation_status",
                    filters.invitation_status
                );
            }

            if (filters.qr_code) {

                params.append(
                    "qr_code",
                    filters.qr_code
                );
            }

            if (filters.email) {

                params.append(
                    "email",
                    filters.email
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

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "Error cargando invitados",

                    icon: "error"
                });

                return;
            }

            setAttendees(
                data.data || []
            );

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    // =========================
    // CREATE
    // =========================

    function openCreate() {

        setEditing(null);

        setForm({

            name: "",
            email: "",
            phone: "",
            status: "pending"
        });

        setShowModal(true);
    }

    // =========================
    // EDIT
    // =========================

    function openEdit(item) {

        setEditing(item);

        setForm({

            name:
                item.name || "",

            email:
                item.email || "",

            phone:
                item.phone || "",

            status:
                item.status || "pending"
        });

        setShowModal(true);
    }

    // =========================
    // SAVE
    // =========================

    async function save() {

        try {

            if (!form.name) {

                showAlert({

                    title: "Error",

                    text:
                        "Ingresá el nombre",

                    icon: "error"
                });

                return;
            }

            setSaving(true);

            const endpoint =
                editing
                    ? "/api/events/attendees/update"
                    : "/api/events/attendees/create";

            const method =
                editing
                    ? "PUT"
                    : "POST";

            const payload = {

                ...form,

                event_id:
                    Number(eventId)
            };

            if (editing) {

                payload.id =
                    editing.id;
            }

            const res =
                await fetch(
                    endpoint,
                    {

                        method,

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(payload)
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

            setShowModal(false);

            load();

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    // =========================
    // DELETE
    // =========================

    async function removeAttendee(id) {

        const confirmDelete =
            window.confirm(
                "¿Eliminar invitado?"
            );

        if (!confirmDelete) return;

        try {

            const res =
                await fetch(
                    "/api/events/attendees/delete",
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
    // OPEN QR
    // =========================

    function openQr(item) {

        setSelectedQr({

            code:
                item.qr_code,

            label:
                item.name,

            attendee_id:
                item.id,

            event_id:
                eventId
        });

        setShowQrModal(true);
    }

    function openDetails(item) {

        setSelectedAttendee(item);

        setShowDrawer(true);
    }

    async function deleteAttendee(id) {

        const confirm =
            await showAlert({

                title:
                    "Eliminar Invitado?",

                text:
                    "Esta acción no se puede deshacer",

                icon: "warning",

                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const res =
                await fetch(
                    "/api/events/attendees/delete",
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

            showAlert({

                title: "OK",

                text:
                    "Invitado Eliminado eliminado",

                icon: "success"
            });

            load();

        } catch (err) {

            console.log(err);
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
                        marginBottom: "24px"
                    }}
                >

                    <div>

                        <h2>
                            🎟️ Invitados
                        </h2>

                        <p>
                            Administración de invitados del evento.
                        </p>

                    </div>

                    <button
                        className="tags_btn"
                        onClick={openCreate}
                    >
                        ✚ Nuevo Invitado
                    </button>

                </div>

                {/* FILTERS */}
                <div className="row g-2 mb-4 tags_text_normal">

                    <div className="col-sm-7 col-md-6">

                        <input
                            className="tags_modal_input"
                            placeholder="Buscar invitado"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    search: e.target.value
                                }))
                            }
                        />

                    </div>

                    <div className="col-6 col-md-3">

                        <select
                            className="tags_modal_input"
                            value={filters.status}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    status: e.target.value
                                }))
                            }
                        >

                            <option value="">
                                Estado asistencia
                            </option>

                            <option value="pending">
                                Pendiente
                            </option>

                            <option value="confirmed">
                                Confirmado
                            </option>

                            <option value="declined">
                                Rechazado
                            </option>

                            <option value="checked_in">
                                Check-In
                            </option>

                            <option value="cancelled">
                                Cancelado
                            </option>

                        </select>

                    </div>

                    <div className="col-6 col-md-3">

                        <select
                            className="tags_modal_input"
                            value={filters.invitation_status}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    invitation_status:
                                        e.target.value
                                }))
                            }
                        >

                            <option value="">
                                Invitación
                            </option>

                            <option value="not_sent">
                                No enviada
                            </option>

                            <option value="sent">
                                Enviada
                            </option>

                            <option value="opened">
                                Abierta
                            </option>

                            <option value="failed">
                                Fallida
                            </option>

                        </select>

                    </div>


                </div>

                {/* TABLE */}
                <div className="table-responsive">

                    <table className="tags_table tags_text_normal">

                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Estado</th>
                                <th>Invitación</th>
                                <th>Acompañantes</th>
                                <th>Restricciones 🥗</th>
                                <th>QR</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>

                            {attendees.map(item => (

                                <tr
                                    key={item.id}
                                    onClick={() => openDetails(item)}
                                    style={{
                                        cursor: "pointer"
                                    }}
                                >

                                    <td>
                                        <strong>{item.name}</strong>
                                    </td>

                                    <td>
                                        {item.email || "-"}
                                    </td>

                                    <td>
                                        {item.phone || "-"}
                                    </td>

                                    <td>

                                        <span className="tags_badge">
                                            {item.status}
                                        </span>

                                    </td>
                                    <td>

                                        <span className="tags_badge">
                                            {item.invitation_status}
                                        </span>

                                    </td>
                                    <td>

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px"
                                            }}
                                        >

                                            <span className="tags_badge_warning">
                                                {item.plus_ones_allowed}
                                            </span>

                                            <button
                                                title="Ver acompañantes"
                                                onClick={(e) => {

                                                    e.stopPropagation();

                                                    router.push(
                                                        `/dashboard/events/${eventId}/companions?attendee_id=${item.id}`
                                                    );
                                                }}
                                                className="icon_btn"
                                            >
                                                <FiUsers />
                                            </button>
                                        </div>

                                    </td>

                                    <td>

                                        <button
                                            title="Restricciones alimentarias"
                                            onClick={(e) => {

                                                e.stopPropagation();

                                                router.push(
                                                    `/dashboard/events/${eventId}/dietary-restrictions`
                                                );
                                            }}
                                            className="icon_btn"
                                            style={{

                                                border:
                                                    item.attendee_dietary_restrictions?.length
                                                        ? "2px solid #dc2626"
                                                        : "1px solid #e5e7eb",

                                                background:
                                                    item.attendee_dietary_restrictions?.length
                                                        ? "#fef2f2"
                                                        : "#fff",

                                                position: "relative"
                                            }}
                                        >

                                            <FiAlertCircle
                                                color={
                                                    item.attendee_dietary_restrictions?.length
                                                        ? "#dc2626"
                                                        : "#666"
                                                }
                                            />

                                            {
                                                item.attendee_dietary_restrictions?.length > 0
                                                &&
                                                (
                                                    <span
                                                        style={{
                                                            position: "absolute",
                                                            top: -6,
                                                            right: -6,
                                                            background: "#dc2626",
                                                            color: "#fff",
                                                            borderRadius: 999,
                                                            fontSize: 10,
                                                            minWidth: 18,
                                                            height: 18,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: "0 4px",
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {
                                                            item.attendee_dietary_restrictions.length
                                                        }
                                                    </span>
                                                )
                                            }

                                        </button>

                                    </td>


                                    <td>

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px"
                                            }}
                                        >

                                            <span className="tags_badge_warning">
                                                {item.qr_code}
                                            </span>

                                            <button
                                                title="Descargar QR"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEdit(item)
                                                    openQr(item)
                                                }
                                                }
                                                className="icon_btn "
                                            >
                                                <FiDownload />
                                            </button>

                                        </div>

                                    </td>

                                    <td>

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "10px"
                                            }}
                                        >

                                            <button
                                                className="icon_btn success"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEdit(item)
                                                }

                                                }
                                            >
                                                ✏️
                                            </button>

                                            <button
                                                className="icon_btn danger"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteAttendee(item.id)
                                                }

                                                }
                                            >
                                                🗑
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* MODAL */}
            {
                showModal
                &&
                (

                    <div className="tags_modal_overlay">

                        <div
                            className="tags_modal"
                            style={{
                                maxWidth: "520px"
                            }}
                        >

                            <div
                                className="tags_modal_header"
                            >

                                <h3>

                                    {
                                        editing
                                            ? "Editar invitado"
                                            : "Nuevo invitado"
                                    }

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

                            <div
                                className="tags_modal_body"
                            >

                                <div className="mb-3">

                                    <label>
                                        Nombre
                                    </label>

                                    <input

                                        type="text"

                                        className="form-control"

                                        value={form.name}

                                        onChange={e =>
                                            setForm({

                                                ...form,

                                                name:
                                                    e.target.value
                                            })
                                        }
                                    />

                                </div>

                                <div className="mb-3">

                                    <label>
                                        Email
                                    </label>

                                    <input

                                        type="email"

                                        className="form-control"

                                        value={form.email}

                                        onChange={e =>
                                            setForm({

                                                ...form,

                                                email:
                                                    e.target.value
                                            })
                                        }
                                    />

                                </div>

                                <div className="mb-3">

                                    <label>
                                        Teléfono
                                    </label>

                                    <input

                                        type="text"

                                        className="form-control"

                                        value={form.phone}

                                        onChange={e =>
                                            setForm({

                                                ...form,

                                                phone:
                                                    e.target.value
                                            })
                                        }
                                    />

                                </div>

                                <div className="mb-3">

                                    <label>
                                        Estado
                                    </label>

                                    <select

                                        className="form-select"

                                        value={form.status}

                                        onChange={e =>
                                            setForm({

                                                ...form,

                                                status:
                                                    e.target.value
                                            })
                                        }
                                    >

                                        <option value="pending">
                                            Pendiente
                                        </option>

                                        <option value="confirmed">
                                            Confirmado
                                        </option>

                                        <option value="declined">
                                            Rechazado
                                        </option>

                                        <option value="checked_in">
                                            Check-In
                                        </option>

                                        <option value="cancelled">
                                            Cancelado
                                        </option>

                                    </select>

                                </div>

                            </div>

                            <div
                                className="tags_modal_actions"
                            >
                                <button

                                    onClick={() =>
                                        setShowModal(false)
                                    }

                                    className="tags_modal_btn tags_modal_btn_cancel"
                                >
                                    ✖ Cancelar
                                </button>

                                <button

                                    onClick={save}

                                    disabled={saving}

                                    className="tags_btn"
                                >
                                    {
                                        saving
                                            ? "Guardando..."
                                            : (
                                                editing
                                                    ? "Guardar cambios"
                                                    : "Crear invitado"
                                            )
                                    }
                                </button>

                            </div>

                        </div>

                    </div>

                )
            }

            {/* QR MODAL */}
            <QRDownloadModal
                isOpen={showQrModal}
                onClose={() =>
                    setShowQrModal(false)
                }
                qr={selectedQr}
            />
            <EventAttendeeDrawer
                attendee={selectedAttendee}
                isOpen={showDrawer}
                onClose={() =>
                    setShowDrawer(false)
                }
                onDownloadQr={openQr}
                onUpdated={load}
            />
            <div
                style={{
                    minHeight: "200px"
                }}
            />

        </div>

    );
}