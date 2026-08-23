import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image
} from "@react-pdf/renderer";
import { COMPANY_INFO } from "../../utils/companyInfo";
import { formatDatePretty } from "../../lib/fomatDatePretty";

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: "Helvetica",
        color: "#333"
    },

    // ================= PORTADA =================
    cover: {
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 200
    },

    coverTitle: {
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 10
    },

    coverSub: {
        fontSize: 14,
        color: "#666"
    },

    // ================= HEADER =================
    header: {
        borderBottom: "2px solid #000",
        paddingBottom: 10,
        marginBottom: 20
    },

    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between"
    },

    logo: {
        width: 120
    },
    logoSmall: {
        width: 50
    },

    title: {
        fontSize: 16,
        fontWeight: "bold"
    },

    subtitle: {
        fontSize: 9,
        color: "#666"
    },

    // ================= SECTION =================
    section: {
        marginBottom: 30
    },

    sectionTitle: {
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 8,
        borderBottom: "1px solid #ddd",
        paddingBottom: 4
    },

    // ================= KPI =================
    kpiContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20
    },

    kpiBox: {
        width: "48%",
        border: "1px solid #ddd",
        padding: 10,
        borderRadius: 4
    },

    kpiLabel: {
        fontSize: 9,
        color: "#666"
    },

    kpiValue: {
        fontSize: 18,
        fontWeight: "bold"
    },

    // ================= TABLE =================
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f2f2f2",
        padding: 5,
        fontWeight: "bold"
    },

    tableRow: {
        flexDirection: "row",
        borderBottom: "1px solid #eee",
        padding: 5
    },

    colQR: { width: "30%" },
    colLabel: { width: "30%" },
    colSmall: { width: "20%" },
    colWide: { width: "40%" },
    movementDate: { width: "18%" },
    movementCode: { width: "24%" },
    movementLocation: { width: "40%" },
    movementDevice: { width: "18%" },
    chartGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between"
    },
    chartBox: {
        width: "48%",
        height: 245,
        marginBottom: 14,
        border: "1px solid #e5e7eb",
        padding: 6
    },
    chartImage: {
        width: "100%",
        height: 215,
        objectFit: "contain"
    },

    // ================= FOOTER =================
    footer: {
        position: "absolute",
        bottom: 20,
        left: 40,
        right: 40,
        fontSize: 8,
        color: "#999",
        flexDirection: "row",
        justifyContent: "space-between"
    }
});

export default function BusinessReportPDF({ data }) {

    const baseUrl = process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : process.env.NEXT_PUBLIC_BASE_URL_PROD;

    const {
        business,
        summary,
        topQrs = [],
        qrStats = [],
        geo = {},
        devices = [],
        movements = [],
        filters = {}
    } = data;


    const { charts = {} } = data;
    const reportScope = data.reportScope || {};

    return (
        <Document>

            {/* ================= PORTADA ================= */}
            <Page style={styles.page}>
                <View style={styles.cover}>


                    <Image src={`${baseUrl}/logo_tags_slogan.png`} style={{ width: 150, marginBottom: 20 }} alt="Logo Tags"/>

                    <Text style={styles.coverTitle}>
                        Reporte de Estadísticas
                    </Text>

                    <Text style={{ marginTop: 20 }}>
                        Cliente: {business?.name || business?.email}
                    </Text>

                    <Text>
                        Fecha: {new Date().toLocaleDateString()}
                    </Text>

                </View>
            </Page>

            {/* ================= PAGE 2 ================= */}
            <Page style={styles.page}>

                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <Image src={`${baseUrl}/logo_tags_slogan.png`} style={styles.logo} alt="Logo Tags"/>

                        <View>
                            <Text style={styles.title}>
                        {reportScope.title || "Reporte de Actividad"}
                            </Text>
                            <Text style={styles.subtitle}>
                                Tags - Gestión y Reporting de Códigos QR
                            </Text>
                            <Text style={{ marginTop: 10 }}>Cliente: {business?.name}</Text>
                            <Text>Email: {business?.email}</Text>
                            {reportScope.customer && <Text>Cliente QR Agency: {reportScope.customer}</Text>}

                            <Text style={{ marginTop: 20, fontWeight: 550 }}>
                                QR: {filters.qr
                                    ? `${filters.qr.code} - ${filters.qr.label || ""}`
                                    : "Todos los QRs"}
                            </Text>

                            <Text style={{ fontWeight: 550 }}>
                                Período: {filters.from !== null && filters.to !== null
                                    ? ` ${formatDatePretty(filters.from)} - ${formatDatePretty(filters.to)}`
                                    : ' Últimos 30 días'}
                            </Text>
                        </View>
                    </View>

                </View>

                {/* KPI */}
                <View style={styles.kpiContainer}>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Total Clicks</Text>
                        <Text style={styles.kpiValue}>
                            {summary.totalClicks}
                        </Text>
                    </View>

                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Únicos</Text>
                        <Text style={styles.kpiValue}>
                            {summary.uniqueClicks}
                        </Text>
                    </View>
                </View>

                {/* TOP QRS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Top 10 QRs
                    </Text>

                    <View style={styles.tableHeader}>
                        <Text style={styles.colQR}>QR</Text>
                        <Text style={styles.colLabel}>Label</Text>
                        <Text style={styles.colSmall}>Clicks</Text>
                    </View>

                    {topQrs.slice(0, 10).map((q, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colQR}>{q.code}</Text>
                            <Text style={styles.colLabel}>{q.label || "-"}</Text>
                            <Text style={styles.colSmall}>{q.clicks}</Text>
                        </View>
                    ))}
                </View>

                {/* CIUDADES */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Top 10 Ciudades
                    </Text>

                    <View style={styles.tableHeader}>
                        <Text style={styles.colWide}>Ciudad</Text>
                        <Text style={styles.colSmall}>Clicks</Text>
                    </View>

                    {geo?.cities?.map((c, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colWide}>
                                {c.city}
                            </Text>
                            <Text style={styles.colSmall}>{c.total}</Text>
                        </View>
                    ))}
                </View>

                {/* DEVICES */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Dispositivos
                    </Text>

                    <View style={styles.tableHeader}>
                        <Text style={styles.colWide}>Tipo</Text>
                        <Text style={styles.colSmall}>Clicks</Text>
                    </View>

                    {devices.map((d, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colWide}>{d.device_type}</Text>
                            <Text style={styles.colSmall}>{d.total}</Text>
                        </View>
                    ))}
                </View>
                {/* Clicks por QR */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Clicks por QR
                    </Text>

                    <View style={styles.tableHeader}>
                        <Text style={styles.colQR}>QR</Text>
                        <Text style={styles.colLabel}>Nombre</Text>
                        <Text style={styles.colSmall}>Clicks</Text>
                    </View>

                    {qrStats.map((q, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colQR}>
                                {q.code}
                            </Text>
                            <Text style={styles.colLabel}>
                                {q.label ? q.label : ""}
                            </Text>
                            <Text style={styles.colSmall}>
                                {q.clicks}
                            </Text>
                        </View>
                    ))}
                </View>
            </Page>


            {/* ================= PAGE 3 ================= */}
            <Page style={styles.page}>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Movimientos recientes (últimos 100)
                    </Text>

                    <View style={styles.tableHeader}>
                        <Text style={styles.movementDate}>Fecha y hora</Text>
                        <Text style={styles.movementCode}>Codigo QR</Text>
                        <Text style={styles.colWide}>Ubicación</Text>
                        <Text style={styles.movementDevice}>Dispositivo</Text>
                    </View>

                    {movements.slice(0, 100).map((m, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.movementDate}>
                                {m.created_at ? new Date(m.created_at).toLocaleString("es-AR") : "-"}
                            </Text>
                            <Text style={styles.movementCode}>
                                {m.code || "-"}
                            </Text>

                            <Text style={styles.movementLocation}>
                                {[m.country, m.region, m.city].filter(Boolean).join(" / ") || "-"}
                            </Text>

                            <Text style={styles.movementDevice}>
                                {m.device_type || "-"}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* FOOTER */}
                <View style={styles.footer} fixed>

                    <View>
                        <Image src={`${baseUrl}/logo_tags_slogan.png`} style={styles.logoSmall} alt="Logo Tags"/>
                        {/* <Text>{COMPANY_INFO.name}</Text>
                        <Text>{COMPANY_INFO.slogan}</Text> */}
                    </View>

                    <View>
                        <Text>{COMPANY_INFO.address}</Text>
                        <Text>{COMPANY_INFO.email}</Text>
                        <Text>{COMPANY_INFO.web}</Text>
                        <Text>{COMPANY_INFO.whatsapp}</Text>
                    </View>

                </View>

            </Page>
            {/* **************************** */}
            {/* ================= CHARTS ================= */}
            <Page style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Gráficos de actividad</Text>
                    {[
                        [charts.timeline, "Clicks diarios"],
                        [charts.qrsClicks, "Clicks por QR"]
                    ].map(([src, title]) => src ? (
                        <View style={{ marginBottom: 22 }} key={title}>
                            <Text style={styles.subtitle}>{title}</Text>
                            <Image src={src} style={{ width: "100%", height: 300, objectFit: "contain" }} alt={title} />
                        </View>
                    ) : null)}
                </View>
                <View style={styles.footer} fixed>
                    <View>
                        <Image src={`${baseUrl}/logo_tags_slogan.png`} style={styles.logoSmall} alt="Logo Tags"/>
                    </View>
                    <View>
                        <Text>{COMPANY_INFO.address}</Text>
                        <Text>{COMPANY_INFO.email}</Text>
                        <Text>{COMPANY_INFO.web}</Text>
                        <Text>{COMPANY_INFO.whatsapp}</Text>
                    </View>
                </View>
            </Page>
            <Page style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Gráficos de ubicación y dispositivos</Text>
                    {[
                        [charts.city, "Clicks por ciudad"],
                        [charts.device, "Clicks por dispositivo"]
                    ].map(([src, title]) => src ? (
                        <View style={{ marginBottom: 22 }} key={title}>
                            <Text style={styles.subtitle}>{title}</Text>
                            <Image src={src} style={{ width: "100%", height: 300, objectFit: "contain" }} alt={title} />
                        </View>
                    ) : null)}
                </View>
                <View style={styles.footer} fixed>
                    <View>
                        <Image src={`${baseUrl}/logo_tags_slogan.png`} style={styles.logoSmall} alt="Logo Tags"/>
                    </View>
                    <View>
                        <Text>{COMPANY_INFO.address}</Text>
                        <Text>{COMPANY_INFO.email}</Text>
                        <Text>{COMPANY_INFO.web}</Text>
                        <Text>{COMPANY_INFO.whatsapp}</Text>
                    </View>
                </View>
            </Page>
            {false && (<>
            {/*           Página 4           */}
            <Page style={styles.page}>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Evolución de Clicks
                    </Text>

                    {charts.timeline && (
                        <Image src={charts.timeline} style={{ width: "100%", height: 220 }} alt="Timeline de clicks" />
                    )}
                </View>
                {/* FOOTER */}
                <View style={styles.footer} fixed>

                    <View>
                        <Image src={`${baseUrl}/logo_tags_slogan.png`} style={styles.logoSmall} alt="Logo Tags"/>
                        {/* <Text>{COMPANY_INFO.name}</Text>
                        <Text>{COMPANY_INFO.slogan}</Text> */}
                    </View>

                    <View>
                        <Text>{COMPANY_INFO.address}</Text>
                        <Text>{COMPANY_INFO.email}</Text>
                        <Text>{COMPANY_INFO.web}</Text>
                        <Text>{COMPANY_INFO.whatsapp}</Text>
                    </View>

                </View>
            </Page>
            {/*           Página 5  Clicks por QR        */}
            <Page style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Clicks por QR (max. 50)
                    </Text>

                    {charts.qrsClicks && (
                        <Image src={charts.qrsClicks} style={{ width: "100%", height: 220 }} alt="Chart clicks por QR"/>
                    )}
                </View>
                {/* FOOTER */}
                <View style={styles.footer} fixed>

                    <View>
                        <Image src={`${baseUrl}/logo_tags_slogan.png`} style={styles.logoSmall} alt="Logo Tags"/>
                        {/* <Text>{COMPANY_INFO.name}</Text>
                        <Text>{COMPANY_INFO.slogan}</Text> */}
                    </View>

                    <View>
                        <Text>{COMPANY_INFO.address}</Text>
                        <Text>{COMPANY_INFO.email}</Text>
                        <Text>{COMPANY_INFO.web}</Text>
                        <Text>{COMPANY_INFO.whatsapp}</Text>
                    </View>

                </View>
            </Page>

            {/*           Página 5           */}
            <Page style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Ciudades
                    </Text>

                    {charts.city && (
                        <Image src={charts.city} style={{ width: "100%", height: 220 }} alt="Chart clicks por ciudad"/>
                    )}
                </View>
                {/* FOOTER */}
                <View style={styles.footer} fixed>

                    <View>
                        <Image src={`${baseUrl}/logo_tags_slogan.png`} style={styles.logoSmall} alt="Logo Tags"/>
                        {/* <Text>{COMPANY_INFO.name}</Text>
                        <Text>{COMPANY_INFO.slogan}</Text> */}
                    </View>

                    <View>
                        <Text>{COMPANY_INFO.address}</Text>
                        <Text>{COMPANY_INFO.email}</Text>
                        <Text>{COMPANY_INFO.web}</Text>
                        <Text>{COMPANY_INFO.whatsapp}</Text>
                    </View>

                </View>
            </Page>
            {/*           Página 6           */}
            <Page style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Dispositivos
                    </Text>

                    {charts.device && (
                        <Image src={charts.device} style={{ width: "100%", height: 220 }} alt="Chart clicks por dispositivo"/>
                    )}
                </View>
                {/* FOOTER */}
                <View style={styles.footer} fixed>

                    <View>
                        <Image src={`${baseUrl}/logo_tags_slogan.png`} style={styles.logoSmall} alt="Logo Tags"/>
                        {/* <Text>{COMPANY_INFO.name}</Text>
                        <Text>{COMPANY_INFO.slogan}</Text> */}
                    </View>

                    <View>
                        <Text>{COMPANY_INFO.address}</Text>
                        <Text>{COMPANY_INFO.email}</Text>
                        <Text>{COMPANY_INFO.web}</Text>
                        <Text>{COMPANY_INFO.whatsapp}</Text>
                    </View>

                </View>
            </Page>

            </>
            )}
        </Document>
    );
}
