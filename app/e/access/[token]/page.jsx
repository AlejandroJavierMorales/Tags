"use client";

import { useEffect, useState }
    from "react";

import { useParams }
    from "next/navigation";
import TagsSpinner from "@/app/components/TagsSpinner";

export default function EventAccessPage() {

    const params =
        useParams();

    const token =
        params.token;

    const [loading, setLoading] =
        useState(true);

    const [result, setResult] =
        useState(null);

    // =========================
    // CHECKIN
    // =========================

    useEffect(() => {

        if (!token) return;

        validateAccess();

    }, [token]);

    async function validateAccess() {

        try {

            const res =
                await fetch(
                    "/api/events/checkin",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                token
                            })
                    }
                );

            const data =
                await res.json();

            setResult(data);

        } catch (err) {

            console.log(err);

            setResult({
                error:
                    "Error interno"
            });

        } finally {

            setLoading(false);
        }
    }

    // =========================
    // LOADING
    // =========================

    if (loading) {

        return (
            <>
                <Screen
                    bg="#111"
                    icon="⏳"
                    title="Validando acceso..."
                    text="Espere un momento"
                />

                <TagsSpinner />
            </>
        );
    }

    // =========================
    // INVALID
    // =========================

    if (result?.error) {

        return (

            <Screen
                bg="#7f1d1d"
                icon="❌"
                title="Acceso denegado"
                text={result.error}
            />

        );
    }

    // =========================
    // DUPLICATE
    // =========================

    if (result?.already_used) {

        return (

            <Screen
                bg="#78350f"
                icon="⚠️"
                title="QR ya utilizado"
                text={`El invitado ${result.attendee.name} ya ingresó`}
            />

        );
    }

    // =========================
    // SUCCESS
    // =========================

    return (

        <Screen
            bg="#14532d"
            icon="✅"
            title="Acceso aprobado"
            text={`Bienvenido ${result.attendee.name}`}
            extra={`Evento: ${result.attendee.event_name}`}
        />

    );
}

// =========================
// SCREEN
// =========================

function Screen({

    bg,
    icon,
    title,
    text,
    extra

}) {

    return (

        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: bg,
                color: "#fff",
                padding: 20
            }}
        >

            <div
                style={{
                    textAlign: "center",
                    maxWidth: 500
                }}
            >

                <div
                    style={{
                        fontSize: 90,
                        marginBottom: 20
                    }}
                >
                    {icon}
                </div>

                <h1
                    style={{
                        fontSize: 42,
                        marginBottom: 20
                    }}
                >
                    {title}
                </h1>

                <p
                    style={{
                        fontSize: 22,
                        opacity: 0.9
                    }}
                >
                    {text}
                </p>

                {extra && (

                    <div
                        style={{
                            marginTop: 20,
                            opacity: 0.7
                        }}
                    >
                        {extra}
                    </div>

                )}

            </div>

        </div>
    );
}