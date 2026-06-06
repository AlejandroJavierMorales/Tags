"use client";

import { useEffect, useState } from "react";

import {
    FiAlertCircle,
    FiCheck,
    FiX
} from "react-icons/fi";

import showAlert
    from "@/app/components/showAlert";

export default function AttendeeDietarySection({

    attendee,
    form,
    setForm,
    onUpdated

}) {

    const [restrictions, setRestrictions] =
        useState([]);

    const [selectedRestrictions, setSelectedRestrictions] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    // =========================
    // LOAD
    // =========================

    useEffect(() => {

        if (!attendee) return;

        loadRestrictions();
        /* loadAttendeeRestrictions(); */
        setSelectedRestrictions(

            attendee.attendee_dietary_restrictions
                ?.map(item => item.id)
            || []
        );

    }, [attendee]);

    async function loadRestrictions() {

        try {

            const res =
                await fetch(
                    `/api/events/dietary-restrictions/list?event_id=${attendee.event_id}`
                );

            const data =
                await res.json();

            if (!res.ok) return;

            setRestrictions(
                data.data || []
            );

        } catch (err) {

            console.log(err);
        }
    }

    /* async function loadAttendeeRestrictions() {

        try {

            const res =
                await fetch(
                    `/api/events/attendee-dietary-relations/get?attendee_id=${attendee.id}`
                );

            const data =
                await res.json();

            if (!res.ok) return;

            setSelectedRestrictions(
                data.restrictions || []
            );

        } catch (err) {

            console.log(err);
        }
    } */

    // =========================
    // TOGGLE
    // =========================

    function toggleRestriction(id) {

        setSelectedRestrictions(prev => {

            if (prev.includes(id)) {

                return prev.filter(
                    item => item !== id
                );
            }

            return [
                ...prev,
                id
            ];
        });
    }

    // =========================
    // SAVE
    // =========================

    async function saveRestrictions() {

        try {

            setLoading(true);

            const res =
                await fetch(
                    "/api/events/attendee-dietary-relations/save",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                attendee_id:
                                    attendee.id,

                                restrictions:
                                    selectedRestrictions,

                                dietary_notes:
                                    form.dietary_notes,

                                custom_dietary_notes:
                                    form.custom_dietary_notes || ""
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
                        "No se pudo guardar",

                    icon: "error"
                });

                return;
            }

            showAlert({

                title: "Actualizado",

                text:
                    "Restricciones guardadas correctamente",

                icon: "success"
            });

            onUpdated?.();

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

    return (

        <>

            {/* RESTRICCIONES */}
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10
                }}
            >

                {
                    restrictions.map(item => {

                        const active =
                            selectedRestrictions.includes(
                                item.id
                            );

                        return (

                            <button
                                key={item.id}
                                type="button"
                                onClick={() =>
                                    toggleRestriction(item.id)
                                }
                                style={{
                                    border: "none",
                                    borderRadius: 999,
                                    padding: "10px 14px",
                                    cursor: "pointer",

                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,

                                    transition: ".15s",

                                    background:
                                        active
                                            ? item.color || "#111827"
                                            : "#f3f4f6",

                                    color:
                                        active
                                            ? "#fff"
                                            : "#374151",

                                    fontSize: 13,
                                    fontWeight: 600
                                }}
                            >

                                {
                                    active
                                        ? <FiCheck size={14} />
                                        : <FiAlertCircle size={14} />
                                }

                                {item.name}

                            </button>
                        );
                    })
                }

            </div>

            {/* SNAPSHOT */}
            <div style={{ marginTop: 18 }}>

                <div
                    style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 6,
                        fontWeight: 500
                    }}
                >
                    Snapshot textual
                </div>

                <textarea
                    rows={3}
                    className="form-control tags_text_normal"
                    placeholder="Ej: Vegano, Celíaco, Sin cebolla"
                    value={form.dietary_notes || ""}
                    onChange={e =>
                        setForm({

                            ...form,

                            dietary_notes:
                                e.target.value
                        })
                    }
                />

            </div>

            {/* CUSTOM */}
            <div style={{ marginTop: 14 }}>

                <div
                    style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 6,
                        fontWeight: 500
                    }}
                >
                    Notas específicas para cocina
                </div>

                <textarea
                    rows={3}
                    className="form-control tags_text_normal"
                    placeholder="Ej: Sin cebolla, alergia severa al maní, etc."
                    value={
                        form.custom_dietary_notes || ""
                    }
                    onChange={e =>
                        setForm({

                            ...form,

                            custom_dietary_notes:
                                e.target.value
                        })
                    }
                />

            </div>

            {/* SAVE */}
            <button
                type="button"
                onClick={saveRestrictions}
                disabled={loading}
                className="tags_btn"
                style={{
                    marginTop: 18
                }}
            >

                {
                    loading
                        ? "Guardando..."
                        : "Guardar restricciones"
                }

            </button>

        </>
    );
}