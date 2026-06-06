"use client";

import { useEffect, useState }
    from "react";

import TagsHeader
    from "@/app/components/Header";

import showAlert
    from "@/app/components/showAlert";

import "../../../../styles/tagsModals.css";
import OwnerNavigation from "@/app/modules/e-events/components/OwnerNavigation";
import EventNavigation from "@/app/modules/e-events/components/EventNavigation";
import EventOwnerHeader from "@/app/modules/e-events/components/EventOwnerHeader";

export default function EventAssignedStaffPage({

    session,
    eventId,
    modules

}) {

    const [assigned, setAssigned] =
        useState([]);

    const [available, setAvailable] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    // =========================
    // LOAD
    // =========================

    useEffect(() => {

        if (!eventId) return;

        load();

    }, [eventId]);

    async function load() {

        try {

            setLoading(true);

            const res =
                await fetch(
                    `/api/events/event-staff/list?event_id=${eventId}`,
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
                        "Error cargando staff",
                    icon: "error"
                });

                return;
            }

            setAssigned(
                data.assigned || []
            );

            setAvailable(
                data.available || []
            );

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    // =========================
    // ASSIGN
    // =========================

    async function assignStaff(staffId) {

        try {

            const res =
                await fetch(
                    "/api/events/event-staff/assign",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                event_id:
                                    Number(eventId),

                                staff_id:
                                    staffId
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
    // REMOVE
    // =========================

    async function removeStaff(staffId) {

        try {

            const res =
                await fetch(
                    "/api/events/event-staff/remove",
                    {
                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                event_id:
                                    Number(eventId),

                                staff_id:
                                    staffId
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

        <EventOwnerHeader session={session} />

        <div className="m-0 p-0 pt-4 px-2 px-md-3" >

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

                    alignItems: "center",

                    justifyContent: "space-between",

                    gap: "16px",

                    flexWrap: "wrap",

                    marginBottom: "20px"
                }}
            >

                <div>

                    <div
                        style={{

                            fontSize: "13px",

                            color: "#6b7280",

                            marginBottom: "4px"
                        }}
                    >
                        Gestión de accesos del evento
                    </div>

                    <h2
                        style={{

                            margin: 0,

                            fontSize: "28px",

                            fontWeight: 700,

                            color: "#111"
                        }}
                    >
                        👥 Staff
                    </h2>

                </div>

                <div
                    style={{

                        padding: "10px 14px",

                        borderRadius: "14px",

                        background: "#f7fff4",

                        border: "1px solid #d8f1cf",

                        fontSize: "13px",

                        color: "#3f3f46",

                        fontWeight: 600
                    }}
                >
                    {assigned.length} asignados
                </div>

            </div>

            {/* GRID */}
            <div className="row g-3">

                {/* STAFF ASIGNADO */}
                <div className="col-12 col-xl-6">

                    <div
                        style={{

                            background: "#f9fcf9",

                            border: "1px solid #ececec",

                            borderRadius: "22px",

                            overflow: "hidden",

                            boxShadow:
                                "0 2px 10px rgba(0,0,0,.03)"
                        }}
                    >

                        {/* TOP */}
                        <div
                            style={{

                                padding: "18px 20px",

                                borderBottom: "1px solid #f1f1f1",

                                display: "flex",

                                alignItems: "center",

                                justifyContent: "space-between"
                            }}
                        >

                            <div>

                                <div
                                    style={{

                                        fontSize: "17px",

                                        fontWeight: 700,

                                        color: "#111"
                                    }}
                                >
                                    Staff asignado
                                </div>

                                <div
                                    style={{

                                        fontSize: "12px",

                                        color: "#6b7280",

                                        marginTop: "2px"
                                    }}
                                >
                                    Usuarios con acceso
                                </div>

                            </div>

                        </div>

                        {/* EMPTY */}
                        {assigned.length === 0 && (

                            <div
                                style={{

                                    padding: "40px 20px",

                                    textAlign: "center",

                                    color: "#6b7280",

                                    fontSize: "14px"
                                }}
                            >
                                No hay staff asignado
                            </div>

                        )}

                        {/* LIST */}
                        <div
                            style={{
                                padding: "4px 20px"
                            }}
                        >

                            {assigned.map(item => (

                                <div
                                    key={item.id}

                                    style={{

                                        display: "flex",

                                        alignItems: "center",

                                        justifyContent: "space-between",

                                        gap: "14px",

                                        padding: "14px 0",

                                        borderBottom:
                                            "1px solid #f5f5f5"
                                    }}
                                >

                                    <div
                                        style={{

                                            display: "flex",

                                            alignItems: "center",

                                            gap: "12px",

                                            minWidth: 0
                                        }}
                                    >

                                        {/* AVATAR */}
                                        <div
                                            style={{

                                                width: "42px",

                                                height: "42px",

                                                borderRadius: "14px",

                                                background: "#f7fff4",

                                                border:
                                                    "1px solid #dff3d8",

                                                display: "flex",

                                                alignItems: "center",

                                                justifyContent: "center",

                                                fontSize: "16px",

                                                flexShrink: 0
                                            }}
                                        >
                                            👤
                                        </div>

                                        {/* INFO */}
                                        <div
                                            style={{
                                                minWidth: 0
                                            }}
                                        >

                                            <div
                                                style={{

                                                    fontSize: "14px",

                                                    fontWeight: 600,

                                                    color: "#111",

                                                    overflow: "hidden",

                                                    textOverflow: "ellipsis",

                                                    whiteSpace: "nowrap"
                                                }}
                                            >
                                                {item.name}
                                            </div>

                                            <div
                                                style={{

                                                    fontSize: "12px",

                                                    color: "#6b7280",

                                                    marginTop: "2px"
                                                }}
                                            >
                                                {item.role}
                                            </div>

                                        </div>

                                    </div>

                                    {/* REMOVE */}
                                    <button
                                        onClick={() =>
                                            removeStaff(item.id)
                                        }

                                        style={{

                                            border: "none",

                                            background: "#b1f9bf",

                                            color: "#50aa5c",

                                            width: "36px",

                                            height: "36px",

                                            borderRadius: "12px",

                                            cursor: "pointer",

                                            flexShrink: 0
                                        }}
                                    >
                                        ✕
                                    </button>

                                </div>

                            ))}

                        </div>

                    </div>

                </div>

                {/* STAFF DISPONIBLE */}
                <div className="col-12 col-xl-6">

                    <div
                        style={{

                            background: "#fff",

                            border: "1px solid #ececec",

                            borderRadius: "22px",

                            overflow: "hidden",

                            boxShadow:
                                "0 2px 10px rgba(0,0,0,.03)"
                        }}
                    >

                        {/* TOP */}
                        <div
                            style={{

                                padding: "18px 20px",

                                borderBottom: "1px solid #f1f1f1",

                                display: "flex",

                                alignItems: "center",

                                justifyContent: "space-between"
                            }}
                        >

                            <div>

                                <div
                                    style={{

                                        fontSize: "17px",

                                        fontWeight: 700,

                                        color: "#111"
                                    }}
                                >
                                    Agregar staff
                                </div>

                                <div
                                    style={{

                                        fontSize: "12px",

                                        color: "#6b7280",

                                        marginTop: "2px"
                                    }}
                                >
                                    Personal disponible
                                </div>

                            </div>

                        </div>

                        {/* EMPTY */}
                        {available.length === 0 && (

                            <div
                                style={{

                                    padding: "40px 20px",

                                    textAlign: "center",

                                    color: "#6b7280",

                                    fontSize: "14px"
                                }}
                            >
                                No hay más personal disponible
                            </div>

                        )}

                        {/* LIST */}
                        <div
                            style={{
                                padding: "4px 20px"
                            }}
                        >

                            {available.map(item => (

                                <div
                                    key={item.id}

                                    style={{

                                        display: "flex",

                                        alignItems: "center",

                                        justifyContent: "space-between",

                                        gap: "14px",

                                        padding: "14px 0",

                                        borderBottom:
                                            "1px solid #f5f5f5"
                                    }}
                                >

                                    <div
                                        style={{

                                            display: "flex",

                                            alignItems: "center",

                                            gap: "12px",

                                            minWidth: 0
                                        }}
                                    >

                                        {/* AVATAR */}
                                        <div
                                            style={{

                                                width: "42px",

                                                height: "42px",

                                                borderRadius: "14px",

                                                background: "#f7fff4",

                                                border:
                                                    "1px solid #dff3d8",

                                                display: "flex",

                                                alignItems: "center",

                                                justifyContent: "center",

                                                fontSize: "16px",

                                                flexShrink: 0
                                            }}
                                        >
                                            👤
                                        </div>

                                        {/* INFO */}
                                        <div
                                            style={{
                                                minWidth: 0
                                            }}
                                        >

                                            <div
                                                style={{

                                                    fontSize: "14px",

                                                    fontWeight: 600,

                                                    color: "#111",

                                                    overflow: "hidden",

                                                    textOverflow: "ellipsis",

                                                    whiteSpace: "nowrap"
                                                }}
                                            >
                                                {item.name}
                                            </div>

                                            <div
                                                style={{

                                                    fontSize: "12px",

                                                    color: "#6b7280",

                                                    marginTop: "2px"
                                                }}
                                            >
                                                {item.role}
                                            </div>

                                        </div>

                                    </div>

                                    {/* ADD */}
                                    <button
                                        onClick={() =>
                                            assignStaff(item.id)
                                        }
                                        className="tags_btn primary"

                                        /* style={{

                                            border: "none",

                                            background: "#50aa5c",

                                            color: "#fff",

                                            padding: "10px 14px",

                                            borderRadius: "12px",

                                            fontSize: "12px",

                                            fontWeight: 600,

                                            cursor: "pointer",

                                            flexShrink: 0
                                        }} */
                                    >
                                        ✚ Asignar
                                    </button>

                                </div>

                            ))}

                        </div>

                    </div>

                </div>

            </div>

        </div>
        <div  style={{minHeight:"200px"}}>

        </div>

    </div>
);
}