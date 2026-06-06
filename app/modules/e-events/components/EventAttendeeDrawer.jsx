"use client";

import showAlert from "@/app/components/showAlert";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
    FiX,
    FiDownload,
    FiMail,
    FiPhone,
    FiUser,
    FiCheckCircle,
    FiClock,
    FiUsers,
    FiAlertCircle,
    FiFileText,
    FiSave,
    FiTag,
    FiChevronDown,
    FiEdit2,
    FiTrash2
} from "react-icons/fi";
import AttendeeDietarySection from "./drawerComponents/EventAttendeeDietarySection";

export default function EventAttendeeDrawer({

    attendee,
    isOpen,
    onClose,
    onDownloadQr,
    onUpdated

}) {

    const router = useRouter();

    const [tables, setTables] = useState([]);
    const [saving, setSaving] = useState(false);

    const [companions, setCompanions] =
        useState([]);

    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [selectedTags, setSelectedTags] = useState([]);
    const [attendeeTags, setAttendeeTags] =
        useState([]);
    const [tagSearch, setTagSearch] =
        useState("");

    const [allTags, setAllTags] =
        useState([]);

    const [activeTab, setActiveTab] =
        useState("general");

    const [form, setForm] =
        useState({

            name: "",
            email: "",
            phone: "",

            status: "pending",

            invitation_status:
                "not_sent",

            plus_ones_allowed: 0,

            dietary_notes: "",

            custom_dietary_notes: "",

            internal_notes: "",

            table_id: ""
        });
    const [showCompanionModal, setShowCompanionModal] =
        useState(false);

    const [editingCompanion, setEditingCompanion] =
        useState(null);

    const [companionForm, setCompanionForm] =
        useState({

            name: "",
            email: "",
            phone: "",

            attendee_status: "pending",

            dietary_notes: "",

            relation_type: "guest"
        });

    // =========================
    // LOAD
    // =========================

    useEffect(() => {

        if (!attendee) return;

        setForm({

            name:
                attendee.name || "",

            email:
                attendee.email || "",

            phone:
                attendee.phone || "",

            status:
                attendee.status || "pending",

            invitation_status:
                attendee.invitation_status
                ||
                "not_sent",

            plus_ones_allowed:
                attendee.plus_ones_allowed || 0,

            dietary_notes:
                attendee.dietary_notes || "",

            custom_dietary_notes:
                attendee.custom_dietary_notes || "",

            internal_notes:
                attendee.internal_notes || "",

            table_id:
                attendee.table_id || ""
        });

        setAttendeeTags(
            attendee.attendee_tags || []
        );
        setCompanions(
            attendee.companions || []
        );
        loadTables();
        loadTags();


    }, [attendee]);

    async function loadTables() {

        try {

            const res =
                await fetch(
                    `/api/events/tables/list?event_id=${attendee.event_id}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) return;

            setTables(
                data.data || []
            );

        } catch (err) {

            console.log(err);
        }
    }

    async function loadTags() {

        try {

            const res =
                await fetch(
                    `/api/events/tags/list`
                );

            const data =
                await res.json();

            if (data.ok) {

                setAllTags(
                    data.data || []
                );
            }

        } catch (err) {

            console.log(err);
        }
    }



    if (!isOpen || !attendee) return null;


    /* Acompañantes */
    function openCreateCompanion() {

        setEditingCompanion(null);

        setCompanionForm({

            name: "",
            email: "",
            phone: "",

            attendee_status: "pending",

            dietary_notes: "",

            relation_type: "guest"
        });

        setShowCompanionModal(true);
    }

    function openEditCompanion(companion) {

        setEditingCompanion(companion);

        setCompanionForm({

            name:
                companion.name || "",

            email:
                companion.email || "",

            phone:
                companion.phone || "",

            attendee_status:
                companion.attendee_status || "pending",

            dietary_notes:
                companion.dietary_notes || "",

            relation_type:
                companion.relation_type || "guest"
        });

        setShowCompanionModal(true);
    }

    /* Helpers de Validacion */
    // =========================
    // VALID EMAIL
    // =========================

    function isValidEmail(email) {

        if (!email) return true;

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        );
    }

    // =========================
    // VALID PHONE
    // =========================

    function isValidPhone(phone) {

        if (!phone) return true;

        return /^[0-9]{6,15}$/.test(phone);
    }


    async function saveCompanion() {
        // =========================
        // VALIDATIONS
        // =========================

        if (
            !companionForm.name?.trim()
        ) {

            showAlert({

                title: "Error",

                text:
                    "El nombre es obligatorio",

                icon: "error"
            });

            return;
        }

        if (
            !isValidEmail(
                companionForm.email
            )
        ) {

            showAlert({

                title: "Email inválido",

                text:
                    "Ingresá un email válido",

                icon: "warning"
            });

            return;
        }

        if (
            !isValidPhone(
                companionForm.phone
            )
        ) {

            showAlert({

                title: "Teléfono inválido",

                text:
                    "Ingresá un teléfono válido",

                icon: "warning"
            });

            return;
        }

        try {

            const endpoint =
                editingCompanion
                    ? "/api/events/companions/update"
                    : "/api/events/companions/create";

            const method =
                editingCompanion
                    ? "PUT"
                    : "POST";

            const payload = {

                ...companionForm,

                attendee_id:
                    attendee.id
            };

            if (editingCompanion) {

                payload.id =
                    editingCompanion.id;
            }

            const res =
                await fetch(
                    endpoint,
                    {

                        method,

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "Error guardando acompañante",

                    icon: "error"
                });

                return;
            }

            // =========================
            // SUCCESS
            // =========================

            showAlert({

                title: "OK",

                text:
                    editingCompanion
                        ? "Acompañante actualizado"
                        : "Acompañante creado correctamente",

                icon: "success"
            });

            if (editingCompanion) {

                setCompanions(prev =>

                    prev.map(item =>

                        item.id === editingCompanion.id
                            ? {
                                ...item,
                                ...payload
                            }
                            : item
                    )
                );

            } else {

                setCompanions(prev => [

                    ...prev,

                    {
                        ...payload,
                        id: data.id
                    }
                ]);
            }
            // =========================
            // CLOSE
            // =========================

            setShowCompanionModal(false);

            // =========================
            // RELOAD PARENT
            // =========================

            await onUpdated?.();

        } catch (err) {

            console.log(err);

            showAlert({

                title: "Error",

                text:
                    "Error interno",

                icon: "error"
            });
        }
    }

    async function removeCompanion(id) {

        const confirm =
            await showAlert({

                title:
                    "Eliminar acompañante?",

                text:
                    "Esta acción no se puede deshacer",

                icon: "warning",

                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const res =
                await fetch(
                    "/api/events/companions/delete",
                    {

                        method: "DELETE",

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

            showAlert({

                title: "OK",

                text:
                    "Acompañante eliminado",

                icon: "success"
            });
            setCompanions(prev =>

                prev.filter(item => item.id !== id)
            );
            await onUpdated?.();

        } catch (err) {

            console.log(err);
        }
    }

    /************ Tags ***************/
    async function assignMultipleTags() {

        try {

            if (!selectedTags.length) return;

            for (const tagId of selectedTags) {

                const res = await fetch(
                    "/api/events/attendee-tags/assign",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            attendee_id: attendee.id,
                            tag_id: tagId
                        })
                    }
                );

                if (!res.ok) {

                    const data = await res.json();

                    throw new Error(
                        data.error || "Error asignando tag"
                    );
                }

            }
            const newTags =
                allTags.filter(tag =>
                    selectedTags.includes(tag.id)
                );

            setAttendeeTags(prev => [
                ...prev,
                ...newTags
            ]);
            setSelectedTags([]);
            showAlert({

                title: "Tags asignadas",

                text:
                    "Las tags fueron asignadas correctamente",

                icon: "success"
            });

            setSelectedTags([]);
            setShowTagDropdown(false);

            onUpdated?.();

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }

    const availableTags =
        allTags.filter(tag => {

            // ocultar ya asignadas
            const alreadyAssigned =
                attendeeTags.some(
                    t => t.id === tag.id
                );

            if (alreadyAssigned) {
                return false;
            }

            // búsqueda
            if (!tagSearch.trim()) {
                return true;
            }

            return tag.name
                .toLowerCase()
                .includes(
                    tagSearch.toLowerCase()
                );
        });
    // =========================
    // SAVE
    // =========================

    async function save() {

        try {

            setSaving(true);

            const res =
                await fetch(
                    "/api/events/attendees/update",
                    {

                        method: "PUT",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                id:
                                    attendee.id,

                                ...form
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
                        "No se pudo guardar",

                    icon: "error"
                });

                return;
            }

            showAlert({

                title: "Actualizado",

                text:
                    "Invitado actualizado correctamente",

                icon: "success"
            });

            onUpdated?.();

        } catch (err) {

            console.log(err);

            showAlert({

                title: "Error",

                text:
                    "Error interno",

                icon: "error"
            });

        } finally {

            setSaving(false);
        }
    }

    // =========================
    // TAGS
    // =========================


    async function removeTag(tagId) {

        try {

            const res =
                await fetch(
                    "/api/events/attendee-tags/remove",
                    {

                        method: "DELETE",

                        headers: {

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                attendee_id:
                                    attendee.id,

                                tag_id:
                                    tagId
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
                        "No se pudo remover",

                    icon: "error"
                });

                return;
            }
            setAttendeeTags(prev =>
                prev.filter(tag => tag.id !== tagId)
            );
            onUpdated?.();

        } catch (err) {

            console.log(err);
        }
    }

    // =========================
    // STATUS
    // =========================

    function getAttendance() {

        switch (attendee.status) {

            case "confirmed":
                return {
                    label: "Confirmado",
                    color: "#16a34a",
                    bg: "#dcfce7"
                };

            case "declined":
                return {
                    label: "Rechazado",
                    color: "#dc2626",
                    bg: "#fee2e2"
                };

            case "checked_in":
                return {
                    label: "Ingresó al evento",
                    color: "#2563eb",
                    bg: "#dbeafe"
                };

            case "cancelled":
                return {
                    label: "Cancelado",
                    color: "#525252",
                    bg: "#e5e5e5"
                };

            default:
                return {
                    label: "Pendiente",
                    color: "#ca8a04",
                    bg: "#fef9c3"
                };
        }
    }

    function getInvitation() {

        switch (attendee.invitation_status) {

            case "opened":
                return {
                    label: "Abierta",
                    color: "#2563eb",
                    bg: "#dbeafe"
                };

            case "sent":
                return {
                    label: "Enviada",
                    color: "#7c3aed",
                    bg: "#ede9fe"
                };

            case "failed":
                return {
                    label: "Fallida",
                    color: "#dc2626",
                    bg: "#fee2e2"
                };

            default:
                return {
                    label: "No enviada",
                    color: "#525252",
                    bg: "#f5f5f5"
                };
        }
    }

    const attendance =
        getAttendance();

    const invitation =
        getInvitation();

    return (

        <>

            {/* OVERLAY */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,.25)",
                    zIndex: 9998,
                    backdropFilter: "blur(2px)"
                }}
            />

            {/* DRAWER */}
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    width: "100%",
                    maxWidth: 550,
                    height: "100vh",
                    background: "#f6f6f7",
                    zIndex: 9999,
                    overflowY: "auto",
                    boxShadow:
                        "-10px 0 40px rgba(0,0,0,.12)"
                }}
            >

                {/* HEADER */}
                <div
                    style={{
                        padding: 22,
                        background: "#fff",
                        borderBottom:
                            "1px solid #ececec",
                        position: "sticky",
                        top: 0,
                        zIndex: 5
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 16
                        }}
                    >

                        <div
                            style={{
                                minWidth: 0
                            }}
                        >

                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                    marginBottom: 14
                                }}
                            >

                                <Badge
                                    label={attendance.label}
                                    color={attendance.color}
                                    bg={attendance.bg}
                                />

                                <Badge
                                    label={invitation.label}
                                    color={invitation.color}
                                    bg={invitation.bg}
                                />

                            </div>

                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: "#111827",
                                    lineHeight: 1.2
                                }}
                            >
                                {form.name || "Invitado"}
                            </h2>

                            <div
                                style={{
                                    marginTop: 8,
                                    fontSize: 14,
                                    color: "#6b7280",
                                    wordBreak: "break-word"
                                }}
                            >
                                {form.email || "Sin email"}
                            </div>

                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                border:
                                    "1px solid #e5e7eb",
                                background:
                                    "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)",
                                color: "#111",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}
                        >
                            <FiX size={18} />
                        </button>

                    </div>

                </div>

                {/* TABS */}
                <div
                    style={{
                        position: "sticky",
                        top: 98,
                        zIndex: 4,
                        background: "#f6f6f7",
                        padding: "14px 18px 0 18px"
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            overflowX: "auto",
                            paddingBottom: 4
                        }}
                    >

                        <TabButton
                            active={
                                activeTab === "general"
                            }
                            onClick={() =>
                                setActiveTab("general")
                            }
                        >
                            General
                        </TabButton>

                        <TabButton
                            active={
                                activeTab === "event"
                            }
                            onClick={() =>
                                setActiveTab("event")
                            }
                        >
                            Evento
                        </TabButton>

                        <TabButton
                            active={
                                activeTab === "invitation"
                            }
                            onClick={() =>
                                setActiveTab("invitation")
                            }
                        >
                            Invitación
                        </TabButton>

                        <TabButton
                            active={
                                activeTab === "notes"
                            }
                            onClick={() =>
                                setActiveTab("notes")
                            }
                        >
                            Notas
                        </TabButton>

                    </div>

                </div>

                {/* BODY */}
                <div
                    style={{
                        padding: 18,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14
                    }}
                >

                    {/* GENERAL */}
                    {
                        activeTab === "general"
                        &&
                        (
                            <>

                                {/* PERSONAL */}
                                <Section
                                    title="Información personal"
                                    icon={<FiUser size={15} />}
                                >

                                    <Field label="Nombre">

                                        <input
                                            type="text"
                                            className="form-control tags_text_normal"
                                            value={form.name}
                                            onChange={e =>
                                                setForm({

                                                    ...form,

                                                    name:
                                                        e.target.value
                                                })
                                            }
                                        />

                                    </Field>

                                    <Field
                                        label={
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6
                                                }}
                                            >
                                                <FiMail size={14} />
                                                <span>Email</span>
                                            </div>
                                        }
                                    >

                                        <input
                                            type="email"
                                            className="form-control tags_text_normal"
                                            value={form.email}
                                            onChange={e =>
                                                setForm({

                                                    ...form,

                                                    email:
                                                        e.target.value
                                                })
                                            }
                                        />

                                    </Field>

                                    <Field
                                        label={
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6
                                                }}
                                            >
                                                <FiPhone size={14} />
                                                <span>Teléfono</span>
                                            </div>
                                        }
                                    >

                                        <input
                                            type="text"
                                            className="form-control tags_text_normal"
                                            value={form.phone}
                                            onChange={e =>
                                                setForm({

                                                    ...form,

                                                    phone:
                                                        e.target.value
                                                })
                                            }
                                        />

                                    </Field>

                                    <Info
                                        label="Código QR"
                                        value={attendee.qr_code}
                                    />

                                </Section>


                                {/* TAGS */}
                                <Section
                                    title="Tarjetas/Pases/Categorías"
                                    icon={<FiTag size={15} />}
                                >

                                    {/* TAGS ASIGNADAS */}
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 8
                                        }}
                                    >

                                        {
                                            attendeeTags.map(tag => (

                                                <div
                                                    key={tag.id}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        background: tag.color,
                                                        color: "#fff",
                                                        padding: "6px 10px",
                                                        borderRadius: 999,
                                                        fontSize: 12,
                                                        fontWeight: 600
                                                    }}
                                                >

                                                    {tag.name}

                                                    <button
                                                        onClick={() =>
                                                            removeTag(tag.id)
                                                        }
                                                        style={{
                                                            border: "none",
                                                            background: "transparent",
                                                            color: "#fff",
                                                            cursor: "pointer",
                                                            padding: 0,
                                                            display: "flex",
                                                            alignItems: "center"
                                                        }}
                                                    >

                                                        <FiX size={12} />

                                                    </button>

                                                </div>

                                            ))
                                        }

                                    </div>


                                    {/* MULTI SELECT TAGS */}
                                    {/* SELECT TAGS */}
                                    <div
                                        style={{
                                            position: "relative",
                                            marginTop: 14
                                        }}
                                    >

                                        {/* TRIGGER */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowTagDropdown(prev => !prev)
                                            }
                                            style={{
                                                width: "100%",
                                                height: 46,
                                                borderRadius: 14,
                                                border: "1px solid #e5e7eb",
                                                background: "#fff",
                                                padding: "0 14px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                cursor: "pointer",
                                                fontSize: 14,
                                                fontWeight: 500,
                                                color: "#111827"
                                            }}
                                        >

                                            <span>

                                                {
                                                    selectedTags.length > 0
                                                        ? `${selectedTags.length} seleccionadas`
                                                        : "Seleccionar tags"
                                                }

                                            </span>

                                            <FiChevronDown size={18} />

                                        </button>

                                        {/* DROPDOWN */}
                                        {
                                            showTagDropdown
                                            &&
                                            (
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        top: "calc(100% + 8px)",
                                                        left: 0,
                                                        right: 0,
                                                        background: "#fff",
                                                        border: "1px solid #e5e7eb",
                                                        borderRadius: 16,
                                                        overflow: "hidden",
                                                        zIndex: 50,
                                                        boxShadow:
                                                            "0 10px 30px rgba(0,0,0,.08)"
                                                    }}
                                                >

                                                    {/* LIST */}
                                                    <div
                                                        style={{
                                                            maxHeight: 240,
                                                            overflowY: "auto"
                                                        }}
                                                    >

                                                        {
                                                            availableTags.map(tag => {

                                                                const checked =
                                                                    selectedTags.some(
                                                                        id =>
                                                                            String(id)
                                                                            ===
                                                                            String(tag.id)
                                                                    );

                                                                return (

                                                                    <label
                                                                        key={tag.id}
                                                                        style={{
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            gap: 12,
                                                                            padding: "12px 14px",
                                                                            cursor: "pointer",
                                                                            borderBottom:
                                                                                "1px solid #f3f4f6"
                                                                        }}
                                                                    >

                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            onChange={() => {

                                                                                setSelectedTags(prev => {

                                                                                    const exists =
                                                                                        prev.some(
                                                                                            id =>
                                                                                                String(id)
                                                                                                ===
                                                                                                String(tag.id)
                                                                                        );

                                                                                    if (exists) {

                                                                                        return prev.filter(
                                                                                            id =>
                                                                                                String(id)
                                                                                                !==
                                                                                                String(tag.id)
                                                                                        );
                                                                                    }

                                                                                    return [
                                                                                        ...prev,
                                                                                        tag.id
                                                                                    ];
                                                                                });
                                                                            }}
                                                                        />

                                                                        <div
                                                                            style={{
                                                                                width: 12,
                                                                                height: 12,
                                                                                borderRadius: 999,
                                                                                background: tag.color,
                                                                                flexShrink: 0
                                                                            }}
                                                                        />

                                                                        <div
                                                                            style={{
                                                                                fontSize: 14,
                                                                                fontWeight: 500,
                                                                                color: "#111827"
                                                                            }}
                                                                        >
                                                                            {tag.name}
                                                                        </div>

                                                                    </label>

                                                                );
                                                            })
                                                        }

                                                        {
                                                            !availableTags.length
                                                            &&
                                                            (
                                                                <div
                                                                    style={{
                                                                        padding: 16,
                                                                        fontSize: 13,
                                                                        color: "#6b7280"
                                                                    }}
                                                                >
                                                                    No hay tags disponibles
                                                                </div>
                                                            )
                                                        }

                                                    </div>

                                                    {/* FOOTER */}
                                                    <div
                                                        style={{
                                                            padding: 12,
                                                            borderTop:
                                                                "1px solid #f3f4f6"
                                                        }}
                                                    >

                                                        <button
                                                            type="button"
                                                            onClick={assignMultipleTags}
                                                            disabled={
                                                                !selectedTags.length
                                                            }
                                                            className="tags_btn"
                                                            style={{
                                                                width: "100%",
                                                                opacity:
                                                                    !selectedTags.length
                                                                        ? .5
                                                                        : 1
                                                            }}
                                                        >

                                                            Asignar

                                                        </button>

                                                    </div>

                                                </div>
                                            )
                                        }

                                    </div>

                                </Section>

                            </>
                        )
                    }

                    {/* EVENT */}
                    {
                        activeTab === "event"
                        &&
                        (
                            <>

                                {/* STATUS */}
                                <Section
                                    title="Estado de asistencia"
                                    icon={<FiCheckCircle size={15} />}
                                >

                                    <Field label="Estado">

                                        <select
                                            className="form-select tags_text_normal"
                                            value={form.status}
                                            onChange={e =>
                                                setForm({

                                                    ...form,

                                                    status:
                                                        e.target.value
                                                })
                                            }
                                        >

                                            <option value="pending">
                                                Pendiente
                                            </option>

                                            <option value="confirmed">
                                                Confirmado
                                            </option>

                                            <option value="declined">
                                                Rechazado
                                            </option>

                                            <option value="checked_in">
                                                Ingresó al evento
                                            </option>

                                            <option value="cancelled">
                                                Cancelado
                                            </option>

                                        </select>

                                    </Field>

                                    <Info
                                        label="Confirmado el"
                                        value={
                                            attendee.confirmed_at
                                                ? new Date(
                                                    attendee.confirmed_at
                                                ).toLocaleString()
                                                : "-"
                                        }
                                    />

                                    <Info
                                        label="Ingreso al evento"
                                        value={
                                            attendee.checked_in_at
                                                ? new Date(
                                                    attendee.checked_in_at
                                                ).toLocaleString()
                                                : "-"
                                        }
                                    />

                                </Section>

                                {/* COMPANIONS */}
                                <Section
                                    title="Acompañantes"
                                    icon={<FiUsers size={15} />}
                                />

                                {/* STATS */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 10,
                                        marginBottom: 18
                                    }}
                                >

                                    <span className="tags_badge">
                                        Permitidos:
                                        {" "}
                                        {Number(form.plus_ones_allowed || 0)}
                                    </span>

                                    <span className="tags_badge">
                                        Creados:
                                        {" "}
                                        {companions?.length || 0}
                                    </span>

                                    <span className="tags_badge_success">
                                        Confirmados:
                                        {" "}
                                        {
                                            companions?.filter(
                                                c =>
                                                    c.attendee_status === "confirmed"
                                            ).length || 0
                                        }
                                    </span>

                                    <span className="tags_badge_warning">
                                        Seats reales:
                                        {" "}
                                        {1 + (companions?.length || 0)}
                                    </span>

                                </div>

                                {/* ACTIONS */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 10,
                                        flexWrap: "wrap",
                                        marginBottom: 22
                                    }}
                                >

                                    <button
                                        className="tags_btn"
                                        onClick={() => {

                                            router.push(
                                                `/dashboard/events/${eventId}/companions?attendee_id=${attendee.id}`
                                            );
                                        }}
                                    >
                                        <FiUsers />
                                        <span>
                                            Ver todos
                                        </span>
                                    </button>

                                    <button
                                        className="tags_btn"
                                        disabled={
                                            (
                                                companions?.length || 0
                                            )
                                            >=
                                            Number(form.plus_ones_allowed || 0)
                                        }
                                        onClick={() =>
                                            openCreateCompanion(attendee)
                                        }
                                    >
                                        ✚ Agregar
                                    </button>

                                </div>

                                {/* LIMIT */}
                                <Field label="Cantidad permitida">

                                    <input
                                        type="number"
                                        className="form-control tags_text_normal"
                                        value={
                                            form.plus_ones_allowed
                                        }
                                        onChange={e =>
                                            setForm({

                                                ...form,

                                                plus_ones_allowed:
                                                    e.target.value
                                            })
                                        }
                                    />

                                </Field>

                                {
                                    (
                                        companions?.length || 0
                                    )
                                    >=
                                    Number(form.plus_ones_allowed || 0)
                                    &&
                                    (
                                        <div
                                            style={{
                                                marginTop: 12,
                                                padding: 14,
                                                borderRadius: 14,
                                                background: "#fff8e1",
                                                color: "#8a6d3b",
                                                fontSize: 14,
                                                border: "1px solid #f5d27a"
                                            }}
                                        >
                                            ⚠ Se alcanzó el máximo de acompañantes permitidos.
                                        </div>
                                    )
                                }

                                {/* EMPTY */}
                                {
                                    !companions?.length
                                    &&
                                    (
                                        <div
                                            style={{
                                                padding: 18,
                                                borderRadius: 16,
                                                background: "#fafafa",
                                                border: "1px solid #ececec",
                                                fontSize: 14,
                                                color: "#666",
                                                marginTop: 20
                                            }}
                                        >
                                            No hay acompañantes cargados.
                                        </div>
                                    )
                                }

                                {/* LIST */}
                                {
                                    companions?.length > 0
                                    &&
                                    (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 14,
                                                marginTop: 20
                                            }}
                                        >

                                            {
                                                companions.map(companion => (

                                                    <div
                                                        key={companion.id}
                                                        style={{
                                                            border: "1px solid #ececec",
                                                            borderRadius: 18,
                                                            padding: 16,
                                                            background: "#fff"
                                                        }}
                                                    >

                                                        {/* HEADER */}
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "flex-start",
                                                                gap: 16,
                                                                marginBottom: 12
                                                            }}
                                                        >

                                                            <div>

                                                                <div
                                                                    style={{
                                                                        fontWeight: 700,
                                                                        fontSize: 16
                                                                    }}
                                                                >
                                                                    {companion.name}
                                                                </div>

                                                                <div
                                                                    style={{
                                                                        marginTop: 6,
                                                                        display: "flex",
                                                                        gap: 8,
                                                                        flexWrap: "wrap"
                                                                    }}
                                                                >

                                                                    <span className="tags_badge">
                                                                        {
                                                                            companion.attendee_status
                                                                        }
                                                                    </span>

                                                                    {
                                                                        companion.checked_in_at
                                                                        &&
                                                                        (
                                                                            <span className="tags_badge_success">
                                                                                Checked-in
                                                                            </span>
                                                                        )
                                                                    }

                                                                </div>

                                                            </div>

                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    gap: 8
                                                                }}
                                                            >

                                                                <button
                                                                    className="icon_btn"
                                                                    onClick={() =>
                                                                        openEditCompanion(companion)
                                                                    }
                                                                >
                                                                    <FiEdit2 />
                                                                </button>

                                                                <button
                                                                    className="icon_btn"
                                                                    onClick={() =>
                                                                        openCompanionQr(companion)
                                                                    }
                                                                >
                                                                    <FiDownload />
                                                                </button>

                                                                <button
                                                                    className="icon_btn"
                                                                    onClick={() =>
                                                                        removeCompanion(companion.id)
                                                                    }
                                                                >
                                                                    <FiTrash2 />
                                                                </button>

                                                            </div>

                                                        </div>

                                                        {/* INFO */}
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: 8
                                                            }}
                                                        >

                                                            {
                                                                companion.email
                                                                &&
                                                                (
                                                                    <Info
                                                                        label="Email"
                                                                        value={companion.email}
                                                                    />
                                                                )
                                                            }

                                                            {
                                                                companion.phone
                                                                &&
                                                                (
                                                                    <Info
                                                                        label="Teléfono"
                                                                        value={companion.phone}
                                                                    />
                                                                )
                                                            }

                                                            {
                                                                companion.dietary_notes
                                                                &&
                                                                (
                                                                    <Info
                                                                        label="Dietary"
                                                                        value={companion.dietary_notes}
                                                                    />
                                                                )
                                                            }

                                                        </div>

                                                    </div>

                                                ))
                                            }

                                        </div>
                                    )
                                }

                                {/* TABLE */}
                                <Section
                                    title="Mesa asignada"
                                    icon={<FiUsers size={15} />}
                                />

                                {
                                    (() => {

                                        const selectedTable =
                                            tables.find(
                                                t =>
                                                    String(t.id)
                                                    ===
                                                    String(form.table_id)
                                            );

                                        const realSeats =
                                            1 +
                                            (
                                                companions?.length || 0
                                            );

                                        const futureOccupancy =
                                            Number(
                                                selectedTable?.seats_reserved || 0
                                            )
                                            +
                                            realSeats;

                                        const exceeds =
                                            futureOccupancy >
                                            Number(selectedTable?.capacity || 0);

                                        return (

                                            <>

                                                <Field label="Mesa">

                                                    <select
                                                        className="form-select tags_text_normal"
                                                        value={form.table_id}
                                                        onChange={e =>
                                                            setForm({

                                                                ...form,

                                                                table_id:
                                                                    e.target.value
                                                            })
                                                        }
                                                    >

                                                        <option value="">
                                                            Sin mesa
                                                        </option>

                                                        {
                                                            tables.map(table => (

                                                                <option
                                                                    key={table.id}
                                                                    value={table.id}
                                                                >
                                                                    {table.name}
                                                                    {" · "}
                                                                    {table.available_seats}
                                                                    {" disponibles"}
                                                                </option>

                                                            ))
                                                        }

                                                    </select>

                                                </Field>

                                                {
                                                    selectedTable
                                                    &&
                                                    (
                                                        <div
                                                            style={{
                                                                marginTop: 20,
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: 10
                                                            }}
                                                        >

                                                            <Info
                                                                label="Capacidad"
                                                                value={
                                                                    selectedTable.capacity
                                                                }
                                                            />

                                                            <Info
                                                                label="Ocupación actual"
                                                                value={
                                                                    selectedTable.seats_reserved
                                                                }
                                                            />

                                                            <Info
                                                                label="Impacto real"
                                                                value={`+${realSeats}`}
                                                            />

                                                            <Info
                                                                label="Resultado"
                                                                value={`${futureOccupancy}/${selectedTable.capacity}`}
                                                            />

                                                            {
                                                                exceeds
                                                                &&
                                                                (
                                                                    <div
                                                                        style={{
                                                                            marginTop: 8,
                                                                            padding: 14,
                                                                            borderRadius: 14,
                                                                            background: "#fff5f5",
                                                                            border: "1px solid #f5b5b5",
                                                                            color: "#b42318",
                                                                            fontSize: 14,
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        ⚠ Mesa sin capacidad suficiente
                                                                    </div>
                                                                )
                                                            }

                                                        </div>
                                                    )
                                                }

                                            </>

                                        );

                                    })()
                                }

                            </>
                        )
                    }

                    {/* INVITATION */}
                    {
                        activeTab === "invitation"
                        &&
                        (
                            <Section
                                title="Invitación digital"
                                icon={<FiClock size={15} />}
                            >

                                <Field label="Estado de invitación">

                                    <select
                                        className="form-select tags_text_normal"
                                        value={
                                            form.invitation_status
                                        }
                                        onChange={e =>
                                            setForm({

                                                ...form,

                                                invitation_status:
                                                    e.target.value
                                            })
                                        }
                                    >

                                        <option value="not_sent">
                                            No enviada
                                        </option>

                                        <option value="sent">
                                            Enviada
                                        </option>

                                        <option value="opened">
                                            Abierta
                                        </option>

                                        <option value="failed">
                                            Fallida
                                        </option>

                                    </select>

                                </Field>

                                <Info
                                    label="Enviada el"
                                    value={
                                        attendee.invite_sent_at
                                            ? new Date(
                                                attendee.invite_sent_at
                                            ).toLocaleString()
                                            : "-"
                                    }
                                />

                                <Info
                                    label="Abierta el"
                                    value={
                                        attendee.invite_opened_at
                                            ? new Date(
                                                attendee.invite_opened_at
                                            ).toLocaleString()
                                            : "-"
                                    }
                                />

                            </Section>
                        )
                    }

                    {/* NOTES */}
                    {
                        activeTab === "notes"
                        &&
                        (
                            <>

                                {/* DIETARY */}
                                {/* DIETARY */}
                                <Section
                                    title="Restricciones alimentarias"
                                    icon={<FiAlertCircle size={15} />}
                                >

                                    <AttendeeDietarySection

                                        attendee={attendee}

                                        form={form}

                                        setForm={setForm}

                                        onUpdated={onUpdated}
                                    />

                                </Section>

                                {/* NOTES */}
                                <Section
                                    title="Notas internas"
                                    icon={<FiFileText size={15} />}
                                >

                                    <textarea
                                        className="form-control tags_text_normal"
                                        rows={4}
                                        value={
                                            form.internal_notes
                                        }
                                        onChange={e =>
                                            setForm({

                                                ...form,

                                                internal_notes:
                                                    e.target.value
                                            })
                                        }
                                    />

                                </Section>

                            </>
                        )
                    }

                    {/* ACTIONS */}
                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            paddingBottom: "50px",
                            marginTop: "10px"
                        }}
                    >

                        <button
                            onClick={() =>
                                onDownloadQr(attendee)
                            }
                            className="tags_modal_btn tags_modal_btn_cancel"
                        >

                            <FiDownload size={16} />

                            {` QR`}

                        </button>

                        <button
                            onClick={save}
                            disabled={saving}
                            className="tags_btn"
                        >

                            <FiSave />

                            {
                                saving
                                    ? " Guardando..."
                                    : " Guardar"
                            }

                        </button>

                    </div>

                </div>

            </div>

            {/* MODAL DE ACOMPAÑANTES */}
            {
                showCompanionModal
                &&
                (
                    <div className="tags_modal_overlay">

                        <div
                            className="tags_modal"
                            style={{
                                maxWidth: 620
                            }}
                        >

                            <div className="tags_modal_header">

                                <h3>

                                    {
                                        editingCompanion
                                            ? "Editar acompañante"
                                            : "Nuevo acompañante"
                                    }

                                </h3>

                                <button
                                    className="tags_modal_close"
                                    onClick={() =>
                                        setShowCompanionModal(false)
                                    }
                                >
                                    ✕
                                </button>

                            </div>

                            <div className="tags_modal_body">

                                <div className="mb-3">

                                    <label>
                                        Nombre
                                    </label>

                                    <input
                                        className="form-control"
                                        value={companionForm.name}
                                        onChange={e =>
                                            setCompanionForm({

                                                ...companionForm,

                                                name:
                                                    e.target.value
                                            })
                                        }
                                    />

                                </div>

                                <div className="mb-3">

                                    <label>
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        className="form-control"
                                        placeholder="ejemplo@mail.com"
                                        value={companionForm.email}
                                        onChange={e =>
                                            setCompanionForm({

                                                ...companionForm,

                                                email:
                                                    e.target.value
                                            })
                                        }
                                    />

                                </div>

                                <div className="mb-3">

                                    <label>
                                        Teléfono
                                    </label>

                                    <input
                                        type="tel"
                                        className="form-control"
                                        placeholder="3511234567"
                                        value={companionForm.phone}
                                        onChange={e => {

                                            // =========================
                                            // SOLO NÚMEROS
                                            // =========================

                                            const numeric =
                                                e.target.value.replace(
                                                    /\D/g,
                                                    ""
                                                );

                                            setCompanionForm({

                                                ...companionForm,

                                                phone:
                                                    numeric
                                            });
                                        }}
                                    />

                                </div>

                            </div>

                            <div className="tags_modal_actions">

                                <button
                                    className="tags_modal_btn tags_modal_btn_cancel"
                                    onClick={() =>
                                        setShowCompanionModal(false)
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="tags_btn"
                                    onClick={saveCompanion}
                                >
                                    {
                                        editingCompanion
                                            ? "Guardar cambios"
                                            : "Crear acompañante"
                                    }
                                </button>

                            </div>

                        </div>

                    </div>
                )
            }

        </>

    );
}

function TabButton({

    active,
    children,
    onClick

}) {

    return (

        <button
            onClick={onClick}
            style={{
                border: "none",
                height: 38,
                padding: "0 16px",
                borderRadius: 999,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: 600,
                transition: ".15s",

                background:
                    active
                        ? "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)"
                        : "#fff",

                color:
                    active
                        ? "#111827"
                        : "#6b7280",

                border:
                    active
                        ? "1px solid #b7eb9f"
                        : "1px solid #ececec"
            }}
        >

            {children}

        </button>

    );
}

function Section({

    title,
    icon,
    children

}) {

    return (

        <div
            style={{
                borderRadius: 20,
                border: "1px solid #ececec",
                padding: 16,
                background:
                    "linear-gradient(135deg, #ccf5bb 0%, #e8ffe0 100%)"
            }}
        >

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                    color: "#111827",
                    fontWeight: 600,
                    fontSize: 14
                }}
            >

                {icon}

                {title}

            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14
                }}
            >

                {children}

            </div>

        </div>

    );
}

function Field({

    label,
    children

}) {

    return (

        <div>

            <div
                style={{
                    fontSize: 12,
                    color: "#6b7280",
                    fontWeight: 500,
                    marginBottom: 6
                }}
            >
                {label}
            </div>

            {children}

        </div>

    );
}

function Info({

    label,
    value

}) {

    return (

        <div>

            <div
                style={{
                    fontSize: 12,
                    color: "#6b7280",
                    fontWeight: 500,
                    marginBottom: 4
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: 14,
                    color: "#111827",
                    fontWeight: 500,
                    wordBreak: "break-word"
                }}
            >
                {value || "-"}
            </div>

        </div>

    );
}

function Badge({

    label,
    color,
    bg

}) {

    return (

        <div
            style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: bg,
                color,
                fontSize: 12,
                fontWeight: 600
            }}
        >
            {label}
        </div>

    );
}