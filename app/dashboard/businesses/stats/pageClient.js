"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import DateFilter from "@/app/components/DateFilter";
import QRSelect from "@/app/components/QrSelect";

import TimelineChart from "@/app/components/stats/TimeLineChart";
import CityChart from "@/app/components/stats/CityChart";
import DeviceChart from "@/app/components/stats/DeviceChart";

import { formatDate } from "@/app/lib/formatDate";
import { addOneDay } from "@/app/lib/addOneDay";

import { toPng } from "html-to-image";
import QrsClicks from "@/app/components/stats/QrsClicks";
import { hasPermission } from "@/app/lib/permissions";
import { getSubscriptionStatusLabel } from "@/app/lib/helpers/getSubscriptionStatusLabel";

import "../../../styles/tags_stats.css";
import Image from "next/image";

export default function BusinessStatsPageClient({ session, isAdmin }) {

    const searchParams = useSearchParams();
    const businessId = searchParams.get("business_id");
    const subscriptionStatusLabel = getSubscriptionStatusLabel(session?.subscriptionStatus);
    const params = useParams();

    const router = useRouter()

    const id = params?.id || searchParams.get("business_id");

    // =====================================
    // 🔐 FLAGS
    // =====================================

    const canUseDashboard =
        isAdmin || (hasPermission(session, "dashboard"));

    const canUseReports =
        isAdmin || (hasPermission(session, "reports"));

    const canUseAnalytics =
        isAdmin || (hasPermission(session, "analytics"));

    const canUseAnalyticsPlus =
        isAdmin || (hasPermission(session, "analyticsPus"));

    const canPauseQr = (hasPermission(session, "pauseQr"));

    const canEditQr =
        isAdmin || (hasPermission(session, "editQr"));

    // =========================
    // STATE
    // =========================

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [qrs, setQrs] = useState([]);

    const getLast30Days = () => {
        const today = new Date();
        const from = new Date();
        from.setDate(today.getDate() - 30);

        return {
            from: from.toISOString().slice(0, 10),
            to: today.toISOString().slice(0, 10),
        };
    };

    const [filters, setFilters] = useState({
        ...getLast30Days(),
        month: "",
    });

    const [qrId, setQrId] = useState("all");

    const timelineRef = useRef(null);
    const qrsClicksRef = useRef(null);
    const cityRef = useRef(null);
    const deviceRef = useRef(null);

    // =========================
    // LOAD QRs
    // =========================

    useEffect(() => {
        if (!businessId) return;

        async function loadQrs() {
            const res = await fetch(`/api/business/${businessId}/qrs`);
            const json = await res.json();

            setQrs(json.qrs || []);
        }

        loadQrs();
    }, [businessId]);

    // =========================
    // LOAD STATS
    // =========================

    useEffect(() => {
        if (!businessId) return;

        async function loadData() {
            setLoading(true);

            try {
                const params = new URLSearchParams();

                if (qrId && qrId !== "all") {
                    params.set("qr_id", qrId);
                }

                if (filters.from?.trim() && filters.to?.trim()) {
                    params.set("from", filters.from);
                    params.set("to", filters.to);
                } else {
                    params.set("month", filters.month);
                }

                const url = `/api/business/${businessId}/stats?${params.toString()}`;

                const res = await fetch(url);
                const json = await res.json();

                setData(json);

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }

        loadData();

    }, [businessId, filters, qrId]);

    // =========================
    // LOADING
    // =========================

    if (loading) {
        return (
            <div className="tags_stats_loading">
                Cargando estadísticas...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="tags_stats_loading">
                Sin datos
            </div>
        );
    }

    // =========================
    // PDF URL
    // =========================

    const buildPdfUrl = () => {
        let url = `/api/business/${businessId}/report/pdf`;

        const params = new URLSearchParams();

        if (qrId && qrId !== "all") {
            params.append("qr_id", qrId);
        }

        if (filters.from && filters.to) {
            params.append("from", filters.from);
            params.append("to", filters.to);
        }

        const query = params.toString();

        return query ? `${url}?${query}` : url;
    };

    const selectedQr =
        qrId === "all"
            ? null
            : qrs.find(q => String(q.id) === String(qrId));

    // =========================
    // GENERAR IMAGENES
    // =========================

    const generateChartImages = async () => {

        const getOptions = (el) => {
            const rect = el.getBoundingClientRect();

            return {
                cacheBust: true,
                backgroundColor: "#ffffff",
                pixelRatio: 2,

                width: rect.width,
                height: rect.height,

                style: {
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                    transform: "scale(1)",
                    transformOrigin: "top left"
                }
            };
        };

        const timeline = await toPng(
            timelineRef.current,
            getOptions(timelineRef.current)
        );

        const qrsClicks = await toPng(
            qrsClicksRef.current,
            getOptions(qrsClicksRef.current)
        );

        const city = await toPng(
            cityRef.current,
            getOptions(cityRef.current)
        );

        const device = await toPng(
            deviceRef.current,
            getOptions(deviceRef.current)
        );

        return { timeline, qrsClicks, city, device };
    };

    return (

        <div className="tags_stats_page">

            {/* HERO */}

            <div className="tags_dashboard_hero">

                <div className="tags_dashboard_hero_left">

                    <div className="tags_dashboard_logo_box">

                        <Image
                            src="/logo_tags_transparente.webp"
                            alt="Tags"
                            width={70}
                            height={70}
                            className="img-fluid"
                        />

                    </div>

                    <div>

                        <h1 className="tags_dashboard_title">
                            📊 Estadísticas
                        </h1>

                        <p className="tags_dashboard_subtitle">
                            Analytics y reportes de tus códigos QR
                        </p>

                    </div>

                </div>

                <div className="tags_dashboard_hero_actions">

                    <button
                        className="tags_dashboard_back_btn"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${id}`
                            )
                        }
                    >
                        👤 Volver al Dashboard
                    </button>

                    <button
                        type="button"
                        className="tags_stats_pdf_btn"
                        onClick={async () => {

                            try {

                                const charts = await generateChartImages();

                                const res = await fetch(buildPdfUrl(), {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({ charts })
                                });

                                const blob = await res.blob();
                                const url = window.URL.createObjectURL(blob);

                                window.open(url);

                            } catch (err) {

                                console.error("Error generando PDF:", err);

                            }

                        }}
                    >
                        📄 Exportar PDF
                    </button>

                </div>

            </div>


            {/* ================= CLIENT ================= */}
            <div className="tags_stats_client_card tags_stats_client_row">

                {/* LEFT */}

                <div>
                    <p className="tags_stats_label">
                        Cliente
                    </p>

                    <span className="tags_stats_client_email">
                        {session?.email || ""}
                    </span>
                </div>

                {/* RIGHT */}

                <div className="tags_stats_client_right">

                    <div>
                        <span className="tags_stats_label">
                            Plan:
                        </span>

                        <span className="tags_stats_plan">
                            {session?.plan?.name || 'Administrador'}
                        </span>
                    </div>

                    <div>
                        <span
                            className={`tags_stats_status ${subscriptionStatusLabel === "Activo"
                                    ? "active"
                                    : "disabled"
                                }`}
                        >
                            {subscriptionStatusLabel}
                        </span>
                    </div>

                </div>

            </div>

            {/* ================= FILTERS ================= */}

            {(canUseAnalytics || canUseAnalyticsPlus || isAdmin) && (

                <div className="tags_stats_filters">

                    <div className="tags_stats_filter_card">
                        <DateFilter
                            onChange={(r) => {
                                setFilters(prev => ({
                                    ...prev,
                                    from: r.from || "",
                                    to: r.to || ""
                                }));
                            }}
                        />
                    </div>

                    <div className="tags_stats_filter_card">
                        <QRSelect
                            qrs={qrs}
                            value={qrId}
                            onChange={setQrId}
                        />
                    </div>

                </div>

            )}

            {/* ================= ACTIVE FILTERS ================= */}

            <div className="tags_stats_info">

                <div className="tags_stats_info_item">
                    📊{" "}
                    {qrId === "all" || !selectedQr ? (
                        <strong>Todos los QRs</strong>
                    ) : (
                        <strong>
                            QR: {selectedQr.code}{" "}
                            {selectedQr.label ? `- ${selectedQr.label}` : ""}
                        </strong>
                    )}
                </div>

                <div className="tags_stats_info_item">
                    📅{" "}
                    {filters.from && filters.to ? (
                        <>
                            {formatDate(addOneDay(filters.from))} →{" "}
                            {formatDate(addOneDay(filters.to))}
                        </>
                    ) : (
                        <>Últimos 30 días</>
                    )}
                </div>

            </div>

            {/* ================= KPIs ================= */}

            <div className="tags_stats_kpis">

                <div className="tags_stats_kpi_card">

                    <p className="tags_stats_kpi_label">
                        Total clicks
                    </p>

                    <h2 className="tags_stats_kpi_number">
                        {data.summary?.totalClicks || 0}
                    </h2>

                </div>

                <div className="tags_stats_kpi_card">

                    <p className="tags_stats_kpi_label">
                        Usuarios únicos
                    </p>

                    <h2 className="tags_stats_kpi_number">
                        {data.summary?.uniqueClicks || 0}
                    </h2>

                </div>

            </div>

            {/* ================= TABLES ================= */}

            <div className="tags_stats_grid">

                {/* TOP QRS */}

                <div className="tags_stats_card">

                    <div className="tags_stats_card_header">
                        <h3>🏆 Top 10 QRs</h3>
                    </div>

                    <div className="table-responsive">

                        <table className="tags_stats_table">

                            <thead>
                                <tr>
                                    <th>QR</th>
                                    <th>Nombre</th>
                                    <th>Clicks</th>
                                    <th>Únicos</th>
                                </tr>
                            </thead>

                            <tbody>
                                {data.topQrs?.map(q => (
                                    <tr key={q.id}>
                                        <td>{q.code}</td>
                                        <td>{q.label}</td>
                                        <td>{q.clicks}</td>
                                        <td>{q.uniques}</td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>

                </div>

                {/* COUNTRIES */}

                <div className="tags_stats_card">

                    <div className="tags_stats_card_header">
                        <h3>🌎 Top Países</h3>
                    </div>

                    <div className="table-responsive">

                        <table className="tags_stats_table">

                            <tbody>
                                {data.geo?.countries?.map((c, i) => (
                                    <tr key={i}>
                                        <td>{c.country}</td>
                                        <td>{c.total}</td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>

                </div>

                {/* CITIES */}

                <div className="tags_stats_card">

                    <div className="tags_stats_card_header">
                        <h3>🏙️ Clicks por Ciudad</h3>
                    </div>

                    <div className="table-responsive">

                        <table className="tags_stats_table">

                            <tbody>
                                {data.geo?.cities?.map((c, i) => (
                                    <tr key={i}>
                                        <td>{c.city}</td>
                                        <td>{c.total}</td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>

                </div>

                {/* DEVICES */}

                <div className="tags_stats_card">

                    <div className="tags_stats_card_header">
                        <h3>💻 Dispositivos</h3>
                    </div>

                    <div className="table-responsive">

                        <table className="tags_stats_table">

                            <tbody>
                                {data.devices?.map((d, i) => (
                                    <tr key={i}>
                                        <td>{d.device_type}</td>
                                        <td>{d.total}</td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>

                </div>

            </div>

            {/* ================= MOVEMENTS ================= */}

            <div className="tags_stats_card tags_stats_movements">

                <div className="tags_stats_card_header">
                    <h3>📍 Movimientos</h3>
                </div>

                <div className="table-responsive">

                    <table className="tags_stats_table">

                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>QR</th>
                                <th>Label</th>
                                <th>País</th>
                                <th>Provincia</th>
                                <th>Ciudad</th>
                                <th>Device</th>
                                <th>OS</th>
                                <th>Browser</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data.movements?.map((m, i) => (
                                <tr key={i}>
                                    <td>{new Date(m.created_at).toLocaleString()}</td>
                                    <td>{m.code}</td>
                                    <td>{m.label || "-"}</td>
                                    <td>{m.country}</td>
                                    <td>{m.region || "-"}</td>
                                    <td>{m.city}</td>
                                    <td>{m.device_type}</td>
                                    <td>{m.os}</td>
                                    <td>{m.browser}</td>
                                </tr>
                            ))}
                        </tbody>

                    </table>

                </div>

            </div>

            {/* ================= CHARTS ================= */}

            <div className="tags_stats_charts">

                <div className="tags_stats_chart_card" ref={timelineRef}>
                    <TimelineChart data={data.timeline} />
                </div>

                <div className="tags_stats_chart_card" ref={qrsClicksRef}>
                    <QrsClicks data={data.qrStats} />
                </div>

                <div className="tags_stats_chart_card" ref={cityRef}>
                    <CityChart data={data?.geo?.cities || []} />
                </div>

                <div className="tags_stats_chart_card" ref={deviceRef}>
                    <DeviceChart data={data.devices} />
                </div>

            </div>

        </div>
    );
}
