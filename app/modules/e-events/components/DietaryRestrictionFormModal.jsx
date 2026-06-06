"use client";

import { useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

export default function DietaryRestrictionFormModal({

    session,

    eventId,
    editing,

    onClose,
    onSaved

}) {

    const [loading, setLoading] =
        useState(false);

    const [form, setForm] =
        useState({

            name:
                editing?.name || "",

            slug:
                editing?.slug || "",

            icon:
                editing?.icon || "",

            severity:
                editing?.severity || "preference",

            requires_kitchen_attention:
                Number(
                    editing?.requires_kitchen_attention || 0
                )
        });

    // =========================
    // GLOBAL MODE
    // =========================

    const isGlobalManager =

        session?.role === "admin"
        ||
        session?.role === "event_client";

    // =========================
    // SAVE
    // =========================

    async function save() {

        try {

            setLoading(true);

            // =========================
            // ENDPOINT
            // =========================

            let endpoint = "";

            if (isGlobalManager) {

                endpoint =
                    editing
                        ? "/api/events/globals-dietary-restrictions/update"
                        : "/api/events/globals-dietary-restrictions/create";

            } else {

                endpoint =
                    editing
                        ? "/api/events/dietary-restrictions/update"
                        : "/api/events/dietary-restrictions/create";
            }

            // =========================
            // BODY
            // =========================

            const body = {

                ...form
            };

            // EVENT RESTRICTIONS
            if (!isGlobalManager) {

                body.event_id =
                    Number(eventId);
            }

            // EDITING
            if (editing?.id) {

                body.id =
                    editing.id;
            }

            // =========================
            // REQUEST
            // =========================

            const res =
                await fetch(
                    endpoint,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(body)
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

            onSaved();

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    return (

        <div className="tags_modal_overlay">

            <div
                className="tags_modal_body"
                style={{
                    maxWidth: 650
                }}
            >

                <div className="tags_modal_header">

                    <h3>

                        {
                            editing
                                ? "Editar restricción"
                                : "Nueva restricción"
                        }

                    </h3>

                    <button
                        className="tags_modal_close"
                        onClick={onClose}
                    >
                        ✕
                    </button>

                </div>

                <div className="tags_modal_body">

                    <div className="row g-3">

                        <div className="col-12">

                            <input
                                className="tags_modal_input"
                                placeholder="Nombre"
                                value={form.name}
                                onChange={(e) =>
                                    setForm(prev => ({
                                        ...prev,
                                        name:
                                            e.target.value
                                    }))
                                }
                            />

                        </div>

                        <div className="col-12">

                            <input
                                className="tags_modal_input"
                                placeholder="Slug"
                                value={form.slug}
                                onChange={(e) =>
                                    setForm(prev => ({
                                        ...prev,
                                        slug:
                                            e.target.value
                                    }))
                                }
                            />

                        </div>

                        <div className="col-md-6">

                            <select
                                className="tags_modal_input"
                                value={form.severity}
                                onChange={(e) =>
                                    setForm(prev => ({
                                        ...prev,
                                        severity:
                                            e.target.value
                                    }))
                                }
                            >

                                <option value="preference">
                                    Preference
                                </option>

                                <option value="allergy">
                                    Allergy
                                </option>

                                <option value="critical">
                                    Critical
                                </option>

                            </select>

                        </div>

                        <div className="col-12">

                            <input
                                className="tags_modal_input"
                                placeholder="Icon"
                                value={form.icon}
                                onChange={(e) =>
                                    setForm(prev => ({
                                        ...prev,
                                        icon:
                                            e.target.value
                                    }))
                                }
                            />

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    marginTop: 10
                                }}
                            >

                                <div
                                    style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 14,
                                        background: "#f3f4f6",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 28
                                    }}
                                >
                                    {form.icon || "🍽️"}
                                </div>

                                <div
                                    style={{
                                        fontSize: 13,
                                        color: "#666"
                                    }}
                                >
                                    Preview icono
                                </div>

                            </div>

                        </div>

                        <div className="col-12">

                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10
                                }}
                            >

                                <input
                                    type="checkbox"
                                    checked={
                                        Number(
                                            form.requires_kitchen_attention
                                        ) === 1
                                    }
                                    onChange={(e) =>
                                        setForm(prev => ({
                                            ...prev,
                                            requires_kitchen_attention:
                                                e.target.checked
                                                    ? 1
                                                    : 0
                                        }))
                                    }
                                />

                                Requiere atención de cocina

                            </label>

                        </div>

                    </div>

                </div>

                <div className="tags_modal_footer mt-4">

                    <button
                        className="tags_modal_btn tags_modal_btn_cancel me-2"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        className="tags_btn"
                        onClick={save}
                        disabled={loading}
                    >
                        {
                            loading
                                ? "Guardando..."
                                : "Guardar"
                        }
                    </button>

                </div>

            </div>

        </div>

    );
}