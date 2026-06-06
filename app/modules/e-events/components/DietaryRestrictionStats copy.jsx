"use client";

import { FiAlertTriangle }
    from "react-icons/fi";

export default function DietaryRestrictionStats({

    stats,
    report = []

}) {

    // =========================
    // FILTER ONLY USED
    // =========================

    const usedRestrictions =
        report.filter(item =>
            Number(item.total_attendees || 0) > 0
        );

        console.log('Report ' + JSON.stringify(report))

        console.log('usedRestrictions ' +JSON.stringify(usedRestrictions))

    return (

        <>

            {/* STATS */}
            <div className="row g-3 mb-4">

                <Stat
                    title="Total"
                    value={stats.total}
                />

                <Stat
                    title="Critical"
                    value={stats.critical}
                />

                <Stat
                    title="Allergy"
                    value={stats.allergy}
                />

                <Stat
                    title="Kitchen"
                    value={stats.kitchen}
                />

            </div>

            {/* CATERING REPORT */}
            <div
                style={{
                    marginTop: 40,
                    marginBottom: 40
                }}
            >

                {/* HEADER */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 20
                    }}
                >

                    <FiAlertTriangle
                        size={20}
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

                {/* EMPTY */}
                {
                    usedRestrictions.length === 0
                    &&
                    (
                        <div
                            style={{
                                background: "#fff",
                                border: "1px solid #ececec",
                                borderRadius: 22,
                                padding: 24,
                                color: "#666"
                            }}
                        >
                            No hay invitados con restricciones alimentarias.
                        </div>
                    )
                }

                {/* GRID */}
                {
                    usedRestrictions.length > 0
                    &&
                    (
                        <div className="row g-3">

                            {
                                usedRestrictions.map(item => (

                                    <div
                                        key={item.id}
                                        className="col-12 col-md-6 col-xl-4"
                                    >

                                        <div
                                            style={{
                                                background: "#fff",

                                                border:
                                                    item.severity === "critical"
                                                        ? "2px solid #dc2626"
                                                        : item.severity === "allergy"
                                                            ? "2px solid #f59e0b"
                                                            : "1px solid #ececec",

                                                borderRadius: 22,
                                                padding: 20,
                                                height: "100%"
                                            }}
                                        >

                                            {/* HEADER */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "flex-start",
                                                    marginBottom: 18
                                                }}
                                            >

                                                <div>

                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 10,
                                                            marginBottom: 8
                                                        }}
                                                    >

                                                        <div
                                                            style={{
                                                                width: 14,
                                                                height: 14,
                                                                borderRadius: 999,
                                                                background:
                                                                    item.color || "#999"
                                                            }}
                                                        />

                                                        <strong>
                                                            {item.name}
                                                        </strong>

                                                    </div>

                                                    {
                                                        Number(
                                                            item.requires_kitchen_attention
                                                        ) === 1
                                                        &&
                                                        (
                                                            <div
                                                                className="tags_badge danger"
                                                            >
                                                                Requiere atención cocina
                                                            </div>
                                                        )
                                                    }

                                                </div>

                                                <div
                                                    className="tags_badge"
                                                >
                                                    {
                                                        item.total_attendees || 0
                                                    }
                                                </div>

                                            </div>

                                            {/* ATTENDEES */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 14
                                                }}
                                            >

                                                {
                                                    item.attendees?.map(att => (

                                                        <div
                                                            key={att.id}
                                                            style={{
                                                                borderBottom:
                                                                    "1px solid #f1f1f1",
                                                                paddingBottom: 12
                                                            }}
                                                        >

                                                            {/* NAME */}
                                                            <div
                                                                style={{
                                                                    fontWeight: 700,
                                                                    marginBottom: 6
                                                                }}
                                                            >
                                                                {att.name}
                                                            </div>

                                                            {/* CONTACT */}
                                                            <div
                                                                style={{
                                                                    fontSize: 13,
                                                                    color: "#666",
                                                                    marginBottom: 6
                                                                }}
                                                            >

                                                                {
                                                                    att.email
                                                                    &&
                                                                    (
                                                                        <div>
                                                                            📧 {att.email}
                                                                        </div>
                                                                    )
                                                                }

                                                                {
                                                                    att.phone
                                                                    &&
                                                                    (
                                                                        <div>
                                                                            📞 {att.phone}
                                                                        </div>
                                                                    )
                                                                }

                                                            </div>

                                                            {/* SNAPSHOT */}
                                                            {
                                                                att.dietary_notes
                                                                &&
                                                                (
                                                                    <div
                                                                        style={{
                                                                            fontSize: 13,
                                                                            color: "#444",
                                                                            marginBottom: 4
                                                                        }}
                                                                    >
                                                                        🥗 {att.dietary_notes}
                                                                    </div>
                                                                )
                                                            }

                                                            {/* CUSTOM NOTES */}
                                                            {
                                                                att.custom_dietary_notes
                                                                &&
                                                                (
                                                                    <div
                                                                        style={{
                                                                            fontSize: 13,
                                                                            color: "#dc2626",
                                                                            background: "#fef2f2",
                                                                            border: "1px solid #fecaca",
                                                                            borderRadius: 10,
                                                                            padding: 10,
                                                                            marginTop: 8
                                                                        }}
                                                                    >
                                                                        📝 {att.custom_dietary_notes}
                                                                    </div>
                                                                )
                                                            }

                                                        </div>

                                                    ))
                                                }

                                            </div>

                                        </div>

                                    </div>

                                ))
                            }

                        </div>
                    )
                }

            </div>

        </>

    );
}

function Stat({
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
                        fontWeight: 700
                    }}
                >
                    {value}
                </div>

            </div>

        </div>

    );
}