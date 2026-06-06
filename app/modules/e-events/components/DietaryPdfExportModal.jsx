"use client";

import {
    FiFileText,
    FiUsers,
    FiAlertTriangle,
    FiX
} from "react-icons/fi";

export default function DietaryPdfExportModal({

    eventId,
    onClose

}) {

    function exportPdf(mode) {

        window.open(

            `/api/events/dietary-reports/pdf?event_id=${eventId}&mode=${mode}`,

            "_blank"
        );
    }

  

    return (

        <div className="tags_modal_overlay">

            <div
                style={{
                    width: "100%",
                    maxWidth: 720,
                    background: "#fff",
                    borderRadius: 28,
                    padding: 32,
                    position: "relative",
                    boxShadow:
                        "0 20px 80px rgba(0,0,0,.18)"
                }}
            >

                {/* CLOSE */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: 18,
                        right: 18,
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        border: "1px solid #ececec",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 18
                    }}
                >
                    ×
                </button>

                {/* HEADER */}
                <div
                    style={{
                        marginBottom: 30
                    }}
                >

                    <div
                        style={{
                            fontSize: 13,
                            color: "#888",
                            marginBottom: 8
                        }}
                    >
                        Exportar catering
                    </div>

                    <h2
                        style={{
                            margin: 0,
                            fontSize: 34,
                            fontWeight: 800
                        }}
                    >
                        Generar reporte PDF
                    </h2>

                </div>

                {/* OPTIONS */}
                <div className="row g-3">

                    {/* RESTRICTION */}
                    <div className="col-12 col-md-6">

                        <button
                            onClick={() =>
                                exportPdf("restriction")
                            }
                            style={{
                                width: "100%",
                                textAlign: "left",
                                background: "#fff",
                                border: "1px solid #ececec",
                                borderRadius: 24,
                                padding: 24,
                                cursor: "pointer",
                                transition: ".2s"
                            }}
                        >

                            <div
                                style={{
                                    fontSize: 42,
                                    marginBottom: 14
                                }}
                            >
                                🍽
                            </div>

                            <div
                                style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                    marginBottom: 10
                                }}
                            >
                                Por restricción
                            </div>

                            <div
                                style={{
                                    color: "#666",
                                    lineHeight: 1.5,
                                    fontSize: 14
                                }}
                            >
                                Agrupa invitados según
                                alergias o necesidades
                                alimentarias.
                            </div>

                            <div
                                style={{
                                    marginTop: 18,
                                    fontSize: 13,
                                    color: "#16a34a",
                                    fontWeight: 600
                                }}
                            >
                                Ideal para cocina y catering
                            </div>

                        </button>

                    </div>

                    {/* ATTENDEE */}
                    <div className="col-12 col-md-6">

                        <button
                            onClick={() =>
                                exportPdf("attendee")
                            }
                            style={{
                                width: "100%",
                                textAlign: "left",
                                background: "#fff",
                                border: "1px solid #ececec",
                                borderRadius: 24,
                                padding: 24,
                                cursor: "pointer"
                            }}
                        >

                            <div
                                style={{
                                    fontSize: 42,
                                    marginBottom: 14
                                }}
                            >
                                👤
                            </div>

                            <div
                                style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                    marginBottom: 10
                                }}
                            >
                                Por invitado
                            </div>

                            <div
                                style={{
                                    color: "#666",
                                    lineHeight: 1.5,
                                    fontSize: 14
                                }}
                            >
                                Muestra cada persona
                                junto con todas sus
                                restricciones.
                            </div>

                            <div
                                style={{
                                    marginTop: 18,
                                    fontSize: 13,
                                    color: "#2563eb",
                                    fontWeight: 600
                                }}
                            >
                                Ideal para coordinación
                            </div>

                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
}