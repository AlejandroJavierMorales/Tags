"use client";

import {
    useEffect,
    useMemo,
    useState
} from "react";

import { useRouter }
    from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import "../../../../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";

import TagsSpinner
    from "@/app/components/TagsSpinner";

export default function InvitationSendingPageClient({
    session,
    eventId,
    invitationId,
    modules
}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [sending, setSending] =
        useState(false);

    const [guests, setGuests] =
        useState([]);

    const [invitation, setInvitation] =
        useState(null);

    const [result, setResult] =
        useState(null);

    const [template, setTemplate] =
        useState(null);

    const [savingTemplate, setSavingTemplate] =
        useState(false);

    const [previewMode, setPreviewMode] =
        useState("initial");

    const [testEmail, setTestEmail] =
        useState("");

    useEffect(() => {

        if (!invitationId) return;

        load();

    }, [invitationId]);


    /* Load */
    async function load() {

        try {

            setLoading(true);

            const res =
                await fetch(
                    `/api/events/invitations/guests/list?invitation_id=${invitationId}`,
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
                        "Error cargando invitados",
                    icon: "error"
                });

                return;
            }

            setGuests(
                data.data || []
            );

            setInvitation(
                data.invitation || null
            );
            /* Templates de Email */
            const templateRes =
                await fetch(
                    `/api/events/invitations/email-template/get?invitation_id=${invitationId}`,
                    {
                        cache: "no-store"
                    }
                );

            const templateData =
                await templateRes.json();

            if (templateRes.ok) {

                setTemplate(
                    templateData.template
                );

                setInvitation(
                    templateData.invitation
                );
            }

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "No se pudo cargar la información de envío",
                icon: "error"
            });

        } finally {

            setLoading(false);
        }
    }

    const stats =
        useMemo(() => {

            const total =
                guests.length;

            const withEmail =
                guests.filter(item =>
                    item.email
                ).length;

            const sent =
                guests.filter(item =>
                    item.invitation_status === "sent"
                    ||
                    item.invitation_status === "opened"
                ).length;

            const opened =
                guests.filter(item =>
                    item.viewed_at
                ).length;

            const confirmed =
                guests.filter(item =>
                    item.rsvp_status === "confirmed"
                ).length;

            const declined =
                guests.filter(item =>
                    item.rsvp_status === "declined"
                ).length;

            const pendingRsvp =
                guests.filter(item =>
                    !item.rsvp_status
                    ||
                    item.rsvp_status === "pending"
                ).length;

            const pendingSend =
                guests.filter(item =>
                    !item.invitation_status
                    ||
                    item.invitation_status === "not_sent"
                    ||
                    item.invitation_status === "failed"
                ).length;

            return {
                total,
                withEmail,
                sent,
                opened,
                confirmed,
                declined,
                pendingRsvp,
                pendingSend
            };

        }, [guests]);

    async function sendBulk(mode) {

        const texts = {
            all:
                "Se enviará la invitación a todos los invitados asociados.",
            pending:
                "Se enviará sólo a invitados pendientes o fallidos.",
            not_responded:
                "Se enviará recordatorio a quienes todavía no respondieron.",
            confirmed:
                "Se enviará recordatorio a invitados confirmados."
        };

        const confirmed =
            await showAlert({
                title: "Confirmar envío",
                text:
                    texts[mode] ||
                    "Se enviarán invitaciones.",
                icon: "question",
                showCancelButton: true
            });

        if (!confirmed) return;

        try {

            setSending(true);
            setResult(null);

            const res =
                await fetch(
                    "/api/events/invitations/guests/send-bulk",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                invitation_id:
                                    Number(invitationId),

                                mode
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo realizar el envío",
                    icon: "error"
                });

                return;
            }

            setResult(data);

            await load();

            showAlert({
                title: "Envío finalizado",
                text:
                    `Enviadas: ${data.sent}. Fallidas: ${data.failed}.`,
                icon: data.failed > 0
                    ? "warning"
                    : "success"
            });

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "Error enviando invitaciones",
                icon: "error"
            });

        } finally {

            setSending(false);
        }
    }

    /* templates */
    function updateTemplate(
        key,
        value
    ) {

        setTemplate(prev => ({
            ...(prev || {}),
            [key]: value
        }));
    }

    async function saveTemplate() {

        try {

            setSavingTemplate(true);

            const res =
                await fetch(
                    "/api/events/invitations/email-template/save",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                invitation_id:
                                    Number(invitationId),

                                ...template
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo guardar la plantilla",
                    icon: "error"
                });

                return;
            }

            showAlert({
                title: "OK",
                text: "Plantilla guardada",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSavingTemplate(false);
        }
    }

    /* envio de prueba */
    async function sendTestEmail() {

        if (!testEmail) {

            showAlert({
                title: "Atención",
                text: "Ingresá un email para enviar la prueba",
                icon: "warning"
            });

            return;
        }

        const confirmed =
            await showAlert({
                title: "Enviar prueba",
                text: `Se enviará una prueba a ${testEmail}`,
                icon: "question",
                showCancelButton: true
            });

        if (!confirmed) return;

        try {

            setSending(true);

            const res =
                await fetch(
                    "/api/events/invitations/guests/send-test",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                invitation_id:
                                    Number(invitationId),

                                mode:
                                    previewMode,

                                test_email:
                                    testEmail
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "No se pudo enviar la prueba",
                    icon: "error"
                });

                return;
            }

            showAlert({
                title: "OK",
                text: `Prueba enviada a ${testEmail}`,
                icon: "success"
            });

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "No se pudo enviar la prueba",
                icon: "error"
            });

        } finally {

            setSending(false);
        }
    }

    return (

        <div className="container-fluid tags_container m-0 p-0 tags_text_normal">

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

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 24,
                        gap: 12,
                        flexWrap: "wrap"
                    }}
                >

                    <div>

                        <h2>
                            📨 Envíos de invitación
                        </h2>

                        <p>
                            Envío masivo y recordatorios de esta invitación.
                        </p>

                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: 4,
                            flexWrap: "wrap"
                        }}
                    >

                        <button
                            className="icon_btn m-1"
                            title="Volver a invitaciones"
                            onClick={() =>
                                router.push(
                                    `/dashboard/events/${eventId}/invitations`
                                )
                            }
                        >
                            ←
                        </button>

                        <button
                            className="icon_btn m-1"
                            title="Diseñador"
                            onClick={() =>
                                router.push(
                                    `/dashboard/events/${eventId}/invitations/${invitationId}/builder`
                                )
                            }
                        >
                            🧩
                        </button>

                        <button
                            className="icon_btn m-1"
                            title="Invitados"
                            onClick={() =>
                                router.push(
                                    `/dashboard/events/${eventId}/invitations/${invitationId}/guests`
                                )
                            }
                        >
                            👥
                        </button>

                        <button
                            className="icon_btn m-1"
                            title="Media"
                            onClick={() =>
                                router.push(
                                    `/dashboard/events/${eventId}/invitations/${invitationId}/media`
                                )
                            }
                        >
                            🖼
                        </button>

                    </div>

                </div>

                {
                    loading
                    &&
                    <TagsSpinner />
                }

                {
                    !loading
                    &&
                    (
                        <>

                            <div className="row g-3 mb-4">

                                <StatCard
                                    title="Invitados"
                                    value={stats.total}

                                />

                                <StatCard
                                    title="Con email"
                                    value={stats.withEmail}
                                />

                                <StatCard
                                    title="Enviadas"
                                    value={stats.sent}
                                />

                                <StatCard
                                    title="Abiertas"
                                    value={stats.opened}
                                />

                                <StatCard
                                    title="Pendientes envío"
                                    value={stats.pendingSend}
                                />

                                <StatCard
                                    title="Sin responder"
                                    value={stats.pendingRsvp}
                                />

                                <StatCard
                                    title="Confirmados"
                                    value={stats.confirmed}
                                />

                                <StatCard
                                    title="Rechazados"
                                    value={stats.declined}
                                />

                            </div>
                            <div className="card mb-4">

                                <div className="card-body">

                                    <h5 className="mb-4">
                                        Configuración del email
                                    </h5>

                                    <div className="row g-3">

                                        <div className="col-md-6">

                                            <label>
                                                Remitente
                                            </label>

                                            <input
                                                className="form-control tags_text_normal"
                                                value={template?.sender_name || ""}
                                                onChange={(e) =>
                                                    updateTemplate(
                                                        "sender_name",
                                                        e.target.value
                                                    )
                                                }
                                            />

                                        </div>

                                        <div className="col-md-6">

                                            <label>
                                                Vista previa
                                            </label>

                                            <select
                                                className="form-control"
                                                value={previewMode}
                                                onChange={(e) =>
                                                    setPreviewMode(
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="initial">
                                                    Invitación inicial
                                                </option>

                                                <option value="reminder">
                                                    Recordatorio no respondidos
                                                </option>

                                                <option value="confirmed">
                                                    Recordatorio confirmados
                                                </option>
                                            </select>

                                        </div>

                                        <TemplateFields
                                            title="Invitación inicial"
                                            subjectKey="initial_subject"
                                            messageKey="initial_message"
                                            template={template}
                                            updateTemplate={updateTemplate}
                                        />

                                        <TemplateFields
                                            title="Recordatorio no respondidos"
                                            subjectKey="reminder_subject"
                                            messageKey="reminder_message"
                                            template={template}
                                            updateTemplate={updateTemplate}
                                        />

                                        <TemplateFields
                                            title="Recordatorio confirmados"
                                            subjectKey="confirmed_subject"
                                            messageKey="confirmed_message"
                                            template={template}
                                            updateTemplate={updateTemplate}
                                        />

                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            marginTop: 18,
                                            flexWrap: "wrap"
                                        }}
                                    >

                                        <button
                                            className="tags_btn"
                                            onClick={saveTemplate}
                                            disabled={savingTemplate}
                                        >
                                            {
                                                savingTemplate
                                                    ? "Guardando..."
                                                    : "Guardar plantilla"
                                            }
                                        </button>

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: 8,
                                                marginTop: 18,
                                                flexWrap: "wrap",
                                                alignItems: "center"
                                            }}
                                        >

                                            <input
                                                className="form-control tags_text_normal"
                                                style={{
                                                    maxWidth: 320
                                                }}
                                                placeholder="Email para prueba"
                                                value={testEmail}
                                                onChange={(e) =>
                                                    setTestEmail(
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            <button
                                                className="tags_modal_btn tags_modal_btn_cancel"
                                                onClick={sendTestEmail}
                                                disabled={sending}
                                            >
                                                📨 Enviar prueba
                                            </button>

                                        </div>

                                    </div>

                                </div>
                                {/* Previo Template Email */}
                                <div className="card mb-4 m-2">

                                    <div className="card-body">

                                        <h5>
                                            Vista previa del email
                                        </h5>

                                        <EmailPreview
                                            invitation={invitation}
                                            template={template}
                                            mode={previewMode}
                                        />

                                    </div>

                                </div>

                            </div>

                            <div className="row g-3 mb-4">

                                <ActionCard
                                    title="Enviar a todos"
                                    text="Envía la invitación a todos los invitados asociados."
                                    icon="📨"
                                    disabled={sending}
                                    onClick={() =>
                                        sendBulk("all")
                                    }
                                />

                                <ActionCard
                                    title="Enviar pendientes"
                                    text="Sólo invitados no enviados o con envío fallido."
                                    icon="📩"
                                    disabled={sending}
                                    onClick={() =>
                                        sendBulk("pending")
                                    }
                                />

                                <ActionCard
                                    title="Recordar no respondidos"
                                    text="Reenvía invitación a quienes aún no confirmaron ni rechazaron."
                                    icon="⏰"
                                    disabled={sending}
                                    onClick={() =>
                                        sendBulk("not_responded")
                                    }
                                />

                                <ActionCard
                                    title="Recordar confirmados"
                                    text="Envía recordatorio a quienes ya confirmaron."
                                    icon="✅"
                                    disabled={sending}
                                    onClick={() =>
                                        sendBulk("confirmed")
                                    }
                                />

                            </div>

                            {
                                result
                                &&
                                (
                                    <div className="card mb-4">

                                        <div className="card-body">

                                            <h5>
                                                Resultado del último envío
                                            </h5>

                                            <p>
                                                Total procesados: {result.total}
                                            </p>

                                            <p>
                                                Enviados: {result.sent}
                                            </p>

                                            <p>
                                                Fallidos: {result.failed}
                                            </p>

                                            {
                                                result.errors?.length > 0
                                                &&
                                                (
                                                    <div>

                                                        <strong>
                                                            Errores
                                                        </strong>

                                                        <ul>
                                                            {
                                                                result.errors.map(
                                                                    (err, index) => (
                                                                        <li key={index}>
                                                                            {err.attendee || err.guest_id}: {err.error}
                                                                        </li>
                                                                    )
                                                                )
                                                            }
                                                        </ul>

                                                    </div>
                                                )
                                            }

                                        </div>

                                    </div>
                                )
                            }

                            <div className="card">

                                <div className="card-body">

                                    <h5>
                                        Invitados asociados
                                    </h5>

                                    <div className="table-responsive">

                                        <table className="tags_table tags_text_normal">

                                            <thead>

                                                <tr>
                                                    <th>Invitado</th>
                                                    <th>Email</th>
                                                    <th>Envío</th>
                                                    <th>RSVP</th>
                                                    <th>Visto</th>
                                                </tr>

                                            </thead>

                                            <tbody>

                                                {
                                                    guests.map(item => (

                                                        <tr key={item.id}>

                                                            <td>
                                                                <strong>
                                                                    {item.name}
                                                                </strong>
                                                            </td>

                                                            <td>
                                                                {item.email || "-"}
                                                            </td>

                                                            <td>
                                                                {item.invitation_status || "not_sent"}
                                                            </td>

                                                            <td>
                                                                {item.rsvp_status || "pending"}
                                                            </td>

                                                            <td>
                                                                {
                                                                    item.viewed_at
                                                                        ? new Date(item.viewed_at)
                                                                            .toLocaleString("es-AR")
                                                                        : "-"
                                                                }
                                                            </td>

                                                        </tr>
                                                    ))
                                                }

                                            </tbody>

                                        </table>

                                    </div>

                                </div>

                            </div>

                        </>
                    )
                }

            </div>

            <div
                style={{
                    minHeight: 200
                }}
            />

        </div>
    );
}

function StatCard({
    title,
    value
}) {

    return (

        <div className="col-6 col-md-3">

            <div
                style={{
                    background:
                        "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)",
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 16
                }}
            >

                <small>
                    {title}
                </small>

                <h3>
                    {value}
                </h3>

            </div>

        </div>
    );
}

function ActionCard({
    title,
    text,
    icon,
    disabled,
    onClick
}) {

    return (

        <div className="col-12 col-md-6 col-xl-3">

            <div
                style={{
                    background: "#e0fae4",
                    border: "1px solid #e5e7eb",
                    borderRadius: 18,
                    padding: 18,
                    height: "100%"
                }}
            >

                <div
                    style={{
                        fontSize: 28,
                        marginBottom: 8
                    }}
                >
                    {icon}
                </div>

                <h5>
                    {title}
                </h5>

                <p
                    style={{
                        color: "#666",
                        fontSize: 14,
                        minHeight: 58
                    }}
                >
                    {text}
                </p>

                <button
                    className="tags_btn"
                    disabled={disabled}
                    onClick={onClick}
                >
                    {
                        disabled
                            ? "Enviando..."
                            : "Ejecutar"
                    }
                </button>

            </div>

        </div>
    );
}
/* Fuera de la Pagina */
function TemplateFields({
    title,
    subjectKey,
    messageKey,
    template,
    updateTemplate
}) {

    return (

        <div className="col-12">

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 14,
                    background: "#f9fafb"
                }}
            >

                <h6>
                    {title}
                </h6>

                <div className="mb-3">

                    <label>
                        Asunto
                    </label>

                    <input
                        className="form-control tags_text_normal"
                        value={template?.[subjectKey] || ""}
                        onChange={(e) =>
                            updateTemplate(
                                subjectKey,
                                e.target.value
                            )
                        }
                    />

                </div>

                <div>

                    <label>
                        Mensaje
                    </label>

                    <textarea
                        className="form-control tags_text_normal"
                        rows={4}
                        value={template?.[messageKey] || ""}
                        onChange={(e) =>
                            updateTemplate(
                                messageKey,
                                e.target.value
                            )
                        }
                    />

                </div>

            </div>

        </div>
    );
}

function EmailPreview({
    invitation,
    template,
    mode
}) {

    const subject =
        mode === "reminder"
            ? template?.reminder_subject
            : mode === "confirmed"
                ? template?.confirmed_subject
                : template?.initial_subject;

    const message =
        mode === "reminder"
            ? template?.reminder_message
            : mode === "confirmed"
                ? template?.confirmed_message
                : template?.initial_message;

    return (

        <div
            style={{
                maxWidth: 620,
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                overflow: "hidden",
                background: "#fff"
            }}
        >

            <div
                style={{
                    background: "#111827",
                    color: "#fff",
                    padding: 18
                }}
            >
                <strong>
                    {subject || invitation?.title || "Invitación"}
                </strong>
            </div>

            <div
                style={{
                    padding: 22
                }}
            >

                <p>
                    Hola Andrea,
                </p>

                <p
                    style={{
                        whiteSpace: "pre-line"
                    }}
                >
                    {message}
                </p>

                <button
                    type="button"
                    style={{
                        border: "none",
                        background: "#111827",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "12px 18px",
                        fontWeight: 700
                    }}
                >
                    Ver invitación
                </button>

                <p
                    style={{
                        marginTop: 20,
                        fontSize: 12,
                        color: "#666"
                    }}
                >
                    Este es un ejemplo de cómo recibirá el email el invitado.
                </p>

            </div>

        </div>
    );
}