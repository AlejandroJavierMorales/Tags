import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image
} from "@react-pdf/renderer";


const styles =
    StyleSheet.create({

        page: {
            padding: 28,
            fontSize: 9,
            fontFamily: "Helvetica",
            color: "#111"
        },

        header: {
            marginBottom: 18,
            borderBottom: "1 solid #ddd",
            paddingBottom: 12
        },

        title: {
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 6
        },

        subtitle: {
            fontSize: 10,
            color: "#444",
            marginBottom: 3
        },

        sectionTitle: {
            fontSize: 13,
            fontWeight: "bold",
            marginTop: 14,
            marginBottom: 8
        },

        summaryRow: {
            flexDirection: "row",
            gap: 10,
            marginBottom: 12
        },

        summaryBox: {
            flex: 1,
            border: "1 solid #ddd",
            padding: 8,
            borderRadius: 4
        },

        summaryLabel: {
            fontSize: 8,
            color: "#666"
        },

        summaryValue: {
            fontSize: 15,
            fontWeight: "bold",
            marginTop: 3
        },

        group: {
            marginBottom: 12,
            border: "1 solid #ddd"
        },

        groupHeader: {
            backgroundColor: "#f2f2f2",
            padding: 7,
            fontWeight: "bold"
        },

        tableHeader: {
            flexDirection: "row",
            backgroundColor: "#111",
            color: "#fff",
            padding: 5,
            fontSize: 8
        },

        row: {
            flexDirection: "row",
            borderTop: "1 solid #eee",
            padding: 5,
            fontSize: 8
        },

        colType: {
            width: "16%"
        },

        colName: {
            width: "25%"
        },

        colPhone: {
            width: "17%"
        },

        colTable: {
            width: "14%"
        },

        colCheckin: {
            width: "14%"
        },

        colNotes: {
            width: "14%"
        },

        dietaryRow: {
            flexDirection: "row",
            borderBottom: "1 solid #eee",
            padding: 5,
            fontSize: 8
        },

        footer: {
            position: "absolute",
            bottom: 15,
            left: 28,
            right: 28,
            borderTop: "1 solid #ddd",
            paddingTop: 6,
            flexDirection: "row",
            alignItems: "center",
            color: "#666",
            fontSize: 9
        }
    });

export default function EventAssistantsPdf({
    event = {},
    stats = {},
    grouped = [],
    items = [],
    options = {
        assistants: true,
        dietary: true
    }
}) {

    const base = process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;

    const generatedAt =
        new Date()
            .toLocaleString("es-AR");

    const dietaryItems =
        items.filter(item =>
            item.dietary_notes
            ||
            item.custom_dietary_notes
        );

    return (

        <Document>

            <Page
                size="A4"
                style={styles.page}
            >

                <View style={styles.header}>

                    <Text style={styles.title}>
                        {event?.name || "Listado de asistentes"}
                    </Text>

                    <Text style={styles.subtitle}>
                        Fecha: {event?.date || event?.event_date || "-"}
                    </Text>

                    <Text style={styles.subtitle}>
                        Hora: {event?.time || event?.event_time || "-"}
                    </Text>

                    <Text style={styles.subtitle}>
                        Ubicación: {event?.location || event?.address || "-"}
                    </Text>

                    <Text style={styles.subtitle}>
                        Generado: {generatedAt}
                    </Text>

                </View>

                <View style={styles.summaryRow}>

                    <SummaryBox
                        label="Total asistentes"
                        value={stats.total || 0}
                    />

                    <SummaryBox
                        label="Titulares"
                        value={stats.attendees || 0}
                    />

                    <SummaryBox
                        label="Acompañantes"
                        value={stats.companions || 0}
                    />

                    <SummaryBox
                        label="Check-in"
                        value={stats.checked_in || 0}
                    />

                </View>

                {
                    options.assistants
                    &&
                    (
                        <View>

                            <Text style={styles.sectionTitle}>
                                Listado de asistentes
                            </Text>

                            {
                                grouped.map(group => (

                                    <View
                                        key={group.owner_id}
                                        style={styles.group}
                                        wrap={false}
                                    >

                                        <Text style={styles.groupHeader}>
                                            {group.owner_name || "Titular"}
                                            {
                                                group.table_name
                                                    ? ` · Mesa ${group.table_name}`
                                                    : ""
                                            }
                                        </Text>

                                        <View style={styles.tableHeader}>
                                            <Text style={styles.colType}>Tipo</Text>
                                            <Text style={styles.colName}>Nombre</Text>
                                            <Text style={styles.colPhone}>Teléfono</Text>
                                            <Text style={styles.colTable}>Mesa</Text>
                                            <Text style={styles.colCheckin}>Check-in</Text>
                                            <Text style={styles.colNotes}>Notas</Text>
                                        </View>

                                        {
                                            group.rows.map(item => (

                                                <View
                                                    key={`${item.type}-${item.id}`}
                                                    style={styles.row}
                                                >
                                                    <Text style={styles.colType}>
                                                        {
                                                            item.type === "attendee"
                                                                ? "Titular"
                                                                : "Acomp."
                                                        }
                                                    </Text>

                                                    <Text style={styles.colName}>
                                                        {item.name || "-"}
                                                    </Text>

                                                    <Text style={styles.colPhone}>
                                                        {item.phone || "-"}
                                                    </Text>

                                                    <Text style={styles.colTable}>
                                                        {item.table_name || "-"}
                                                    </Text>

                                                    <Text style={styles.colCheckin}>
                                                        {
                                                            item.checked_in_at
                                                                ? "Ingresó"
                                                                : "Pendiente"
                                                        }
                                                    </Text>

                                                    <Text style={styles.colNotes}>
                                                        {
                                                            item.dietary_notes
                                                            ||
                                                            item.custom_dietary_notes
                                                            ||
                                                            "-"
                                                        }
                                                    </Text>
                                                </View>
                                            ))
                                        }

                                    </View>
                                ))
                            }

                        </View>
                    )
                }

                {
                    options.dietary
                    &&
                    (
                        <View>

                            <Text style={styles.sectionTitle}>
                                Restricciones alimentarias
                            </Text>

                            <View style={styles.tableHeader}>
                                <Text style={{ width: "25%" }}>Titular</Text>
                                <Text style={{ width: "18%" }}>Tipo</Text>
                                <Text style={{ width: "25%" }}>Persona</Text>
                                <Text style={{ width: "32%" }}>Restricción / nota</Text>
                            </View>

                            {
                                dietaryItems.length > 0
                                    ?
                                    dietaryItems.map(item => (

                                        <View
                                            key={`dietary-${item.type}-${item.id}`}
                                            style={styles.dietaryRow}
                                        >
                                            <Text style={{ width: "25%" }}>
                                                {item.owner_name || "-"}
                                            </Text>

                                            <Text style={{ width: "18%" }}>
                                                {
                                                    item.type === "attendee"
                                                        ? "Titular"
                                                        : "Acomp."
                                                }
                                            </Text>

                                            <Text style={{ width: "25%" }}>
                                                {item.name || "-"}
                                            </Text>

                                            <Text style={{ width: "32%" }}>
                                                {
                                                    item.dietary_notes
                                                    ||
                                                    item.custom_dietary_notes
                                                    ||
                                                    "-"
                                                }
                                            </Text>
                                        </View>
                                    ))
                                    :
                                    (
                                        <View style={styles.dietaryRow}>
                                            <Text>
                                                Sin restricciones alimentarias registradas.
                                            </Text>
                                        </View>
                                    )
                            }

                        </View>
                    )
                }

                <View
                    fixed
                    style={styles.footer}
                >

                    <Text>
                        Generado por Tags e-Events -
                    </Text>

                    <Image
                        src={`${base}/assets/icons/telefono.png`}
                        style={{
                            width: 10,
                            height: 10,
                            marginLeft: 8,
                            marginRight: 4
                        }}
                    />

                    <Text>
                        3546-562855
                    </Text>

                    <Image
                        src={`${base}/assets/icons/email.png`}
                        style={{
                            width: 10,
                            height: 10,
                            marginLeft: 8,
                            marginRight: 4
                        }}
                    />

                    <Text>
                        info@tags.com.ar
                    </Text>

                    <Image
                        src={`${base}/assets/icons/web.png`}
                        style={{
                            width: 10,
                            height: 10,
                            marginLeft: 8,
                            marginRight: 4
                        }}
                    />

                    <Text>
                        www.tags.com.ar
                    </Text>

                </View>

            </Page>

        </Document>
    );
}

function SummaryBox({
    label,
    value
}) {

    return (

        <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>
                {label}
            </Text>

            <Text style={styles.summaryValue}>
                {value}
            </Text>
        </View>
    );
}