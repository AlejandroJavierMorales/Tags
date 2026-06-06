"use client";

import {
    useEffect,
    useState
} from "react";

import { useParams }
    from "next/navigation";

import QRCode
    from "qrcode";

export default function InvitePage() {

    const params =
        useParams();

    const token =
        params.token;

    const [data, setData] =
        useState(null);

    const [qrPreview, setQrPreview] =
        useState("");

    // =========================
    // LOAD
    // =========================

    useEffect(() => {

        if (!token) return;

        loadInvite();

    }, [token]);

    async function loadInvite() {

        try {

            const res =
                await fetch(
                    `/api/events/invite-data?token=${token}`,
                    {
                        cache: "no-store"
                    }
                );

            const json =
                await res.json();

            if (!res.ok) {

                alert(
                    json.error ||
                    "Invitación inválida"
                );

                return;
            }

            setData(json.data);

            // =========================
            // QR
            // =========================

            const qrUrl =
                `${window.location.origin}/t/${json.data.qr_code}`;

            const image =
                await QRCode.toDataURL(
                    qrUrl,
                    {
                        width: 500,
                        margin: 1
                    }
                );

            setQrPreview(image);

        } catch (err) {

            console.log(err);
        }
    }

    // =========================
    // LOADING
    // =========================

    if (!data) {

        return (

            <div
                className="
                    d-flex
                    align-items-center
                    justify-content-center
                "
                style={{
                    minHeight: "100vh",
                    background: "#000",
                    color: "#fff"
                }}
            >

                <div
                    style={{
                        opacity: .5,
                        fontSize: 14,
                        letterSpacing: 1
                    }}
                >

                    Cargando invitación...

                </div>

            </div>

        );
    }

    return (

        <div
            style={{
                minHeight: "100vh",
                background: "#a9aaa9",
                color: "#fff",
                padding: 18
            }}
        >

            <div
                style={{
                    maxWidth: 430,
                    margin: "0 auto"
                }}
            >

                {/* COVER */}
                {
                    data.cover_image
                    &&
                    (
                        <div
                            style={{
                                marginBottom: 14,
                                borderRadius: 26,
                                overflow: "hidden",
                                border:
                                    "1px solid rgba(255,255,255,.06)"
                            }}
                        >

                            <img
                                src={data.cover_image}
                                alt={data.event_name}
                                style={{
                                    width: "100%",
                                    height: 180,
                                    objectFit: "cover",
                                    display: "block"
                                }}
                            />

                        </div>
                    )
                }

                {/* CARD */}
                <div
                    style={{
                        background: "#0f0f0f",
                        border:
                            "1px solid rgba(255,255,255,.06)",
                        borderRadius: 30,
                        overflow: "hidden"
                    }}
                >

                    {/* HEADER */}
                    <div
                        className="p-4"
                        style={{
                            borderBottom:
                                "1px solid rgba(255,255,255,.05)"
                        }}
                    >

                        <div
                            style={{
                                fontSize: 11,
                                letterSpacing: 2,
                                opacity: .45,
                                marginBottom: 10
                            }}
                        >

                            Tags e-Event

                        </div>

                        <h1
                            style={{
                                fontSize: 28,
                                fontWeight: 700,
                                lineHeight: 1.1,
                                margin: 0,
                                letterSpacing: -.5
                            }}
                        >

                            {data.event_name}

                        </h1>

                    </div>

                    {/* QR */}
                    {
                        qrPreview
                        &&
                        (
                            <div
                                className="p-4"
                            >

                                <div
                                    style={{
                                        background: "#fff",
                                        borderRadius: 28,
                                        padding: 20
                                    }}
                                >

                                    <img
                                        src={qrPreview}
                                        alt="QR"
                                        style={{
                                            width: "100%",
                                            display: "block"
                                        }}
                                    />

                                </div>

                                {/* QR CODE */}
                                <div
                                    className="text-center mt-3"
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        letterSpacing: 1.5,
                                        color: "#fff"
                                    }}
                                >

                                    {data.qr_code}

                                </div>

                                <div
                                    className="text-center mt-2"
                                    style={{
                                        fontSize: 13,
                                        opacity: .45
                                    }}
                                >

                                    Presentar en el ingreso

                                </div>

                            </div>
                        )
                    }

                    {/* INFO */}
                    <div
                        className="
                            px-4
                            pb-4
                        "
                    >

                        {/* GUEST */}
                        <div
                            style={{
                                padding:
                                    "16px 18px",
                                borderRadius: 20,
                                background:
                                    "#151515",
                                marginBottom: 12
                            }}
                        >

                            <div
                                style={{
                                    fontSize: 10,
                                    letterSpacing: 2,
                                    opacity: .4,
                                    marginBottom: 7
                                }}
                            >

                                INVITADO

                            </div>

                            <div
                                style={{
                                    fontSize: 20,
                                    fontWeight: 600
                                }}
                            >

                                {data.name}

                            </div>

                        </div>

                        {/* DATE */}
                        <div
                            style={{
                                padding:
                                    "16px 18px",
                                borderRadius: 20,
                                background:
                                    "#151515",
                                marginBottom: 12
                            }}
                        >

                            <div
                                style={{
                                    fontSize: 10,
                                    letterSpacing: 2,
                                    opacity: .4,
                                    marginBottom: 7
                                }}
                            >

                                FECHA

                            </div>

                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 500,
                                    lineHeight: 1.4
                                }}
                            >

                                {
                                    new Date(
                                        data.starts_at
                                    ).toLocaleString()
                                }

                            </div>

                        </div>

                        {/* LOCATION */}
                        <div
                            style={{
                                padding:
                                    "16px 18px",
                                borderRadius: 20,
                                background:
                                    "#151515",
                                marginBottom: 18
                            }}
                        >

                            <div
                                style={{
                                    fontSize: 10,
                                    letterSpacing: 2,
                                    opacity: .4,
                                    marginBottom: 7
                                }}
                            >

                                UBICACIÓN

                            </div>

                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 500,
                                    lineHeight: 1.4
                                }}
                            >

                                {data.location}

                            </div>

                        </div>

                        {/* STATUS */}
                        <div
                            className="
                                d-inline-flex
                                align-items-center
                            "
                            style={{
                                padding:
                                    "10px 14px",
                                borderRadius: 999,
                                background:
                                    data.status === "checked_in"
                                        ? "rgba(0,255,153,.08)"
                                        : "rgba(255,255,255,.06)",

                                border:
                                    data.status === "checked_in"
                                        ? "1px solid rgba(0,255,153,.18)"
                                        : "1px solid rgba(255,255,255,.08)",

                                fontSize: 13,
                                fontWeight: 600,

                                color:
                                    data.status === "checked_in"
                                        ? "#00ff99"
                                        : "#fff"
                            }}
                        >

                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background:
                                        data.status === "checked_in"
                                            ? "#00ff99"
                                            : "#888",
                                    marginRight: 10
                                }}
                            />

                            {
                                data.status === "checked_in"
                                    ? "Ingreso confirmado"
                                    : "Pendiente de ingreso"
                            }

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}