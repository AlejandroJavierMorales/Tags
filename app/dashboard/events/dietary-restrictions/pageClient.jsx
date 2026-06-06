"use client";

import {
    useEffect,
    useMemo,
    useState
} from "react";

import showAlert
    from "@/app/components/showAlert";

import "../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";

import DietaryRestrictionStats
    from "@/app/modules/e-events/components/DietaryRestrictionStats";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import DietaryRestrictionCard
    from "@/app/modules/e-events/components/DietaryRestrictionCard";

import DietaryRestrictionFormModal
    from "@/app/modules/e-events/components/DietaryRestrictionFormModal";

export default function EventDietaryRestrictionsPageClient({

    session,
    eventId,
    modules

}) {

    const isGlobalMode =
        !eventId;

    const [restrictions, setRestrictions] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [openModal, setOpenModal] =
        useState(false);

    const [editing, setEditing] =
        useState(null);

    const [filters, setFilters] =
        useState({

            search: "",
            severity: ""
        });

    // =========================
    // LOAD
    // =========================

    useEffect(() => {

        load();

    }, [eventId, filters]);

    async function load() {

        try {

            setLoading(true);

            const params =
                new URLSearchParams();

            // =========================
            // EVENT MODE
            // =========================

            if (eventId) {

                params.append(
                    "event_id",
                    eventId
                );
            }

            // =========================
            // FILTERS
            // =========================

            if (filters.search) {

                params.append(
                    "search",
                    filters.search
                );
            }

            if (filters.severity) {

                params.append(
                    "severity",
                    filters.severity
                );
            }

            // =========================
            // API
            // =========================

            const endpoint =
                isGlobalMode
                    ? "/api/events/globals-dietary-restrictions/list"
                    : "/api/events/dietary-restrictions/list";

            const res =
                await fetch(
                    `${endpoint}?${params.toString()}`,
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
                        "Error cargando restricciones",

                    icon: "error"
                });

                return;
            }

            setRestrictions(
                data.data || []
            );

            

        } catch (err) {

            console.log(err);

            showAlert({

                title: "Error",

                text:
                    "Error cargando restricciones",

                icon: "error"
            });

        } finally {

            setLoading(false);
        }
    }

    // =========================
    // DELETE
    // =========================

    async function remove(id) {

        const confirm =
            await showAlert({

                title:
                    "Eliminar restricción?",

                text:
                    "Esta acción no se puede deshacer",

                icon: "warning",

                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const endpoint =
                isGlobalMode
                    ? "/api/events/global-dietary-restrictions/delete"
                    : "/api/events/dietary-restrictions/delete";

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

            await load();

        } catch (err) {

            console.log(err);

            showAlert({

                title: "Error",

                text:
                    "Error eliminando restricción",

                icon: "error"
            });
        }
    }

    // =========================
    // STATS
    // =========================

    const stats =
        useMemo(() => {

            let critical = 0;
            let allergy = 0;
            let kitchen = 0;

            for (const item of restrictions) {

                if (
                    item.severity ===
                    "critical"
                ) {
                    critical++;
                }

                if (
                    item.severity ===
                    "allergy"
                ) {
                    allergy++;
                }

                if (
                    Number(
                        item.requires_kitchen_attention
                    ) === 1
                ) {
                    kitchen++;
                }
            }

            return {

                total:
                    restrictions.length,

                critical,

                allergy,

                kitchen
            };

        }, [restrictions]);

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
                    !!eventId
                    &&
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
                        gap: 20,
                        flexWrap: "wrap",
                        marginBottom: 24
                    }}
                >

                    <div>

                        <div
                            style={{
                                fontSize: 13,
                                color: "#666",
                                marginBottom: 6
                            }}
                        >
                            {
                                isGlobalMode
                                    ? "Configuración global"
                                    : "Configuración catering"
                            }
                        </div>

                        <h2
                            style={{
                                margin: 0
                            }}
                        >
                            🥗 Restricciones alimentarias
                        </h2>

                    </div>

                    <button
                        type="button"
                        className="tags_btn primary"
                        onClick={() => {

                            setEditing(null);

                            setOpenModal(true);
                        }}
                    >
                        + Nueva restricción
                    </button>

                </div>

                {/* STATS */}
                <DietaryRestrictionStats
                    stats={stats}
                    report={report}
                />

                {/* FILTERS */}
                <div className="row g-2 mb-4">

                    <div className="col-md-8">

                        <input
                            className="tags_modal_input"
                            placeholder="Buscar restricción"
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
                            value={filters.severity}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    severity:
                                        e.target.value
                                }))
                            }
                        >

                            <option value="">
                                Severidad
                            </option>

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

                </div>

                {/* GRID */}

                {
                    loading
                        ? (
                            <div>
                                <TagsSpinner />
                            </div>
                        )
                        : restrictions.length === 0
                            ? (
                                <div
                                    style={{
                                        padding: 60,
                                        textAlign: "center",
                                        color: "#666"
                                    }}
                                >

                                    <div
                                        style={{
                                            fontSize: 48,
                                            marginBottom: 14
                                        }}
                                    >
                                        🥗
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 18,
                                            fontWeight: 700,
                                            marginBottom: 6
                                        }}
                                    >
                                        No hay restricciones
                                    </div>

                                    <div>
                                        {
                                            isGlobalMode
                                                ? "Podés crear restricciones globales del sistema."
                                                : "Podés crear restricciones personalizadas para este evento."
                                        }
                                    </div>

                                </div>
                            )
                            : (
                                <div className="row g-3">

                                    {
                                        restrictions.map(item => (

                                            <div
                                                key={item.id}
                                                className="col-12 col-md-6 col-xl-4"
                                            >

                                                <DietaryRestrictionCard

                                                    item={item}

                                                    session={session}

                                                    onEdit={() => {

                                                        setEditing(item);

                                                        setOpenModal(true);
                                                    }}

                                                    onDelete={() =>
                                                        remove(item.id)
                                                    }
                                                />

                                            </div>

                                        ))
                                    }

                                </div>
                            )
                }

            </div>

            <div
                style={{
                    minHeight: 200
                }}
            />

            {
                openModal
                &&
                (
                    <DietaryRestrictionFormModal
                        session={session}

                        eventId={eventId}

                        editing={editing}

                        globalMode={isGlobalMode}

                        onClose={() =>
                            setOpenModal(false)
                        }

                        onSaved={async () => {

                            setOpenModal(false);

                            await load();
                        }}
                    />
                )
            }

        </div>
    );
}