// ========================================
// /events/[id]/tables/pageClient.jsx
// ========================================

"use client";

import { useEffect, useMemo, useState }
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

export default function EventTablesPageClient({

    session,
    eventId,
    modules

}) {

    const [tables, setTables] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [editing, setEditing] =
        useState(null);

    const [showModal, setShowModal] =
        useState(false);

    const [filters, setFilters] =
        useState({

            search: "",
            table_type: ""
        });

    const [form, setForm] =
        useState({

            name: "",
            description: "",
            capacity: 10,
            table_type: "general"
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

            if (filters.table_type) {

                params.append(
                    "table_type",
                    filters.table_type
                );
            }

            const res =
                await fetch(
                    `/api/events/tables/list?${params.toString()}`,
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
                        "Error cargando mesas",

                    icon: "error"
                });

                return;
            }

            setTables(
                data.data || []
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

            let totalCapacity = 0;
            let totalReserved = 0;

            for (const t of tables) {

                totalCapacity +=
                    Number(t.capacity || 0);

                totalReserved +=
                    Number(t.seats_reserved || 0);
            }

            return {

                tables:
                    tables.length,

                totalCapacity,

                totalReserved,

                available:
                    totalCapacity - totalReserved
            };

        }, [tables]);

    // =========================
    // CREATE
    // =========================

    function openCreate() {

        setEditing(null);

        setForm({

            name: "",
            description: "",
            capacity: 10,
            table_type: "general"
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

            description:
                item.description || "",

            capacity:
                item.capacity || 10,

            table_type:
                item.table_type || "general"
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
                        "Ingresá un nombre",

                    icon: "error"
                });

                return;
            }

            setSaving(true);

            const endpoint =
                editing
                    ? "/api/events/tables/update"
                    : "/api/events/tables/create";

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
                        data.error ||
                        "Error guardando",

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

    async function removeTable(id) {

        const confirm =
            await showAlert({

                title:
                    "Eliminar mesa?",

                text:
                    "Esta acción no se puede deshacer",

                icon: "warning",

                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const res =
                await fetch(
                    "/api/events/tables/delete",
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
                            🍽️ Mesas
                        </h2>

                        <p>
                            Administración de mesas y ocupación.
                        </p>

                    </div>

                    <button
                        className="tags_btn"
                        onClick={openCreate}
                    >
                        ✚ Nueva Mesa
                    </button>

                </div>

                {/* STATS */}
                <div className="row g-3 mb-4">

                    <StatCard
                        title="Mesas"
                        value={stats.tables}
                    />

                    <StatCard
                        title="Capacidad"
                        value={stats.totalCapacity}
                    />

                    <StatCard
                        title="Ocupados"
                        value={stats.totalReserved}
                    />

                    <StatCard
                        title="Disponibles"
                        value={stats.available}
                    />

                </div>

                {/* FILTERS */}
                <div className="row g-2 mb-4 tags_text_normal">

                    <div className="col-md-8">

                        <input
                            className="tags_modal_input"
                            placeholder="Buscar mesa"
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
                            value={filters.table_type}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    table_type:
                                        e.target.value
                                }))
                            }
                        >

                            <option value="">
                                Tipo de mesa
                            </option>

                            <option value="general">
                                General
                            </option>

                            <option value="vip">
                                VIP
                            </option>

                            <option value="family">
                                Family
                            </option>

                            <option value="staff">
                                Staff
                            </option>

                            <option value="press">
                                Press
                            </option>

                            <option value="artists">
                                Artists
                            </option>

                            <option value="production">
                                Production
                            </option>

                        </select>

                    </div>

                </div>

                {/* TABLES */}
                {
                    loading
                        ? (
                            <div>
                                Cargando...
                            </div>
                        )
                        : (
                            <div className="row g-3">

                                {
                                    tables.map(item => (

                                        <div
                                            key={item.id}
                                            className="col-12 col-md-6 col-xl-4"
                                        >

                                            <div
                                                style={{
                                                    background: "#fff",
                                                    borderRadius: 24,
                                                    padding: 20,
                                                    border: "1px solid #ececec",
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
                                                                marginTop: 8
                                                            }}
                                                        >

                                                            <span className="tags_badge">
                                                                {item.table_type}
                                                            </span>

                                                        </div>

                                                    </div>

                                                    <div
                                                        style={{
                                                            textAlign: "right"
                                                        }}
                                                    >

                                                        <div
                                                            style={{
                                                                fontSize: 28,
                                                                fontWeight: 700,
                                                                color: "#111827"
                                                            }}
                                                        >
                                                            {item.seats_reserved}
                                                            /
                                                            {item.capacity}
                                                        </div>

                                                        <div
                                                            style={{
                                                                fontSize: 12,
                                                                color: "#666"
                                                            }}
                                                        >
                                                            ocupados
                                                        </div>

                                                    </div>

                                                </div>

                                                <div
                                                    style={{
                                                        marginBottom: 18
                                                    }}
                                                >

                                                    <div
                                                        style={{
                                                            height: 10,
                                                            background: "#eee",
                                                            borderRadius: 999,
                                                            overflow: "hidden"
                                                        }}
                                                    >

                                                        <div
                                                            style={{
                                                                width: `${Math.min(
                                                                    (
                                                                        item.seats_reserved
                                                                        /
                                                                        item.capacity
                                                                    ) * 100,
                                                                    100
                                                                )}%`,
                                                                height: "100%",
                                                                background:
                                                                    "#111827"
                                                            }}
                                                        />

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
                                                        label="Disponibles"
                                                        value={item.available_seats}
                                                    />

                                                    <Info
                                                        label="Invitados"
                                                        value={item.attendees_count}
                                                    />

                                                </div>

                                                {
                                                    item.attendees?.length > 0
                                                    &&
                                                    (
                                                        <div
                                                            style={{
                                                                marginBottom: 18
                                                            }}
                                                        >

                                                            <div
                                                                style={{
                                                                    fontSize: 13,
                                                                    fontWeight: 600,
                                                                    marginBottom: 10
                                                                }}
                                                            >
                                                                Invitados
                                                            </div>

                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    gap: 8
                                                                }}
                                                            >

                                                                {
                                                                    item.attendees
                                                                        .slice(0, 4)
                                                                        .map(a => (

                                                                            <div
                                                                                key={a.id}
                                                                                style={{
                                                                                    fontSize: 13,
                                                                                    color: "#444"
                                                                                }}
                                                                            >
                                                                                • {a.name}
                                                                            </div>

                                                                        ))
                                                                }

                                                            </div>

                                                        </div>
                                                    )
                                                }

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
                                                            openEdit(item)
                                                        }
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        className="tags_modal_btn tags_modal_btn_cancel"
                                                        onClick={() =>
                                                            removeTable(item.id)
                                                        }
                                                    >
                                                        Eliminar
                                                    </button>

                                                </div>

                                            </div>

                                        </div>

                                    ))
                                }

                            </div>
                        )
                }

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
                                maxWidth: 560
                            }}
                        >

                            <div
                                className="tags_modal_header"
                            >

                                <h3>

                                    {
                                        editing
                                            ? "Editar mesa"
                                            : "Nueva mesa"
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

                            <div className="tags_modal_body">

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
                                        Descripción
                                    </label>

                                    <textarea
                                        rows={3}
                                        className="form-control"
                                        value={form.description}
                                        onChange={e =>
                                            setForm({

                                                ...form,

                                                description:
                                                    e.target.value
                                            })
                                        }
                                    />

                                </div>

                                <div className="row">

                                    <div className="col-md-6 mb-3">

                                        <label>
                                            Capacidad
                                        </label>

                                        <input
                                            type="number"
                                            className="form-control"
                                            value={form.capacity}
                                            onChange={e =>
                                                setForm({

                                                    ...form,

                                                    capacity:
                                                        e.target.value
                                                })
                                            }
                                        />

                                    </div>

                                    <div className="col-md-6 mb-3">

                                        <label>
                                            Tipo
                                        </label>

                                        <select
                                            className="form-select"
                                            value={form.table_type}
                                            onChange={e =>
                                                setForm({

                                                    ...form,

                                                    table_type:
                                                        e.target.value
                                                })
                                            }
                                        >

                                            <option value="general">
                                                General
                                            </option>

                                            <option value="vip">
                                                VIP
                                            </option>

                                            <option value="family">
                                                Family
                                            </option>

                                            <option value="staff">
                                                Staff
                                            </option>

                                            <option value="press">
                                                Press
                                            </option>

                                            <option value="artists">
                                                Artists
                                            </option>

                                            <option value="production">
                                                Production
                                            </option>

                                        </select>

                                    </div>

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
                                                    : "Crear mesa"
                                            )
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
                justifyContent: "space-between",
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