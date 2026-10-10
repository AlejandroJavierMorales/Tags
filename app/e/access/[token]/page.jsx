"use client";

import { useEffect, useState }
    from "react";

import { useParams }
    from "next/navigation";
import TagsSpinner from "@/app/components/TagsSpinner";
import QRCode from "qrcode";
import { FaCalendarDays, FaClock, FaLocationDot, FaRoute } from "react-icons/fa6";
import "./event-access.css";

function eventDateParts(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return {
        date: date.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
        time: date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    };
}

export default function EventAccessPage() {

    const params =
        useParams();

    const token =
        params.token;

    const [loading, setLoading] =
        useState(true);

    const [result, setResult] =
        useState(null);
    const [qrImage, setQrImage] = useState("");

    // =========================
    // CHECKIN
    // =========================

    useEffect(() => {

        if (!token) return;

        validateAccess();

    }, [token]);

    useEffect(() => {
        if (!token || !result?.attendee) return;
        QRCode.toDataURL(`${window.location.origin}/e/access/${token}`, { width: 520, margin: 2, errorCorrectionLevel: "H" })
            .then(setQrImage)
            .catch(() => setQrImage(""));
    }, [token, result]);

    async function validateAccess() {

        try {

            const res =
                await fetch(
                    `/api/events/checkin?token=${encodeURIComponent(token)}`,
                    {
                        cache: "no-store"
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

    const attendee =
        result?.attendee;

    const schedule = eventDateParts(attendee?.starts_at);
    const hasCoordinates = attendee?.latitude != null && attendee?.longitude != null
        && Number.isFinite(Number(attendee.latitude)) && Number.isFinite(Number(attendee.longitude));
    const directionsUrl = hasCoordinates
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${attendee.latitude},${attendee.longitude}`)}`
        : "";

    if (attendee?.status === "checked_in") {

        return (

            <Screen
                bg="#78350f"
                icon="⚠️"
                title="QR ya utilizado"
                text={`${attendee.name} ya registró su ingreso`}
                extra={`Evento: ${attendee.event_name}`}
            />

        );
    }

    // =========================
    // PENDING
    // =========================

    if (!attendee?.can_check_in && attendee?.status !== "confirmed") {

        const pendingText =
            attendee?.event_status !== "active"
                ? "El evento todavía no está habilitado para acreditar ingresos"
                : "La asistencia todavía no está confirmada";

        return (

            <Screen
                bg="#78350f"
                icon="⚠️"
                title="Acreditación pendiente"
                text={pendingText}
                extra={`Evento: ${attendee?.event_name || "-"}`}
            />

        );
    }

    // =========================
    // VALID CREDENTIAL
    // =========================

    return (

        <div className="tags_event_access_page">
            <article className="tags_event_access_card">
                <header>{attendee.logo_url && <img src={attendee.logo_url} alt={attendee.business_name || "Organizador"} />}<div><small>ACCESO AL EVENTO</small><strong>{attendee.business_name}</strong></div></header>
                <section>
                    <span>Evento</span><h1>{attendee.event_name}</h1>
                    {(attendee.location || attendee.address) && <div className="tags_event_access_location"><FaLocationDot /><div>{attendee.location && <strong>{attendee.location}</strong>}{attendee.address && <small>{attendee.address}</small>}</div></div>}
                    {directionsUrl && <a className="tags_event_access_directions" href={directionsUrl} target="_blank" rel="noreferrer"><FaRoute /> Cómo llegar</a>}
                    {schedule && <div className="tags_event_access_schedule"><span><FaCalendarDays /> {schedule.date}</span><span><FaClock /> {schedule.time} hs</span></div>}
                    {attendee.credential_note && <p className="tags_event_access_note">{attendee.credential_note}</p>}
                    <h2>{attendee.name}</h2>{qrImage ? <img className="tags_event_access_qr" src={qrImage} alt={`QR de acceso de ${attendee.name}`} /> : <TagsSpinner />}{attendee.qr_code && <code className="tags_event_access_code">{attendee.qr_code}</code>}<p>Presentá este código al personal para registrar tu ingreso.</p>
                </section>
                <footer><strong>{attendee.can_check_in ? "Habilitada para el ingreso" : "Inscripción confirmada"}</strong><small>{attendee.can_check_in ? "Presentala en el acceso" : "Se habilitará para acreditar cuando comience el evento"} · Credencial personal</small></footer>
            </article>
        </div>

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
