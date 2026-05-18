"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";

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



export default function BusinessStatsPageClient({ session, isAdmin }) {

    const searchParams = useSearchParams();
    const businessId = searchParams.get("business_id");
    const subscriptionStatusLabel = getSubscriptionStatusLabel(session?.subscriptionStatus);
    const params = useParams();

    const id = params?.id || searchParams.get("business_id");

    // =====================================
    // 🔐 FLAGS
    // =====================================

    const canUseDashboard =
        isAdmin || (hasPermission(session, "dashboard"));

    const canUseReports =
        isAdmin || (hasPermission(session, "reports"));

    const canUseAnalytics =
        isAdmin || (hasPermission(session, "analytics")); //para usuario Business
        /* console.log('Puede usar analitycs '+canUseAnalytics) */

    const canUseAnalyticsPlus =
        isAdmin || (hasPermission(session, "analyticsPus")); //para usuario Agency
         /* console.log('Puede usar analitycs Plus '+canUseAnalyticsPlus) */

    const canPauseQr = (hasPermission(session, "pauseQr")); //para usuario Business para arriba

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

/*     useEffect(()=> {
        console.log(JSON.stringify(qrs))
    },[qrs]) */

    // =========================
    // LOAD STATS (CENTRALIZADO)
    // =========================
    useEffect(() => {
        if (!businessId) return;

        async function loadData() {
            setLoading(true);

            try {
                const params = new URLSearchParams();

                // QR
                if (qrId && qrId !== "all") {
                    params.set("qr_id", qrId);
                }

                // DATE
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
    if (loading) return <p className="p-4">Cargando...</p>;
    if (!data) return <p className="p-4">Sin datos</p>;

    // =========================
    // URL PARA PDF REPORT
    // =========================
    const buildPdfUrl = () => {
        let url = `/api/business/${businessId}/report/pdf`;

        const params = new URLSearchParams();

        // ================= QR =================
        if (qrId && qrId !== "all") {
            params.append("qr_id", qrId);
        }

        // ================= DATE =================
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

    /* //////////////////// */
    /*  GENERAR IMAGENES */

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

        <div className="container-fluid py-3 tags_text_normal m-0 p-1">

            {/* ================= TITLE ================= */}
            <h2 className="tags_title mb-3 mt-3">
                📊 Estadísticas 👤</h2>

            {/* Datos del Cliente - Plan y Estado */}
            <div className="tags_subTitle mb-3 p-1">
                <span className="tags_text_destacado">Cliente: </span><span> {session?.email || ""}</span>
                <span className="tags_text_destacado">  -  </span><span className="tags_text_destacado" >{session?.plan?.name || 'Administrador'}</span>
                <span> - </span><span
                    className={` ${subscriptionStatusLabel === "Activo"
                        ? "badge active"
                        : "badge disabled"
                        }`}
                >
                    {subscriptionStatusLabel}
                </span>
            </div>
            {/* <div>
                <h2 className="tags_subTitle card text-center mb-3 p-1"> Cliente: {' '}
                    {data.business?.name
                        ? `${data.business.email} - ${data.business.name}`
                        : data.business?.email || "Cliente"}
                </h2>
            </div> */}

            {(canUseAnalytics || canUseAnalyticsPlus || isAdmin) && <>
                {/* ================= FILTERS ================= */}

                <div className="row g-3 mb-2">

                    <div className="col-12 col-md-7 col-lg-5">
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

                    <div className="col-12 col-md-5 col-lg-7">
                        <QRSelect
                            qrs={qrs}
                            value={qrId}
                            onChange={setQrId}
                        />
                    </div>

                </div>
            </>


            }

            <div className="m-1 p-2 row d-flex justify-content-center-align-items-center mb-4">
                {/* ================= PERIOD LABEL ================= */}
                <div className="col-12 col-sm-7 text-muted mb-3">

                    <div className="mb-1">
                        📊 Filtro:{" "}
                        {qrId === "all" || !selectedQr ? (
                            <strong>Todos los QRs</strong>
                        ) : (
                            <strong>
                                QR: {selectedQr.code}{" "}
                                {selectedQr.label ? `- ${selectedQr.label}` : ""}
                            </strong>
                        )}
                    </div>

                    <div>
                        📅 Período:{" "}
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
                {/* ESPORTAR A PDF */}
                <div className="col-12 col-sm-5 mb-4">
                    {/* <a href={buildPdfUrl()} className="btn btn-danger mt-3">
                📄 Exportar PDF
            </a> */}
                    <button
                        type="button"
                        className="btn btn-danger m-0 mt-3 w-100"
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
                        📄 Generar Reporte - PDF
                    </button>
                </div>
            </div>



            {/* ================= KPI ================= */}
            <div className="row g-3 mb-4">

                <div className="col-md-6">
                    <div className="card p-3">
                        <h5 >Total clicks</h5>
                        <h2>{data.summary?.totalClicks || 0}</h2>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card p-3">
                        <h5>Únicos</h5>
                        <h2>{data.summary?.uniqueClicks || 0}</h2>
                    </div>
                </div>

            </div>

            {/* ================= TOP QRS ================= */}
            <div className="card p-3 mb-4">
                <h5>Top 10 QRs</h5>

                <table className="table table-sm">
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

            {/* ================= GEO ================= */}
            <div className="row g-3 mb-4">

                <div className="col-md-6">
                    <div className="card p-3">
                        <h5>Top Países</h5>
                        <table className="table table-sm">
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

                <div className="col-md-6">
                    <div className="card p-3">
                        <h5>Clicks por Ciudad</h5>
                        <table className="table table-sm">
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

            </div>

            {/* ================= DEVICES ================= */}
            <div className="card p-3 mb-4">
                <h5>Dispositivos</h5>

                <table className="table table-sm">
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

            {/* ================= TOP QRS ================= */}
            <div className="card p-3 mb-4">
                <h5>Clicks por Qr</h5>

                <table className="table table-sm">
                    <thead>
                        <tr>
                            <th>QR</th>
                            <th>Nombre</th>
                            <th>Clicks</th>
                            <th>Únicos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.qrStats?.map(q => (
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

            {/* ================= MOVEMENTS ================= */}
            <div className="card p-3 mb-4">
                <h5>Movimientos</h5>

                <div className="table-responsive">
                    <table className="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>QR</th>
                                <th>Label</th>
                                <th>País</th>
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
            <div className="mt-4">

                <div ref={timelineRef}>
                    <TimelineChart data={data.timeline} />
                </div>

                <div ref={qrsClicksRef}>
                    <QrsClicks data={data.qrStats} />
                </div>

                <div ref={cityRef}>
                    <CityChart data={data?.geo?.cities || []} />
                </div>

                <div ref={deviceRef}>
                    <DeviceChart data={data.devices} />
                </div>

            </div>
            {/* <div className="mt-4">
                <TimelineChart data={data.timeline} />
                <CityChart data={data?.geo?.cities || []} />
                <DeviceChart data={data.devices} />
            </div> */}

        </div>
    );
}