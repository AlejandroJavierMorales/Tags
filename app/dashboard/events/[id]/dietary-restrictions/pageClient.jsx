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

import DietaryRestrictionStats
    from "@/app/modules/e-events/components/DietaryRestrictionStats";

import DietaryRestrictionCard
    from "@/app/modules/e-events/components/DietaryRestrictionCard";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import DietaryRestrictionFormModal
    from "@/app/modules/e-events/components/DietaryRestrictionFormModal";
import EventDietarySummaryReport from "@/app/modules/e-events/components/EventDietarySummaryReport";
import EventDietaryDetailsDrawer from "@/app/modules/e-events/components/EventDietaryDetailsDrawer";

export default function EventDietaryRestrictionsPageClient({

    session,
    eventId,
    modules

}) {

    const [restrictions, setRestrictions] =
        useState([]);

    const [report, setReport] =
        useState([]);
    const [selectedReport, setSelectedReport] =
        useState(null);

    const [openDrawer, setOpenDrawer] =
        useState(false);

    const [loading, setLoading] =
        useState(true);

    const [openModal, setOpenModal] =
        useState(false);

    const [editing, setEditing] =
        useState(null);

    const [filters, setFilters] =
        useState({

            search: "",
            severity: "",
            showOnlyUsed: false
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

            // =========================
            // RESTRICTIONS
            // =========================

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

            if (filters.severity) {

                params.append(
                    "severity",
                    filters.severity
                );
            }

            const res =
                await fetch(
                    `/api/events/dietary-restrictions/list?${params.toString()}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            console.log(
                "RESTRICTIONS API",
                data
            );

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

            // =========================
            // REPORT
            // =========================

            const reportRes =
                await fetch(
                    `/api/events/dietary-reports/summary?event_id=${eventId}`,
                    {
                        cache: "no-store"
                    }
                );

            const reportData =
                await reportRes.json();

            console.log(
                "REPORT API",
                reportData
            );

            if (!reportRes.ok) {

                showAlert({

                    title: "Error",

                    text:
                        reportData.error ||
                        "Error cargando reporte",

                    icon: "error"
                });

                return;
            }

            setReport(
                reportData.data || []
            );

        } catch (err) {

            console.log(
                "LOAD ERROR",
                err
            );

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

            const res =
                await fetch(
                    "/api/events/dietary-restrictions/delete",
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

            load();

        } catch (err) {

            console.log(err);
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
            let attendeesWithRestrictions = 0;
            let totalAssignments = 0;

            for (const item of report) {

                const total =
                    Number(
                        item.total_attendees || 0
                    );

                attendeesWithRestrictions +=
                    total;

                totalAssignments +=
                    total;

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

                kitchen,

                attendeesWithRestrictions,

                totalAssignments
            };

        }, [restrictions, report]);

    // =========================
    // FILTERED GRID
    // =========================

    const visibleRestrictions =
        restrictions.filter(item => {

            if (
                filters.showOnlyUsed
                &&
                Number(
                    item.attendees_count || 0
                ) <= 0
            ) {
                return false;
            }

            return true;
        });

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
                            Configuración catering
                        </div>

                        <h2
                            style={{
                                margin: 0
                            }}
                        >
                            🥗 Restricciones alimentarias
                        </h2>

                    </div>

                    {/*  <button
                        className="tags_btn primary"
                        onClick={() => {

                            setEditing(null);

                            setOpenModal(true);
                        }}
                    >
                        + Nueva restricción
                    </button> */}

                </div>

                {/* STATS */}
                <DietaryRestrictionStats
                    stats={stats}
                    report={report}
                    eventId={eventId}
                />

                <EventDietarySummaryReport

                    report={report}
                    eventId={eventId}

                    onOpen={(item) => {

                        setSelectedReport(item);

                        setOpenDrawer(true);
                    }}
                />

                {/* FILTERS */}
                <div className="row g-2 mb-4">
                    <div className="col-md-2">
                        <button
                            className="tags_btn primary"
                            onClick={() => {

                                setEditing(null);

                                setOpenModal(true);
                            }}
                        >
                            + Nueva restricción
                        </button>
                    </div>

                    <div className="col-md-4">

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

                    <div className="col-md-3">

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

                    <div className="col-md-3">

                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                height: "100%",
                                cursor: "pointer",
                                paddingLeft: 10
                            }}
                        >

                            <input
                                type="checkbox"
                                checked={
                                    filters.showOnlyUsed
                                }
                                onChange={(e) =>
                                    setFilters(prev => ({
                                        ...prev,
                                        showOnlyUsed:
                                            e.target.checked
                                    }))
                                }
                            />

                            Solo restricciones utilizadas

                        </label>

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
                        : visibleRestrictions.length === 0
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
                                        Podés crear restricciones
                                        personalizadas para este evento.
                                    </div>

                                </div>
                            )
                            : (
                                <div className="row g-3">

                                    {
                                        visibleRestrictions.map(item => (

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
                {
                    openModal
                    &&
                    (
                        <DietaryRestrictionFormModal
                            session={session}

                            eventId={eventId}

                            editing={editing}

                            onClose={() =>
                                setOpenModal(false)
                            }

                            onSaved={() => {

                                setOpenModal(false);

                                load();
                            }}
                        />
                    )
                }

                <EventDietaryDetailsDrawer

                    open={openDrawer}

                    item={selectedReport}

                    onClose={() => {

                        setOpenDrawer(false);

                        setSelectedReport(null);
                    }}
                />
            </div>

            <div
                style={{
                    minHeight: 200
                }}
            />



        </div>
    );
}