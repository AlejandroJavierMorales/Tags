// /app/dashboard/stats/pageClient.jsx

"use client";

import {
    useEffect,
    useState,
    useRef
} from "react";

import { useRouter } from "next/navigation";

import Image from "next/image";

import { toPng } from "html-to-image";

import TimelineChart from "@/app/components/stats/TimeLineChart";
import CityChart from "@/app/components/stats/CityChart";
import DeviceChart from "@/app/components/stats/DeviceChart";
import QrsClicks from "@/app/components/stats/QrsClicks";

import "../../styles/tags_stats_admin.css";

export default function StatsPageClient({
    session
}) {

    const router =
        useRouter();

    // =====================================
    // STATE
    // =====================================

    const [loading, setLoading] =
        useState(true);

    const [stats, setStats] =
        useState(null);

    const [geo, setGeo] =
        useState({
            countries: [],
            cities: [],
            regions: []
        });

    const [businesses, setBusinesses] =
        useState([]);

    const [selectedBusiness, setSelectedBusiness] =
        useState("");

    const [period, setPeriod] =
        useState("30");

    // =====================================
    // REFS
    // =====================================

    const timelineRef =
        useRef(null);

    const qrsRef =
        useRef(null);

    const cityRef =
        useRef(null);

    const deviceRef =
        useRef(null);

    // =====================================
    // LOAD BUSINESSES
    // =====================================

    async function loadBusinesses() {

        try {

            const res =
                await fetch(
                    "/api/business/list",
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            setBusinesses(data || []);

        } catch (err) {

            console.log(err);
        }
    }

    // =====================================
    // LOAD STATS
    // =====================================

    async function loadAllData() {
  try {
    setLoading(true);

    const params = new URLSearchParams();
    params.set("days", period || "30");

    if (selectedBusiness) {
      params.set("business_id", selectedBusiness);
    }

    const res = await fetch(`/api/stats/overview?${params.toString()}`, {
      cache: "no-store"
    });

    const data = await res.json();

    setStats(data);

    setGeo({
      cities: data.cities || [],
      countries: [],
      regions: []
    });

  } finally {
    setLoading(false);
  }
}

    // =====================================
    // INIT
    // =====================================

    useEffect(() => {
        loadBusinesses();
    }, []);

    useEffect(() => {
        loadAllData();
    }, [selectedBusiness, period]);

    // =====================================
    // EXPORT
    // =====================================

    async function generateChartImages() {

        const getOptions = (el) => {

            const rect =
                el.getBoundingClientRect();

            return {
                cacheBust: true,
                backgroundColor: "#ffffff",
                pixelRatio: 2,
                width: rect.width,
                height: rect.height
            };
        };

        const timeline =
            timelineRef.current
                ? await toPng(
                    timelineRef.current,
                    getOptions(timelineRef.current)
                )
                : null;

        const qrs =
            qrsRef.current
                ? await toPng(
                    qrsRef.current,
                    getOptions(qrsRef.current)
                )
                : null;

        const city =
            cityRef.current
                ? await toPng(
                    cityRef.current,
                    getOptions(cityRef.current)
                )
                : null;

        const device =
            deviceRef.current
                ? await toPng(
                    deviceRef.current,
                    getOptions(deviceRef.current)
                )
                : null;

        return {
            timeline,
            qrs,
            city,
            device
        };
    }

    // =====================================
    // DATA SAFE
    // =====================================

    const timelineData =
        stats?.timeline || [];

    const topQrs =
        (stats?.top_qrs || []).map(
            (qr) => ({
                ...qr,
                total_clicks:
                    Number(qr.total_clicks || 0),
                unique_clicks:
                    Number(qr.unique_clicks || 0)
            })
        );

    const deviceData =
        (stats?.devices || []).map(
            (d) => ({
                ...d,
                total:
                    Number(
                        d.total ||
                        d.clicks ||
                        0
                    )
            })
        );

    const cityData =
        (geo?.cities || [])
            .filter(
                (c) =>
                    c.city &&
                    c.city !== "Unknown"
            )
            .map((c) => ({
                ...c,
                total:
                    Number(
                        c.total ||
                        c.clicks ||
                        0
                    )
            }));

    // =====================================
    // LOADING
    // =====================================

    if (loading) {

        return (

            <div className="stats_admin_loading">

                <div className="spinner-border text-primary" />

            </div>
        );
    }

    // =====================================
    // UI
    // =====================================

    return (

        <div className="stats_admin_page">

            {/* HERO */}

            <div className="stats_admin_hero">

                <div className="stats_admin_hero_left">

                    <Image
                        src="/logo_tags_transparente.webp"
                        alt="Tags"
                        width={70}
                        height={70}
                    />

                    <div>

                        <h1 className="stats_admin_title">
                            📊 Estadísticas Generales
                        </h1>

                        <p className="stats_admin_subtitle">
                            Analytics globales del sistema
                        </p>

                    </div>

                </div>

                <div className="stats_admin_actions">

                    <button
                        className="stats_admin_btn_dark"
                        onClick={() =>
                            router.push("/dashboard")
                        }
                    >
                        ← Dashboard
                    </button>

                </div>

            </div>

            {/* FILTERS */}

            <div className="stats_admin_filters">

                {/* CLIENTE */}

                <div className="stats_admin_filter">

                    <label>
                        Cliente
                    </label>

                    <select
                        className="form-select"
                        value={selectedBusiness}
                        onChange={(e) =>
                            setSelectedBusiness(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            Todos los clientes
                        </option>

                        {
                            businesses.map((b) => (

                                <option
                                    key={b.id}
                                    value={b.id}
                                >
                                    {b.name}
                                </option>
                            ))
                        }

                    </select>

                </div>

                {/* PERIODO */}

                <div className="stats_admin_filter">

                    <label>
                        Período
                    </label>

                    <select
                        className="form-select"
                        value={period}
                        onChange={(e) =>
                            setPeriod(
                                e.target.value
                            )
                        }
                    >

                        <option value="1">
                            Últimas 24 hs
                        </option>

                        <option value="7">
                            Últimos 7 días
                        </option>

                        <option value="30">
                            Últimos 30 días
                        </option>

                        <option value="90">
                            Últimos 90 días
                        </option>

                        <option value="365">
                            Último año
                        </option>

                    </select>

                </div>

                {/* APPLY */}

                 <div className="stats_admin_filter_button">

                    <button
                        className="stats_admin_btn_primary"
                        onClick={loadAllData}
                    >
                        🔍 Aplicar filtros
                    </button>

                </div>

                {/* CLIENT STATS */}

            </div>

            {/* KPI */}

            <div className="stats_admin_kpis">

                <div className="stats_admin_kpi">

                    <span>
                        Total Clicks
                    </span>

                    <h2>
                        {stats?.total_clicks || 0}
                    </h2>

                </div>

                <div className="stats_admin_kpi">

                    <span>
                        Usuarios Únicos
                    </span>

                    <h2>
                        {stats?.unique_clicks || 0}
                    </h2>

                </div>

                <div className="stats_admin_kpi">

                    <span>
                        Clicks Hoy
                    </span>

                    <h2>
                        {stats?.clicks_today || 0}
                    </h2>

                </div>

                <div className="stats_admin_kpi">

                    <span>
                        Último Click
                    </span>

                    <h3>

                        {
                            stats?.last_click
                                ? new Date(
                                    stats.last_click
                                ).toLocaleString(
                                    "es-AR"
                                )
                                : "-"
                        }

                    </h3>

                </div>

            </div>

            {/* CHARTS */}

            <div className="stats_admin_charts">

                {/* TIMELINE */}

                <div
                    className="stats_admin_chart"
                    ref={timelineRef}
                >

                    <TimelineChart
                        data={timelineData}
                    />

                </div>

                {/* QR CLICKS */}

                <div
                    className="stats_admin_chart"
                    ref={qrsRef}
                >

                    <QrsClicks
                        data={topQrs}
                    />

                </div>

                {/* CITIES */}

                <div
                    className="stats_admin_chart"
                    ref={cityRef}
                >

                    <CityChart
                        data={cityData}
                    />

                </div>

                {/* DEVICES */}

                <div
                    className="stats_admin_chart"
                    ref={deviceRef}
                >

                    <DeviceChart
                        data={deviceData}
                    />

                </div>

            </div>

            {/* TABLES */}

            <div className="row g-4 mt-1">

                {/* TOP QRS */}

                <div className="col-12 col-xl-6">

                    <div className="stats_admin_card">

                        <h3>
                            🏆 Top QRs
                        </h3>

                        <div className="table-responsive">

                            <table className="stats_admin_table">

                                <thead>

                                    <tr>

                                        <th>
                                            QR
                                        </th>

                                        <th>
                                            Clicks
                                        </th>

                                        <th>
                                            Únicos
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {
                                        topQrs.length > 0
                                            ? (
                                                topQrs.map(
                                                    (
                                                        qr,
                                                        i
                                                    ) => (

                                                        <tr key={i}>

                                                            <td>

                                                                {
                                                                    qr.label ||
                                                                    qr.code
                                                                }

                                                            </td>

                                                            <td>

                                                                {
                                                                    qr.total_clicks || 0
                                                                }

                                                            </td>

                                                            <td>

                                                                {
                                                                    qr.unique_clicks || 0
                                                                }

                                                            </td>

                                                        </tr>
                                                    )
                                                )
                                            )
                                            : (
                                                <tr>

                                                    <td
                                                        colSpan="3"
                                                    >
                                                        Sin datos
                                                    </td>

                                                </tr>
                                            )
                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>

                </div>

                {/* COUNTRIES */}

                <div className="col-12 col-xl-6">

                    <div className="stats_admin_card">

                        <h3>
                            🌎 Ciudades
                        </h3>

                        <div className="table-responsive">

                            <table className="stats_admin_table">

                                <thead>

                                    <tr>

                                        <th>
                                            Ciudad
                                        </th>

                                        <th>
                                            Clicks
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {
                                        geo?.cities?.length > 0
                                            ? (
                                                geo.cities.map(
                                                    (
                                                        c,
                                                        i
                                                    ) => (

                                                        <tr key={i}>

                                                            <td>
                                                                {c.city}
                                                            </td>

                                                            <td>
                                                                {
                                                                    c.total
                                                                }
                                                            </td>

                                                        </tr>
                                                    )
                                                )
                                            )
                                            : (
                                                <tr>

                                                    <td
                                                        colSpan="2"
                                                    >
                                                        Sin datos
                                                    </td>

                                                </tr>
                                            )
                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>

                </div>

            </div>

            {/* TIMELINE TABLE */}

            <div className="stats_admin_card mt-4">

                <h3>
                    📅 Actividad
                </h3>

                <div className="table-responsive">

                    <table className="stats_admin_table">

                        <thead>

                            <tr>

                                <th>
                                    Fecha
                                </th>

                                <th>
                                    Clicks
                                </th>

                                <th>
                                    Únicos
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {
                                timelineData.length > 0
                                    ? (
                                        timelineData.map(
                                            (
                                                d,
                                                i
                                            ) => (

                                                <tr key={i}>

                                                    <td>

                                                        {
                                                            new Date(
                                                                d.date
                                                            ).toLocaleDateString(
                                                                "es-AR"
                                                            )
                                                        }

                                                    </td>

                                                    <td>
                                                        {
                                                            d.clicks
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            d.unique_clicks
                                                        }
                                                    </td>

                                                </tr>
                                            )
                                        )
                                    )
                                    : (
                                        <tr>

                                            <td
                                                colSpan="3"
                                            >
                                                Sin datos
                                            </td>

                                        </tr>
                                    )
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}