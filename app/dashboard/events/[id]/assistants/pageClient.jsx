"use client";

import {
    useEffect,
    useMemo,
    useState
} from "react";

import showAlert
    from "@/app/components/showAlert";

import "../../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventNavigation
    from "@/app/modules/e-events/components/EventNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";

import TagsSpinner
    from "@/app/components/TagsSpinner";

    import {
    pdf
} from "@react-pdf/renderer";

import EventAssistantsPdf from "@/app/modules/e-events/components/reports/EventAssistantsPdf";

export default function EventAssistantsPageClient({
    session,
    eventId,
    modules
}) {

    const [loading, setLoading] =
        useState(true);

    const [items, setItems] =
        useState([]);

    const [showPdfModal, setShowPdfModal] =
        useState(false);

    const [pdfOptions, setPdfOptions] =
        useState({
            assistants: true,
            dietary: true
        });

    const [event, setEvent] =
        useState(null);

    const [stats, setStats] =
        useState({
            total: 0,
            attendees: 0,
            companions: 0,
            checked_in: 0
        });

    const [filters, setFilters] =
        useState({
            search: "",
            status: ""
        });

    useEffect(() => {

        if (!eventId) return;

        load();

    }, [
        eventId,
        filters
    ]);

    async function load() {

        try {

            setLoading(true);

            const params =
                new URLSearchParams();

            params.append(
                "event_id",
                eventId
            );

            if (filters.search) {

                params.append(
                    "search",
                    filters.search
                );
            }

            if (filters.status) {

                params.append(
                    "status",
                    filters.status
                );
            }

            const res =
                await fetch(
                    `/api/events/assistants/list?${params.toString()}`,
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
                        "Error cargando asistentes",
                    icon: "error"
                });

                return;
            }

            setItems(
                data.data || []
            );

            setStats(
                data.stats || {
                    total: 0,
                    attendees: 0,
                    companions: 0,
                    checked_in: 0
                }
            );

            /* REportes */
            const eventRes =
                await fetch(
                    `/api/events/get?id=${eventId}`,
                    {
                        cache: "no-store"
                    }
                );

            const eventData =
                await eventRes.json();

            if (eventRes.ok) {

                setEvent(
                    eventData.event || eventData.data || eventData
                );
            }

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "No se pudieron cargar asistentes",
                icon: "error"
            });

        } finally {

            setLoading(false);
        }
    }

    const grouped =
        useMemo(() => {

            const map =
                new Map();

            for (const item of items) {

                const key =
                    item.owner_id;

                if (!map.has(key)) {

                    map.set(
                        key,
                        {
                            owner_id:
                                item.owner_id,

                            owner_name:
                                item.owner_name,

                            table_name:
                                item.table_name,

                            rows:
                                []
                        }
                    );
                }

                map.get(key)
                    .rows
                    .push(item);
            }

            return Array.from(
                map.values()
            );

        }, [items]);

    function getTypeLabel(type) {

        if (type === "attendee") {
            return "Titular";
        }

        return "Acompañante";
    }

    function getStatusLabel(status) {

        const labels = {
            pending: "Pendiente",
            confirmed: "Confirmado",
            declined: "Rechazado",
            checked_in: "Ingresó",
            cancelled: "Cancelado"
        };

        return labels[status] || "-";
    }

    function formatDate(value) {

        if (!value) return "-";

        try {

            return new Date(value)
                .toLocaleString("es-AR");

        } catch (err) {

            return "-";
        }
    }

    function copyQrToken(token) {

        if (!token) {

            showAlert({
                title: "Sin token",
                text: "Este asistente no tiene token QR.",
                icon: "warning"
            });

            return;
        }

        navigator.clipboard.writeText(token);

        showAlert({
            title: "Copiado",
            text: "Token QR copiado",
            icon: "success"
        });
    }


    /* Exportar PDF */
    async function exportPdf() {

        if (
            !pdfOptions.assistants
            &&
            !pdfOptions.dietary
        ) {

            showAlert({
                title: "Atención",
                text: "Seleccioná al menos un listado",
                icon: "warning"
            });

            return;
        }

        try {

            const blob =
                await pdf(
                    <EventAssistantsPdf
                        event={event || {}}
                        stats={stats}
                        grouped={grouped}
                        items={items}
                        options={pdfOptions}
                    />
                ).toBlob();

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            const eventName =
                event?.name
                    ? event.name
                        .replaceAll(" ", "-")
                        .toLowerCase()
                    : `evento-${eventId}`;

            link.href =
                url;

            link.download =
                `asistentes-${eventName}.pdf`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            URL.revokeObjectURL(url);

            setShowPdfModal(false);

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "No se pudo generar el PDF " + err,
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
                        marginBottom: 24,
                        gap: 16,
                        flexWrap: "wrap"
                    }}
                >

                    <div>

                        <h2>
                            ✅ Asistentes del evento
                        </h2>

                        <p>
                            Listado real de personas confirmadas:
                            titulares y acompañantes.
                        </p>

                    </div>
                    <div>
                        <button
                            className="tags_btn"
                            onClick={() =>
                                setShowPdfModal(true)
                            }
                        >
                            📄 Exportar PDF
                        </button>
                    </div>

                </div>

                <div className="row g-3 mb-4">

                    <StatCard
                        title="Total asistentes"
                        value={stats.total}
                    />

                    <StatCard
                        title="Titulares"
                        value={stats.attendees}
                    />

                    <StatCard
                        title="Acompañantes"
                        value={stats.companions}
                    />

                    <StatCard
                        title="Check-in"
                        value={stats.checked_in}
                    />

                </div>

                <div className="row g-2 mb-4 tags_text_normal">

                    <div className="col-md-8">

                        <input
                            className="tags_modal_input"
                            placeholder="Buscar asistente, titular, email, teléfono o QR"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    search:
                                        e.target.value
                                }))
                            }
                        />

                    </div>

                    <div className="col-md-4">

                        <select
                            className="tags_modal_input"
                            value={filters.status}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    status:
                                        e.target.value
                                }))
                            }
                        >

                            <option value="">
                                Todos los estados
                            </option>

                            <option value="confirmed">
                                Confirmado
                            </option>

                            <option value="checked_in">
                                Check-in
                            </option>

                            <option value="declined">
                                Rechazado
                            </option>

                        </select>

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
                    grouped.length === 0
                    &&
                    (
                        <div className="card">
                            <div className="card-body">
                                No hay asistentes confirmados todavía.
                            </div>
                        </div>
                    )
                }

                {
                    !loading
                    &&
                    grouped.map(group => (

                        <div
                            key={group.owner_id}
                            style={{
                                marginBottom: 22,
                                border: "1px solid #e5e7eb",
                                borderRadius: 18,
                                overflow: "hidden",
                                background: "#fff"
                            }}
                        >

                            <div
                                style={{
                                    padding: "14px 18px",
                                    background: "#f3f4f6",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 12,
                                    flexWrap: "wrap"
                                }}
                            >

                                <div>

                                    <strong>
                                        {group.owner_name}
                                    </strong>

                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "#666"
                                        }}
                                    >
                                        Titular del grupo
                                        {
                                            group.table_name
                                            &&
                                            (
                                                <>
                                                    {" · Mesa "}
                                                    {group.table_name}
                                                </>
                                            )
                                        }
                                    </div>

                                </div>

                                <span className="tags_badge_success">
                                    {group.rows.length} asistentes
                                </span>

                            </div>

                            <div className="table-responsive">

                                <table className="tags_table tags_text_normal">

                                    <thead>

                                        <tr>
                                            <th>Persona</th>
                                            <th>Tipo</th>
                                            <th>Estado</th>
                                            <th>Email</th>
                                            <th>Teléfono</th>
                                            <th>QR</th>
                                            <th>Check-in</th>
                                            <th>Notas</th>
                                            <th>Acciones</th>
                                        </tr>

                                    </thead>

                                    <tbody>

                                        {
                                            group.rows.map(item => (

                                                <tr
                                                    key={`${item.type}-${item.id}`}
                                                >

                                                    <td>
                                                        <strong>
                                                            {item.name}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {
                                                            getTypeLabel(
                                                                item.type
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        <span className="tags_badge_success">
                                                            {
                                                                getStatusLabel(
                                                                    item.status
                                                                )
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {item.email || "-"}
                                                    </td>

                                                    <td>
                                                        {item.phone || "-"}
                                                    </td>

                                                    <td>
                                                        {
                                                            item.qr_token
                                                                ?
                                                                `${item.qr_token.slice(0, 8)}...`
                                                                :
                                                                "-"
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            formatDate(
                                                                item.checked_in_at
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            item.dietary_notes
                                                            ||
                                                            item.custom_dietary_notes
                                                            ||
                                                            "-"
                                                        }
                                                    </td>

                                                    <td>

                                                        <button
                                                            className="icon_btn"
                                                            title="Copiar QR"
                                                            onClick={() =>
                                                                copyQrToken(
                                                                    item.qr_token
                                                                )
                                                            }
                                                        >
                                                            📋
                                                        </button>

                                                    </td>

                                                </tr>

                                            ))
                                        }

                                    </tbody>

                                </table>

                            </div>

                        </div>
                    ))
                }

            </div>
            {
                showPdfModal
                &&
                (
                    <div className="tags_modal_overlay">

                        <div
                            className="tags_modal"
                            style={{
                                maxWidth: 520
                            }}
                        >

                            <div className="tags_modal_header">

                                <h3>
                                    Exportar PDF
                                </h3>

                                <button
                                    className="tags_modal_close"
                                    onClick={() =>
                                        setShowPdfModal(false)
                                    }
                                >
                                    ✕
                                </button>

                            </div>

                            <div className="tags_modal_body">

                                <div className="form-check mb-3">

                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={pdfOptions.assistants}
                                        onChange={(e) =>
                                            setPdfOptions(prev => ({
                                                ...prev,
                                                assistants:
                                                    e.target.checked
                                            }))
                                        }
                                    />

                                    <label className="form-check-label">
                                        Listado de asistentes
                                    </label>

                                </div>

                                <div className="form-check mb-3">

                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={pdfOptions.dietary}
                                        onChange={(e) =>
                                            setPdfOptions(prev => ({
                                                ...prev,
                                                dietary:
                                                    e.target.checked
                                            }))
                                        }
                                    />

                                    <label className="form-check-label">
                                        Restricciones alimentarias
                                    </label>

                                </div>

                            </div>

                            <div className="tags_modal_actions">

                                <button
                                    className="tags_modal_btn tags_modal_btn_cancel"
                                    onClick={() =>
                                        setShowPdfModal(false)
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="tags_btn"
                                    onClick={exportPdf}
                                >
                                    Exportar
                                </button>

                            </div>

                        </div>

                    </div>
                )
            }

            {/* fin  */}
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
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 18,
                    padding: 18
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