"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EventNavigation({

    eventId,
    modules

}) {

    const pathname =
        usePathname();

    function isActive(path) {

        return pathname === path;
    }

    const itemStyle = (active) => ({


        minHeight: "60px",

        borderRadius: "18px",

        textDecoration: "none",

        fontWeight: 600,

        fontSize: "13px",

        transition: "all .2s ease",

        border: active
            ? "1px solid #8ee4a8"
            : "1px solid #e5e7eb",

        background: active
            ? "#eefaf1"
            : "#fff",

        color: active
            ? "#00a63e"
            : "#111",

        boxShadow: active
            ? "0 4px 12px rgba(0,166,62,.10)"
            : "0 2px 6px rgba(0,0,0,.04)",

        display: "flex",

        flexDirection: "column",

        alignItems: "center",

        justifyContent: "center",

        gap: "4px",

        textAlign: "center",

        padding: "8px 4px"
    });

    return (

        <div
            style={{

                background: "#fff",

                border: "1px solid #ececec",

                borderRadius: "20px",

                padding: "16px",

                marginBottom: "24px",

                boxShadow:
                    "0 4px 20px rgba(0,0,0,.04)"
            }}
        >

            <div
                style={{

                    display: "grid",

                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(90px, 1fr))",

                    gap: "12px",

                    width: "100%"
                }}
            >

                <Link
                    href={`/dashboard/events/${eventId}`}
                    style={itemStyle(
                        isActive(
                            `/dashboard/events/${eventId}`
                        )
                    )}
                >
                    <div
                        style={{
                            fontSize: "24px",
                            lineHeight: 1
                        }}
                    >
                        🏁
                    </div>
                    <span>Inicio</span>
                </Link>

                {modules.attendees && (
                    <Link
                        href={`/dashboard/events/${eventId}/attendees`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/attendees`)
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            🎟
                        </div>

                        <span>
                            Invitados
                        </span>

                    </Link>
                )}

                {modules.event && (
                    <Link
                        href={`/dashboard/events/${eventId}/event-timeline`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/event-timeline`)
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            📅
                        </div>
                        <span>
                            Cronograma
                        </span>
                    </Link>
                )}

                {modules.menu && (
                    <Link
                        href={`/dashboard/events/${eventId}/menu`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/menu`)
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            🍽️
                        </div>
                        <span>
                            Menú
                        </span>
                    </Link>
                )}

                {modules.playlist && (
                    <Link
                        href={`/dashboard/events/${eventId}/playlist`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/playlist`)
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            🎵
                        </div>

                        <span>
                            Música
                        </span>
                    </Link>
                )}

                {modules.guests && (
                    <Link
                        href={`/dashboard/events/${eventId}/social-media`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/social-media`)
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            🫶
                        </div>

                        <span>
                            Social
                        </span>
                    </Link>
                )}

                {modules.checkin && (

                    <Link
                        href={`/dashboard/events/${eventId}/checkin`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/checkin`
                            )
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            ✅
                        </div>

                        <span>
                            Checkin
                        </span>
                    </Link>

                )}

                {modules.scanner && (

                    <Link
                        href={`/dashboard/events/${eventId}/scanner`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/scanner`
                            )
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            📷
                        </div>

                        <span>
                            Scanner
                        </span>
                    </Link>

                )}

                {modules.analytics && (

                    <Link
                        href={`/dashboard/events/${eventId}/analytics`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/analytics`
                            )
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            📊
                        </div>

                        <span>
                            Analytics
                        </span>
                    </Link>

                )}

                {modules.activity && (

                    <Link
                        href={`/dashboard/events/${eventId}/activity`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/activity`
                            )
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            📝
                        </div>
                        <span>
                            Actividad
                        </span>
                    </Link>

                )}

                {modules.staff && (

                    <Link
                        href={`/dashboard/events/${eventId}/staff`}
                        style={itemStyle(
                            isActive(
                                `/dashboard/events/${eventId}/staff`
                            )
                        )}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                lineHeight: 1
                            }}
                        >
                            👥
                        </div>
                        <span>
                            Staff
                        </span>
                    </Link>

                )}

            </div>

        </div>
    );
}