"use client";

import { useEffect, useState }
    from "react";

import { useRouter }
    from "next/navigation";

import showAlert
    from "@/app/components/showAlert";

import "../../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";

export default function EventInvitationsPageClient({

    session,
    eventId,
    modules

}) {

    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [invitations, setInvitations] =
        useState([]);

    const [showModal, setShowModal] =
        useState(false);

    const [form, setForm] =
        useState({

            title: "",

            template_id: "",

            theme_id: "",

            is_public: true,

            requires_password: false,

            password: ""
        });

    useEffect(() => {

        if (!eventId) return;

        load();

    }, [eventId]);

    async function load() {

        try {

            setLoading(true);

            const res =
                await fetch(

                    `/api/events/invitations/list?event_id=${eventId}`,

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
                        "Error cargando invitaciones",

                    icon: "error"
                });

                return;
            }

            setInvitations(
                data.invitations || []
            );

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    function openCreate() {

        setForm({

            title: "",

            template_id: "",

            theme_id: "",

            is_public: true,

            requires_password: false,

            password: ""
        });

        setShowModal(true);
    }

    async function createInvitation() {

        try {

            if (!form.title) {

                showAlert({

                    title: "Error",

                    text:
                        "Ingresá un título",

                    icon: "error"
                });

                return;
            }

            setSaving(true);

            const res =
                await fetch(
                    "/api/events/invitations/create",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                event_id:
                                    Number(eventId),

                                title:
                                    form.title,

                                template_id:
                                    form.template_id || null,

                                theme_id:
                                    form.theme_id || null,

                                is_public:
                                    form.is_public,

                                requires_password:
                                    form.requires_password,

                                password:
                                    form.password || null
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

            setShowModal(false);

            await load();

            showAlert({

                title: "OK",

                text:
                    "Invitación creada",

                icon: "success"
            });

        } catch (err) {

            console.log(err);

        } finally {

            setSaving(false);
        }
    }

    async function publishInvitation(id) {

        const confirm =
            await showAlert({

                title:
                    "Publicar invitación",

                text:
                    "La invitación quedará disponible",

                icon: "question",

                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const res =
                await fetch(
                    "/api/events/invitations/publish",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                invitation_id:
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

    async function duplicateInvitation(id) {

        try {

            const res =
                await fetch(
                    "/api/events/invitations/duplicate",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                invitation_id:
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

            await load();

            showAlert({

                title: "OK",

                text:
                    "Invitación duplicada",

                icon: "success"
            });

        } catch (err) {

            console.log(err);
        }
    }

    async function deleteInvitation(id) {

        const confirm =
            await showAlert({

                title:
                    "Eliminar invitación",

                text:
                    "Esta acción no se puede deshacer",

                icon: "warning",

                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const res =
                await fetch(
                    "/api/events/invitations/delete",
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

            await load();

        } catch (err) {

            console.log(err);
        }
    }


    async function unpublishInvitation(id) {

        const confirm =
            await showAlert({

                title:
                    "Despublicar invitación",

                text:
                    "Los links públicos dejarán de estar disponibles. ¿Continuar?",

                icon:
                    "warning",

                showCancelButton:
                    true
            });

        if (!confirm) return;

        try {

            const res =
                await fetch(
                    "/api/events/invitations/unpublish",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                invitation_id:
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
                        data.error ||
                        "No se pudo despublicar",
                    icon: "error"
                });

                return;
            }

            await load();

            showAlert({
                title: "OK",
                text: "Invitación despublicada",
                icon: "success"
            });

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "No se pudo despublicar",
                icon: "error"
            });
        }
    }

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

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 24
                    }}
                >

                    <div>

                        <h2>
                            ✉️ Invitaciones
                        </h2>

                        <p>
                            Administración de invitaciones digitales.
                        </p>

                    </div>

                    <button
                        className="tags_btn"
                        onClick={openCreate}
                    >
                        ✚ Nueva Invitación
                    </button>

                </div>

                <div className="table-responsive">

                    <table className="tags_table tags_text_normal">

                        <thead>

                            <tr>

                                <th>Título</th>

                                <th>Template</th>

                                <th>Theme</th>

                                <th>Invitados</th>

                                <th>Estado</th>

                                <th>Creación</th>

                                <th>Acciones</th>

                            </tr>

                        </thead>

                        <tbody>

                            {
                                invitations.map(item => (

                                    <tr
                                        key={item.id}
                                    >

                                        <td>

                                            <strong>
                                                {item.title}
                                            </strong>

                                        </td>

                                        <td>
                                            {
                                                item.template_name
                                                ||
                                                "-"
                                            }
                                        </td>

                                        <td>
                                            {
                                                item.theme_name
                                                ||
                                                "-"
                                            }
                                        </td>

                                        <td>

                                            <span className="tags_badge">

                                                {
                                                    item.total_guests || 0
                                                }

                                            </span>

                                        </td>

                                        <td>

                                            {
                                                item.published_at
                                                    &&
                                                    Number(item.is_active) === 1
                                                    ?
                                                    (
                                                        <span className="tags_badge_success">
                                                            Publicada
                                                        </span>
                                                    )
                                                    :
                                                    (
                                                        <span className="tags_badge_warning">
                                                            Borrador
                                                        </span>
                                                    )
                                            }

                                        </td>

                                        <td>

                                            {
                                                item.created_at
                                                    ?
                                                    new Date(
                                                        item.created_at
                                                    ).toLocaleDateString()
                                                    :
                                                    "-"
                                            }

                                        </td>

                                        <td>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 6,
                                                    flexWrap: "wrap"
                                                }}
                                            >

                                                <button
                                                    className="icon_btn"
                                                    title="Diseñar"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/events/${eventId}/invitations/${item.id}/builder`
                                                        )
                                                    }
                                                >
                                                    🧩
                                                </button>

                                                <button
                                                    className="icon_btn"
                                                    title="Media"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/events/${eventId}/invitations/${item.id}/media`
                                                        )
                                                    }
                                                >
                                                    🖼
                                                </button>

                                                <button
                                                    className="icon_btn"
                                                    title="Invitados"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/events/${eventId}/invitations/${item.id}/guests`
                                                        )
                                                    }
                                                >
                                                    👥
                                                </button>

                                                <button
                                                    className="icon_btn"
                                                    title="Envíos"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/events/${eventId}/invitations/${item.id}/sending`
                                                        )
                                                    }
                                                >
                                                    📨
                                                </button>

                                                <button
                                                    className="icon_btn"
                                                    title="Estadísticas"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/events/${eventId}/invitations/${item.id}/analytics`
                                                        )
                                                    }
                                                >
                                                    📊
                                                </button>

                                                {
                                                    item.published_at
                                                        &&
                                                        Number(item.is_active) === 1
                                                        ?
                                                        (
                                                            <button
                                                                className="icon_btn warning"
                                                                title="Despublicar"
                                                                onClick={() =>
                                                                    unpublishInvitation(
                                                                        item.id
                                                                    )
                                                                }
                                                            >
                                                                ⏸
                                                            </button>
                                                        )
                                                        :
                                                        (
                                                            <button
                                                                className="icon_btn success"
                                                                title="Publicar"
                                                                onClick={() =>
                                                                    publishInvitation(
                                                                        item.id
                                                                    )
                                                                }
                                                            >
                                                                📢
                                                            </button>
                                                        )
                                                }

                                                <button
                                                    className="icon_btn"
                                                    title="Duplicar"
                                                    onClick={() =>
                                                        duplicateInvitation(
                                                            item.id
                                                        )
                                                    }
                                                >
                                                    📄
                                                </button>

                                                <button
                                                    className="icon_btn danger"
                                                    title="Eliminar"
                                                    onClick={() =>
                                                        deleteInvitation(
                                                            item.id
                                                        )
                                                    }
                                                >
                                                    🗑
                                                </button>

                                            </div>

                                        </td>

                                    </tr>

                                ))
                            }

                        </tbody>

                    </table>

                </div>

            </div>

            {
                showModal
                &&
                (

                    <div className="tags_modal_overlay">

                        <div
                            className="tags_modal"
                            style={{
                                maxWidth: 600
                            }}
                        >

                            <div
                                className="tags_modal_header"
                            >

                                <h3>
                                    Nueva Invitación
                                </h3>

                                <button
                                    className="tags_modal_close"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                >
                                    ✕
                                </button>

                            </div>

                            <div className="tags_modal_body">

                                <div className="mb-3">

                                    <label>
                                        Título
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        value={form.title}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                title:
                                                    e.target.value
                                            })
                                        }
                                    />

                                </div>

                                <div className="form-check mb-3">

                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={form.is_public}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                is_public:
                                                    e.target.checked
                                            })
                                        }
                                    />

                                    <label
                                        className="form-check-label"
                                    >
                                        Invitación pública
                                    </label>

                                </div>

                                <div className="form-check mb-3">

                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={form.requires_password}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                requires_password:
                                                    e.target.checked
                                            })
                                        }
                                    />

                                    <label
                                        className="form-check-label"
                                    >
                                        Requiere contraseña
                                    </label>

                                </div>

                                {
                                    form.requires_password
                                    &&
                                    (
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Contraseña"
                                            value={form.password}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    password:
                                                        e.target.value
                                                })
                                            }
                                        />
                                    )
                                }

                            </div>

                            <div
                                className="tags_modal_actions"
                            >

                                <button
                                    className="tags_modal_btn tags_modal_btn_cancel"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="tags_btn"
                                    onClick={createInvitation}
                                    disabled={saving}
                                >
                                    {
                                        saving
                                            ? "Guardando..."
                                            : "Crear Invitación"
                                    }
                                </button>

                            </div>

                        </div>

                    </div>

                )
            }

            <div
                style={{
                    minHeight: 200
                }}
            />

        </div>

    );
}