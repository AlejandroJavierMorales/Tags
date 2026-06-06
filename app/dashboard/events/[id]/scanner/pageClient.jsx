"use client";

import { useState, useRef }
    from "react";

import {
    Scanner
} from "@yudiel/react-qr-scanner";

import showAlert
    from "@/app/components/showAlert";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";
import EventOwnerHeader from "@/app/modules/e-events/components/EventOwnerHeader";

export default function EventScannerPage({

    session,
    eventId,
    modules

}) {

    const [loading, setLoading] =
        useState(false);

    const [lastScan, setLastScan] =
        useState(null);

    const lockRef =
        useRef(false);

    // =========================
    // HANDLE SCAN
    // =========================

    async function handleScan(rawValue) {

        if (!rawValue) return;

        if (lockRef.current) return;

        try {

            lockRef.current = true;

            setLoading(true);

            // =========================
            // EXTRACT CODE
            // =========================

            let code = "";

            try {

                const url =
                    new URL(rawValue);

                const parts =
                    url.pathname.split("/");

                code =
                    parts[2];

            } catch {

                code = rawValue;
            }

            if (!code) {

                showAlert({

                    title: "Error",

                    text:
                        "QR inválido",

                    icon: "error"
                });

                return;
            }

            // =========================
            // API
            // =========================

            const res =
                await fetch(
                    "/api/events/scan",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                code
                            })
                    }
                );

            const data =
                await res.json();

            setLastScan(data);

            // =========================
            // RESPONSES
            // =========================

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "No se pudo validar",

                    icon: "error"
                });

                return;
            }

            if (data.already_used) {

                showAlert({

                    title: "Ya ingresó",

                    text:
                        `${data.attendee.name} ya realizó check-in`,

                    icon: "warning"
                });

                return;
            }

            showAlert({

                title: "Ingreso OK",

                text:
                    `${data.attendee.name} autorizado`,

                icon: "success"
            });

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

            setTimeout(() => {

                lockRef.current = false;

            }, 2500);
        }
    }

    return (

        <div
            style={{
                minHeight: "100vh",
                background:
                    "radial-gradient(circle at top, #111827 0%, #050505 55%, #000 100%)",
                color: "#fff",
                position: "relative",
                overflow: "hidden",
                padding: "4px",
            }}
        >
           {/*  <EventOwnerHeader session={session} /> */}

            {/* BG EFFECTS */}
            <div
            /* style={{
                position: "absolute",
                top: -200,
                left: -200,
                width: 500,
                height: 500,
                borderRadius: "50%",
                background:
                    "rgba(0,255,153,.08)",
                filter: "blur(100px)"
            }} */
            />

            <div
                style={{
                    position: "absolute",
                    bottom: -200,
                    right: -200,
                    width: 500,
                    height: 500,
                    borderRadius: "50%",
                    background:
                        "rgba(0,140,255,.08)",
                    filter: "blur(100px)"
                }}
            />

           {/*  {
                (
                    session.role === "admin"
                    ||
                    session.role === "event_client"
                )
                &&
                <OwnerNavigation />
            }
 */}
            {/*   {
                modules
                &&
                (
                    <EventNavigation
                        eventId={eventId}
                        modules={modules}
                    />
                )
            } */}

            {/* PAGE */}
            <div
                className="container py-4"
                style={{
                    maxWidth: 900,
                    position: "relative",
                    zIndex: 2
                }}
            >

                {/* HEADER */}
                <div
                    className="
                        d-flex
                        flex-column
                        flex-md-row
                        align-items-md-center
                        justify-content-between
                        mb-4
                        gap-3
                    "
                >

                    <div>

                        <div
                            style={{
                                fontSize: 14,
                                letterSpacing: 2,
                                textTransform: "uppercase",
                                opacity: .6,
                                marginBottom: 8
                            }}
                        >

                            Control de Acceso

                        </div>

                        <h1
                            style={{
                                fontSize: 36,
                                fontWeight: 800,
                                margin: 0,
                                lineHeight: 1
                            }}
                        >

                            QR Scanner Staff

                        </h1>

                    </div>
                   {/* Card Session */}
<div
    style={{

        padding:
            "16px 22px",

        borderRadius: 18,

        background:
            "rgba(255,255,255,.05)",

        border:
            "1px solid rgba(255,255,255,.08)",

        backdropFilter:
            "blur(12px)",

        boxShadow:
            "0 10px 30px rgba(0,0,0,.35)",

        minWidth: "260px",

        display: "flex",

        flexDirection: "column",

        justifyContent: "space-between",

        gap: "18px"
    }}
>

    {/* TITLE */}
    <div
        style={{

            fontSize: 22,

            fontWeight: 700,

            color: "#fff",

            lineHeight: 1.2
        }}
    >

        Acceso al Evento

    </div>

    {/* SESSION */}
    <div
        style={{

            display: "flex",

            alignItems: "center",

            justifyContent: "flex-end",

            gap: "6px",

            fontSize: "11px",

            color: "rgba(255,255,255,.6)",

            flexWrap: "wrap"
        }}
    >

        <span
            style={{
                fontSize: "11px"
            }}
        >
            👤
        </span>

        <span
            style={{
                fontWeight: 400
            }}
        >

            {session?.name || "Usuario"}

        </span>

        <span
            style={{
                opacity: .5
            }}
        >
            ·
        </span>

        <span
            style={{
                wordBreak: "break-all"
            }}
        >

            {session?.email || "-"}

        </span>

    </div>

</div>

                </div>

                {/* MAIN CARD */}
                <div
                    style={{
                        background:
                            "rgba(255,255,255,.04)",
                        border:
                            "1px solid rgba(255,255,255,.08)",
                        borderRadius: 32,
                        overflow: "hidden",
                        backdropFilter:
                            "blur(18px)",
                        boxShadow:
                            "0 25px 80px rgba(0,0,0,.45)"
                    }}
                >

                    {/* SCANNER */}
                    <div
                        className="
                            d-flex
                            justify-content-center
                            align-items-center
                            p-3
                            p-md-4
                        "
                    >

                        <div
                            style={{
                                width: "100%",
                                maxWidth: 720,
                                position: "relative",
                                borderRadius: 28,
                                overflow: "hidden",
                                background: "#000",
                                border:
                                    "1px solid rgba(255,255,255,.1)",
                                boxShadow:
                                    "0 20px 60px rgba(0,0,0,.55)"
                            }}
                        >

                            <Scanner
                                constraints={{
                                    facingMode: "environment"
                                }}
                                onScan={(result) => {

                                    if (
                                        result?.[0]?.rawValue
                                    ) {

                                        handleScan(
                                            result[0].rawValue
                                        );
                                    }
                                }}
                                onError={(err) => {
                                    console.log(err);
                                }}
                            />

                            {/* DARK OVERLAY */}
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                        "linear-gradient(to bottom, rgba(0,0,0,.25), rgba(0,0,0,.1))",
                                    pointerEvents: "none"
                                }}
                            />

                            {/* CENTER FRAME */}
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    pointerEvents: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >

                                <div
                                    style={{
                                        width: 260,
                                        height: 260,
                                        borderRadius: 30,
                                        border:
                                            "3px solid rgba(0,255,153,.95)",
                                        boxShadow:
                                            `
                                                0 0 0 1px rgba(255,255,255,.1),
                                                0 0 30px rgba(0,255,153,.35),
                                                inset 0 0 30px rgba(0,255,153,.12)
                                            `,
                                        position: "relative"
                                    }}
                                >

                                    {/* CORNERS */}
                                    {
                                        [
                                            {
                                                top: -3,
                                                left: -3,
                                                borderTop:
                                                    "6px solid #00ff99",
                                                borderLeft:
                                                    "6px solid #00ff99"
                                            },
                                            {
                                                top: -3,
                                                right: -3,
                                                borderTop:
                                                    "6px solid #00ff99",
                                                borderRight:
                                                    "6px solid #00ff99"
                                            },
                                            {
                                                bottom: -3,
                                                left: -3,
                                                borderBottom:
                                                    "6px solid #00ff99",
                                                borderLeft:
                                                    "6px solid #00ff99"
                                            },
                                            {
                                                bottom: -3,
                                                right: -3,
                                                borderBottom:
                                                    "6px solid #00ff99",
                                                borderRight:
                                                    "6px solid #00ff99"
                                            }
                                        ].map((corner, index) => (

                                            <div
                                                key={index}
                                                style={{
                                                    position: "absolute",
                                                    width: 45,
                                                    height: 45,
                                                    borderRadius: 12,
                                                    ...corner
                                                }}
                                            />

                                        ))
                                    }

                                </div>

                            </div>

                            {/* SCAN LINE */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: "50%",
                                    transform:
                                        "translate(-50%, -50%)",
                                    width: 260,
                                    height: 2,
                                    background:
                                        "linear-gradient(to right, transparent, #00ff99, transparent)",
                                    boxShadow:
                                        "0 0 20px #00ff99"
                                }}
                            />

                        </div>

                    </div>

                    {/* FOOT INFO */}
                    <div
                        className="
                            d-flex
                            flex-column
                            flex-md-row
                            justify-content-between
                            align-items-md-center
                            gap-3
                            px-4
                            pb-4
                        "
                    >

                        <div
                            style={{
                                opacity: .65,
                                fontSize: 15
                            }}
                        >

                            Escaneá el QR del asistente para validar acceso al evento.

                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10
                            }}
                        >

                            <div
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    background:
                                        loading
                                            ? "#ffcc00"
                                            : "#00ff99",
                                    boxShadow:
                                        loading
                                            ? "0 0 12px #ffcc00"
                                            : "0 0 12px #00ff99"
                                }}
                            />

                            <div
                                style={{
                                    fontWeight: 600,
                                    opacity: .9
                                }}
                            >

                                {
                                    loading
                                        ? "Validando..."
                                        : "Scanner activo"
                                }

                            </div>

                        </div>

                    </div>

                </div>

                {/* STATUS */}
                <div
                    className="mt-4"
                >

                    {loading && (

                        <div
                            style={{
                                background:
                                    "rgba(255,204,0,.08)",
                                border:
                                    "1px solid rgba(255,204,0,.3)",
                                color: "#ffdd66",
                                padding:
                                    "18px 22px",
                                borderRadius: 24,
                                fontWeight: 600,
                                backdropFilter:
                                    "blur(10px)"
                            }}
                        >

                            Validando acceso...

                        </div>

                    )}

                    {lastScan?.attendee && (

                        <div
                            className="p-4 p-md-5"
                            style={{
                                background:
                                    lastScan.already_used
                                        ? "linear-gradient(135deg, rgba(255,170,0,.12), rgba(255,120,0,.08))"
                                        : "linear-gradient(135deg, rgba(0,255,153,.14), rgba(0,180,120,.08))",

                                borderRadius: 32,

                                border:
                                    lastScan.already_used
                                        ? "1px solid rgba(255,204,0,.4)"
                                        : "1px solid rgba(0,255,153,.35)",

                                backdropFilter:
                                    "blur(18px)",

                                boxShadow:
                                    "0 20px 50px rgba(0,0,0,.35)"
                            }}
                        >

                            <div
                                className="
                                    d-flex
                                    flex-column
                                    flex-md-row
                                    align-items-md-center
                                    justify-content-between
                                    gap-4
                                "
                            >

                                <div>

                                    <div
                                        style={{
                                            fontSize: 14,
                                            letterSpacing: 2,
                                            textTransform:
                                                "uppercase",
                                            opacity: .7,
                                            marginBottom: 12
                                        }}
                                    >

                                        Estado del acceso

                                    </div>

                                    <div
                                        style={{
                                            fontSize: 38,
                                            fontWeight: 900,
                                            lineHeight: 1
                                        }}
                                    >

                                        {
                                            lastScan.already_used
                                                ? "YA INGRESÓ"
                                                : "ACCESO PERMITIDO"
                                        }

                                    </div>

                                </div>

                                <div
                                    style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 24,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 38,
                                        background:
                                            lastScan.already_used
                                                ? "rgba(255,204,0,.12)"
                                                : "rgba(0,255,153,.12)",
                                        border:
                                            lastScan.already_used
                                                ? "1px solid rgba(255,204,0,.35)"
                                                : "1px solid rgba(0,255,153,.35)"
                                    }}
                                >

                                    {
                                        lastScan.already_used
                                            ? "⚠️"
                                            : "✓"
                                    }

                                </div>

                            </div>

                            <div
                                className="mt-4"
                                style={{
                                    height: 1,
                                    background:
                                        "rgba(255,255,255,.08)"
                                }}
                            />

                            <div
                                className="
                                    d-flex
                                    flex-column
                                    gap-3
                                    mt-4
                                "
                            >

                                <div>

                                    <div
                                        style={{
                                            fontSize: 13,
                                            opacity: .6,
                                            marginBottom: 6
                                        }}
                                    >

                                        Asistente

                                    </div>

                                    <div
                                        style={{
                                            fontSize: 28,
                                            fontWeight: 700
                                        }}
                                    >

                                        {lastScan.attendee.name}

                                    </div>

                                </div>

                                <div>

                                    <div
                                        style={{
                                            fontSize: 13,
                                            opacity: .6,
                                            marginBottom: 6
                                        }}
                                    >

                                        Email

                                    </div>

                                    <div
                                        style={{
                                            fontSize: 18,
                                            opacity: .9
                                        }}
                                    >

                                        {lastScan.attendee.email || "-"}

                                    </div>

                                </div>

                            </div>

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
}