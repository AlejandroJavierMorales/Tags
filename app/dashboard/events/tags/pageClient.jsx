// ========================================
// /events/tags/pageClient.jsx
// ========================================

"use client";

import { useEffect, useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

import "../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";

import {
    FiTag,
    FiPlus,
    FiTrash2,
    FiRefreshCw
} from "react-icons/fi";
import TagsSpinner from "@/app/components/TagsSpinner";

export default function EventTagsPageClient({

    session,
    staffPermissions

}) {

    // =========================
    // STATES
    // =========================

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [tags, setTags] =
        useState([]);

    const [form, setForm] =
        useState({

            name: "",

            color: "#111827"
        });

    // =========================
    // LOAD
    // =========================

    useEffect(() => {

        loadTags();

    }, []);

    async function loadTags() {

        try {

            setLoading(true);

            const res =
                await fetch(
                    "/api/events/tags/list",
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
                        "No se pudieron cargar las tags",

                    icon: "error"
                });

                return;
            }

            setTags(
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

    async function createTag() {

        try {

            if (!form.name.trim()) {

                showAlert({

                    title: "Nombre requerido",

                    text:
                        "Ingresá un nombre para la tag",

                    icon: "warning"
                });

                return;
            }

            setSaving(true);


            const res =
                await fetch(
                    "/api/events/tags/create",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                name:
                                    form.name,

                                color:
                                    form.color
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
                        "No se pudo crear la tag",

                    icon: "error"
                });

                return;
            }

            setForm({

                name: "",

                color: "#111827"
            });

            loadTags();

            showAlert({

                title: "Tag creada",

                text:
                    "La tag fue creada correctamente",

                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    // =========================
    // DELETE
    // =========================

    async function deleteTag(tag) {

        try {

            const confirmed =
                await showAlert({

                    title:
                        "Eliminar tag",

                    text:
                        `¿Eliminar "${tag.name}"?`,

                    icon:
                        "warning",

                    showCancelButton:
                        true
                });

            if (!confirmed.isConfirmed)
                return;

            const res =
                await fetch(
                    "/api/events/tags/delete",
                    {

                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                id: tag.id
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

            loadTags();

            showAlert({

                title: "Tag eliminada",

                text:
                    "La tag fue eliminada correctamente",

                icon: "success"
            });

        } catch (err) {

            console.log(err);
        }
    }

    // =========================
    // UI
    // =========================

    return (

        <div className="container-fluid tags_container m-0 p-0">

            <EventOwnerHeader
                session={session}
            />

            <div className="p-2">

                <OwnerNavigation
                    session={session}
                />

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">

                    <div>

                        <h2 className="tags_title mb-1">
                            🏷 Tarjetas/Pases Globales
                        </h2>

                        <div className="opacity-75">

                            Organizá invitados mediante
                            categorías reutilizables para
                            todos los eventos.

                        </div>

                    </div>

                    {/* <button
                        className="tags_btn"
                        onClick={loadTags}
                    >

                        <FiRefreshCw />

                        Recargar

                    </button> */}

                </div>

                {/* CREATE */}
                <div
                    style={{
                        background:
                            "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)",
                        borderRadius: 22,
                        padding: 20,
                        border:
                            "1px solid #d9f7cd",
                        marginBottom: 24
                    }}
                >

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "1fr 140px auto",
                            gap: 14
                        }}
                    >

                        <input
                            type="text"
                            className="form-control tags_text_normal"
                            placeholder="Ej: VIP, Familia, Prensa..."
                            value={form.name}
                            onChange={e =>
                                setForm({

                                    ...form,

                                    name:
                                        e.target.value
                                })
                            }
                        />

                        <input
                            type="color"
                            className="form-control form-control-color"
                            value={form.color}
                            onChange={e =>
                                setForm({

                                    ...form,

                                    color:
                                        e.target.value
                                })
                            }
                        />

                        <button
                            onClick={createTag}
                            disabled={saving}
                            className="tags_btn"
                            style={{minWidth:"100px"}}
                        >

                            ✚ Crear

                        </button>

                    </div>

                </div>

                {/* TAGS */}
                {
                    loading ? (

                        <div
                            style={{
                                padding: 30,
                                textAlign: "center",
                                color: "#6b7280"
                            }}
                        >
                            <TagsSpinner/>
                        </div>

                    ) : tags.length === 0 ? (

                        <div
                            style={{
                                background: "#fff",
                                borderRadius: 20,
                                border:
                                    "1px solid #ececec",
                                padding: 40,
                                textAlign: "center",
                                color: "#6b7280"
                            }}
                        >

                            <FiTag
                                size={42}
                                style={{
                                    marginBottom: 12
                                }}
                            />

                            <div>
                                No hay tags creadas
                            </div>

                        </div>

                    ) : (

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fill, minmax(240px, 1fr))",
                                gap: 16
                            }}
                        >

                            {
                                tags.map(tag => (

                                    <div
                                        key={tag.id}
                                        style={{
                                            background: "#fff",
                                            border:
                                                "1px solid #ececec",
                                            borderRadius: 22,
                                            padding: 18
                                        }}
                                    >

                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent:
                                                    "space-between",
                                                alignItems:
                                                    "flex-start",
                                                gap: 12
                                            }}
                                        >

                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems:
                                                        "center",
                                                    gap: 10
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        width: 16,
                                                        height: 16,
                                                        borderRadius: 999,
                                                        background:
                                                            tag.color,
                                                        flexShrink: 0
                                                    }}
                                                />

                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: "#111827"
                                                    }}
                                                >
                                                    {tag.name}
                                                </div>

                                            </div>

                                            <button
                                                onClick={() =>
                                                    deleteTag(tag)
                                                }
                                                style={{
                                                    border: 0,
                                                    background:
                                                        "transparent",
                                                    color: "#84dc80",
                                                    cursor: "pointer"
                                                }}
                                            >

                                                <FiTrash2 />

                                            </button>

                                        </div>

                                    </div>

                                ))
                            }

                        </div>

                    )
                }

            </div>

        </div>

    );
}