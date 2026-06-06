"use client";

import "../styles/tags_demo.css";

import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts";

import Image from "next/image";
import Link from "next/link";


function getQRUrl(code) {

    const base =
        process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : process.env.NEXT_PUBLIC_BASE_URL;

    const url = `${base}/t/${code}`;

    return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(url)}`;
}

export default function TagsDemoPage() {

    // =========================
    // DEMO QR
    // =========================

    const DEMO_CODE = "DEMO001";

    // =========================
    // FORM
    // =========================

    const [label, setLabel] = useState(
        "Mi QR Demo"
    );

    const [value, setValue] = useState(
        "https://google.com"
    );

    // =========================
    // STATE
    // =========================

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [saved, setSaved] =
        useState(false);

    const [stats, setStats] =
        useState(null);

    // =========================
    // URL PREVIEW
    // =========================

    const finalUrl = useMemo(() => {

        if (!value) return "";

        if (
            value.startsWith("http://") ||
            value.startsWith("https://")
        ) {
            return value;
        }

        return `https://${value}`;

    }, [value]);

    // =========================
    // LOAD STATS
    // =========================

    async function loadInitialData() {

        try {

            const res = await fetch(
                `/api/demo/stats?code=${DEMO_CODE}`,
                {
                    cache: "no-store"
                }
            );

            const data = await res.json();

            /* console.log("INITIAL DATA:", data); */

            if (data.success) {

                setStats(data);

                // cargar form UNA SOLA VEZ
                if (data.qr?.label) {
                    setLabel(data.qr.label);
                }

                if (data.qr?.url) {
                    setValue(data.qr.url);
                }
            }

        } catch (err) {

            console.log(err);
        }
    }

    async function loadStats() {

        try {

            const res = await fetch(
                `/api/demo/stats?code=${DEMO_CODE}`,
                {
                    cache: "no-store"
                }
            );

            const data = await res.json();

            /* console.log("STATS:", data); */

            if (data.success) {

                setStats(data);

                // cargar label/url reales
                /* if (data.qr?.label) {
                    setLabel(data.qr.label);
                }

                if (data.qr?.url) {
                    setValue(data.qr.url);
                } */
            }

        } catch (err) {

            console.log(err);
        }
    }

    // =========================
    // INITIAL LOAD
    // =========================

    useEffect(() => {

        // carga inicial
        loadInitialData();

        // solo refresca stats
        const interval = setInterval(() => {

            loadStats();

        }, 2000);

        return () => clearInterval(interval);

    }, []);

    // =========================
    // SAVE DEMO
    // =========================

    async function handleSave() {

        setMessage("");

        if (!label.trim()) {

            setMessage(
                "❌ Ingresá un nombre para el QR"
            );

            return;
        }

        if (!value.trim()) {

            setMessage(
                "❌ Ingresá un enlace válido"
            );

            return;
        }

        setLoading(true);

        try {

            const res = await fetch(
                "/api/demo/scan",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        code: DEMO_CODE,
                        label: label.trim(),
                        value: finalUrl
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {

                setMessage(
                    "❌ " + (
                        data.error ||
                        "Error actualizando demo"
                    )
                );

                return;
            }

            setSaved(true);

            setMessage(
                "✅ Demo actualizada correctamente"
            );

            await loadStats();

        } catch (err) {

            console.log(err);

            setMessage(
                "❌ Error de conexión"
            );

        } finally {

            setLoading(false);
        }
    }

    // =========================
    // OPEN LINK
    // =========================

    function handleOpenLink() {

        if (!finalUrl) return;

        window.open(
            finalUrl,
            "_blank"
        );
    }

    // =========================
    // REAL SCAN
    // =========================

    function handleDemoScan() {

        window.open(
            `/t/${DEMO_CODE}`,
            "_blank"
        );

        // primer refresh rápido
        setTimeout(() => {
            loadStats();
        }, 500);

        // segundo refresh cuando termina geo/tracking
        setTimeout(() => {
            loadStats();
        }, 2000);
    }

    // =========================
    // CALCULATED STATS
    // =========================

    const totalScans =
        stats?.stats?.scans || 0;

    const uniqueScans =
        stats?.stats?.unique_scans || 0;

    const devices =
        stats?.stats?.devices || [];

    const mobile =
        devices.find(
            d => d.device_type === "mobile"
        );

    const mobilePercent =
        totalScans > 0
            ? Math.round(
                (
                    Number(mobile?.total || 0)
                    / totalScans
                ) * 100
            )
            : 0;

    // =========================
    // CHART DATA
    // =========================

    const dailyData =
        stats?.stats?.daily?.map(d => ({
            day: d.day,
            clicks: Number(d.clicks)
        })) || [];

    const deviceData =
        devices.map(d => ({
            device: d.device_type,
            value: Number(d.total)
        }));

    const browserData =
        stats?.stats?.browsers?.map(b => ({
            name: b.browser,
            value: Number(b.total)
        })) || [];

    const cityData =
        stats?.stats?.cities
            ?.filter(
                c =>
                    c.city &&
                    c.city !== "null" &&
                    c.city.trim() !== ""
            )
            .map(c => ({
                city: c.city,
                clicks: Number(c.clicks)
            })) || [];

    // =========================
    // UI
    // =========================

    return (
        <div className="tags_demo_page">

            {/* HERO */}
            <section className="tags_demo_hero">

                <div className="tags_demo_hero_left">

                    <div className="tags_demo_logo_box">

                        <Image
                            src="/logo_tags_transparente.webp"
                            alt="Tags"
                            width={70}
                            height={70}
                        />

                    </div>

                    <div>

                        <h1 className="tags_demo_title">
                            🚀 Probá Tags en Vivo
                        </h1>

                        <p className="tags_demo_subtitle">
                            Configurá un QR real,
                            escanealo y mirá estadísticas
                            en tiempo real.
                        </p>

                    </div>

                </div>

                <div className="tags_demo_hero_right d-flex justify-content-end ">

                    <Link
                        href="/login"
                        className="tags_demo_cta"
                    >
                        Crear mi cuenta
                    </Link>

                </div>

            </section>

            {/* HELP */}
            <div className="tags_demo_help">

                <h3 className="tags_demo_help_title">
                    ❓ Cómo usar la demo
                </h3>

                <div className="tags_demo_help_steps">

                    <p>
                        1️⃣ Configurá el nombre y destino del QR.
                    </p>

                    <p>
                        2️⃣ Guardá los cambios con “Actualizar Demo”.
                    </p>

                    <p>
                        3️⃣ Escaneá el QR o simulá un acceso.
                    </p>

                    <p>
                        4️⃣ Mirá las estadísticas actualizarse en vivo.
                    </p>

                </div>

            </div>

            {/* GRID */}
            <div >

                {/* LEFT */}
                <div className="tags_demo_left">

                    <div className="row d-flex justify-content-between align-items-center p-3">{/* Flex de Configuracion y QR */}
                        {/* CONFIG */}
                        <div className="col-12 col-sm-6 tags_demo_card me-2 ">

                            <div className="tags_demo_card_header">

                                <h2>
                                    ⚙️ Configurá tu demo
                                </h2>

                                <span className="badge active">
                                    LIVE DEMO
                                </span>

                            </div>

                            {/* NAME */}
                            <div className="tags_demo_group">

                                <label>
                                    Nombre del QR
                                </label>

                                <input
                                    className="tags_demo_input"
                                    value={label}
                                    onChange={(e) =>
                                        setLabel(e.target.value)
                                    }
                                    placeholder="Ej: Mi Restaurante"
                                />

                            </div>

                            {/* URL */}
                            <div className="tags_demo_group">

                                <label>
                                    Link de destino
                                </label>

                                <input
                                    className="tags_demo_input"
                                    value={value}
                                    onChange={(e) =>
                                        setValue(e.target.value)
                                    }
                                    placeholder="https://..."
                                />

                            </div>

                            {/* PREVIEW */}
                            <div className="tags_demo_preview">

                                <div>

                                    <p className="tags_demo_preview_label">
                                        URL FINAL
                                    </p>

                                    <p className="tags_demo_preview_url">
                                        {finalUrl}
                                    </p>

                                </div>

                            </div>

                            {/* ACTIONS */}
                            <div className="tags_demo_actions">

                                <button
                                    className="tags_demo_btn_primary"
                                    onClick={handleSave}
                                    disabled={loading}
                                >
                                    {
                                        loading
                                            ? "Guardando..."
                                            : "💾 Actualizar Demo"
                                    }
                                </button>

                                <button
                                    className="tags_demo_btn_dark"
                                    onClick={handleOpenLink}
                                >
                                    🔗 Abrir enlace
                                </button>

                            </div>

                            {message && (

                                <div className="tags_demo_message">
                                    {message}
                                </div>

                            )}

                        </div>

                        {/* QR */}
                        <div className="col-12 col-sm-5 tags_demo_qr_card_inline mt-4">

                            <div className="tags_demo_qr_top">
                                <span className="badge active">QR REAL</span>
                                <span className="tags_demo_qr_code">{DEMO_CODE}</span>
                            </div>

                            <Image
                                src={getQRUrl(DEMO_CODE)}
                                alt="QR Demo"
                                width={320}
                                height={320}
                                className="tags_demo_qr_image"
                            />

                            <h3 className="tags_demo_qr_title">
                                {label}
                            </h3>

                            <button
                                className="tags_demo_btn_scan"
                                onClick={handleDemoScan}
                            >
                                📱 Simular Escaneo
                            </button>

                        </div>
                    </div>



                    {/* STATS */}
                    {/* STATS */}
                    <div className="tags_demo_card">

                        <div className="tags_demo_card_header">

                            <div>

                                <h2>
                                    📊 Estadísticas Reales
                                </h2>

                                <p className="tags_demo_card_subtitle">
                                    Datos reales generados por escaneos del QR.
                                </p>

                            </div>

                            <span className="badge pending">
                                TIEMPO REAL
                            </span>

                        </div>

                        {/* STATS GRID */}
                        <div className="tags_demo_stats_grid">

                            <div className="tags_demo_stat_box">

                                <span>
                                    Escaneos Totales
                                </span>

                                <strong>
                                    {totalScans}
                                </strong>

                            </div>

                            <div className="tags_demo_stat_box">

                                <span>
                                    Usuarios Únicos
                                </span>

                                <strong>
                                    {uniqueScans}
                                </strong>

                            </div>

                            <div className="tags_demo_stat_box">

                                <span>
                                    Mobile
                                </span>

                                <strong>
                                    {mobilePercent}%
                                </strong>

                            </div>

                            <div className="tags_demo_stat_box">

                                <span>
                                    Último Scan
                                </span>

                                <strong className="tags_demo_last_scan">

                                    {
                                        stats?.qr?.last_click_at
                                            ? new Date(
                                                stats.qr.last_click_at
                                            ).toLocaleString(
                                                "es-AR",
                                                {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                }
                                            )
                                            : "-"
                                    }

                                </strong>

                            </div>

                        </div>

                        {/* TABLE */}
                        <div className="tags_demo_scans_section mb-5 pb-5">

                            <div className="tags_demo_scans_header mt-5 mb-3">

                                <h3 style={{ fontWeight: "700" }}>
                                    🕒 Últimos Escaneos
                                </h3>

                                <span>
                                    Últimos 10 registros
                                </span>

                            </div>

                            <div className="tags_demo_table_wrap">

                                <table className="tags_demo_table">

                                    <thead>

                                        <tr>

                                            <th>
                                                Fecha
                                            </th>

                                            <th>
                                                Hora
                                            </th>

                                            <th>
                                                Ciudad
                                            </th>

                                            <th>
                                                Dispositivo
                                            </th>

                                            <th>
                                                Navegador
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {
                                            stats?.stats?.last_scans?.length > 0
                                                ? (
                                                    stats.stats.last_scans.map(
                                                        (
                                                            scan,
                                                            index
                                                        ) => {

                                                            const date =
                                                                new Date(
                                                                    scan.created_at
                                                                );

                                                            return (

                                                                <tr key={index}>

                                                                    <td>
                                                                        {
                                                                            date.toLocaleDateString(
                                                                                "es-AR"
                                                                            )
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            date.toLocaleTimeString(
                                                                                "es-AR",
                                                                                {
                                                                                    hour: "2-digit",
                                                                                    minute: "2-digit"
                                                                                }
                                                                            )
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            scan.city ||
                                                                            "-"
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            scan.device_type ||
                                                                            "-"
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            scan.browser ||
                                                                            "-"
                                                                        }
                                                                    </td>

                                                                </tr>
                                                            );
                                                        }
                                                    )
                                                )
                                                : (
                                                    <tr>

                                                        <td
                                                            colSpan="5"
                                                            className="tags_demo_empty"
                                                        >
                                                            Todavía no hay escaneos registrados
                                                        </td>

                                                    </tr>
                                                )
                                        }

                                    </tbody>

                                </table>

                            </div>

                        </div>
                        {/* GRAPHS */}
                        {/* ====== */}
                        <div className="tags_demo_charts">

                            {/* 📈 CLICK EN EL TIEMPO (MAIN) */}
                            <div className="tags_demo_chart_card full">

                                <div className="tags_demo_chart_header">
                                    <h3>📈 Actividad</h3>
                                </div>

                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={dailyData}>
                                        <XAxis dataKey="day" />
                                        <YAxis />
                                        <Tooltip />
                                        <Area
                                            type="monotone"
                                            dataKey="clicks"
                                            stroke="#3b82f6"
                                            fill="#3b82f633"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>

                            </div>

                            {/* 📱 DISPOSITIVOS */}
                            <div className="tags_demo_chart_card">

                                <div className="tags_demo_chart_header">
                                    <h3>📱 Dispositivos</h3>
                                </div>

                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={deviceData}
                                            dataKey="value"
                                            nameKey="device"
                                            outerRadius={80}
                                            label
                                        >
                                            {deviceData.map((_, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={
                                                        ["#3b82f6", "#10b981", "#f59e0b"][i % 3]
                                                    }
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>

                                <div className="tags_demo_chart_table">

                                    {deviceData.map((d, i) => (

                                        <div
                                            key={i}
                                            className="tags_demo_chart_table_row"
                                        >

                                            <span className="p-1">
                                                {d.device}
                                            </span>

                                            <strong className="p-1">
                                                {d.value}
                                            </strong>

                                        </div>

                                    ))}

                                </div>

                            </div>

                            {/* 🌐 NAVEGADORES */}
                            <div className="tags_demo_chart_card">

                                <div className="tags_demo_chart_header">
                                    <h3>🌐 Navegadores</h3>
                                </div>

                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={browserData}>
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#6366f1" />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="tags_demo_chart_table">

                                    {browserData.map((b, i) => (

                                        <div
                                            key={i}
                                            className="tags_demo_chart_table_row"
                                        >

                                            <span className="p-1">
                                                {b.name}
                                            </span>

                                            <strong className="p-1">
                                                {b.value}
                                            </strong>

                                        </div>

                                    ))}

                                </div>

                            </div>

                            {/* 🌍 CIUDADES */}
                            <div className="tags_demo_chart_card full">

                                <div className="tags_demo_chart_header">
                                    <h3>🌍 Ciudades</h3>
                                </div>

                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart layout="vertical" data={cityData}>
                                        <XAxis type="number" />
                                        <YAxis dataKey="city" type="category" />
                                        <Tooltip />
                                        <Bar dataKey="clicks" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="tags_demo_chart_table">

                                    {cityData.map((c, i) => (

                                        <div
                                            key={i}
                                            className="tags_demo_chart_table_row"
                                        >
                                            <span className="p-1">
                                                {c.city}
                                            </span>

                                            <strong className="p-1">
                                                {c.clicks}
                                            </strong>

                                        </div>

                                    ))}

                                </div>
                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}