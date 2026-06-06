"use client";

import {
    FiAlertTriangle,
    FiFileText
} from "react-icons/fi";

import DietaryPdfExportModal
    from "@/app/modules/e-events/components/DietaryPdfExportModal";
import { useState } from "react";



export default function EventDietarySummaryReport({

    report = [],
    eventId,
    onOpen

}) {

    const [showExport, setShowExport] =
        useState(false);

    const usedRestrictions =
        report.filter(item =>
            Number(item.total_attendees || 0) > 0
        );

    if (!usedRestrictions.length) {

        return null;
    }

    return (

        <div
            style={{
                marginBottom: 80,
                marginTop: 60
            }}
        >

            {/* HEADER */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                    gap: 20,
                    flexWrap: "wrap"
                }}
            >

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                    }}
                >

                    <FiAlertTriangle
                        color="#dc2626"
                    />

                    <h3
                        style={{
                            margin: 0
                        }}
                    >
                        🍽 Reporte catering
                    </h3>

                </div>

                {/* <button
                    className="tags_btn"
                    onClick={() =>
                        window.open(
                            `/api/events/dietary-reports/pdf?event_id=${eventId}`,
                            "_blank"
                        )
                    }
                > */}
                <button
                    className="tags_btn secondary"
                    onClick={() =>
                        setShowExport(true)
                    }
                >
                    <FiFileText />
                    <span> Exportar PDF</span>
                </button>

            </div>

            {/* TABLE */}
            <div
                style={{
                    background: "#fff",
                    border: "1px solid #ececec",
                    borderRadius: 24,
                    overflow: "hidden"
                }}
            >

                {
                    usedRestrictions.map(item => (

                        <div
                            key={item.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 20,
                                padding: 18,
                                borderBottom:
                                    "1px solid #f3f3f3"
                            }}
                        >

                            {/* LEFT */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14
                                }}
                            >

                                <div
                                    style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 999,
                                        background:
                                            item.color || "#999"
                                    }}
                                />

                                <div>

                                    <div
                                        style={{
                                            fontWeight: 700,
                                            marginBottom: 4
                                        }}
                                    >
                                        {item.name}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "#666"
                                        }}
                                    >
                                        {item.total_attendees} invitados
                                    </div>

                                </div>

                            </div>

                            {/* RIGHT */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10
                                }}
                            >

                                <div
                                    style={{
                                        background:
                                            item.severity === "critical"
                                                ? "#fee2e2"
                                                : item.severity === "allergy"
                                                    ? "#fef3c7"
                                                    : "#ecfccb",

                                        color:
                                            item.severity === "critical"
                                                ? "#dc2626"
                                                : item.severity === "allergy"
                                                    ? "#d97706"
                                                    : "#65a30d",

                                        padding: "6px 12px",
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        textTransform: "capitalize"
                                    }}
                                >
                                    {item.severity}
                                </div>

                                <button
                                    className="tags_btn ms-2"
                                    onClick={() =>
                                        onOpen(item)
                                    }
                                >

                                    {/* <FiEye /> */}

                                    Ver detalle

                                </button>

                            </div>

                        </div>

                    ))
                }

            </div>
            {
                showExport
                &&
                (
                    <DietaryPdfExportModal
                        eventId={eventId}
                        onClose={() =>
                            setShowExport(false)
                        }
                    />
                )
            }
        </div>
    );
}