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

            padding: 32,
            fontSize: 11,
            fontFamily: "Helvetica",
            backgroundColor: "#fafafa"
        },

        header: {

            marginBottom: 26,
            paddingBottom: 18,
            borderBottom: "1px solid #e5e5e5"
        },

        title: {

            fontSize: 24,
            fontWeight: 700,
            marginBottom: 6
        },

        subtitle: {

            fontSize: 11,
            color: "#666"
        },

        section: {

            marginBottom: 18,
            backgroundColor: "#fff",
            border: "1px solid #ececec",
            borderRadius: 12,
            padding: 16
        },

        sectionHeader: {

            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            paddingBottom: 10,
            borderBottom: "1px solid #f1f1f1"
        },

        sectionTitle: {

            fontSize: 15,
            fontWeight: 700
        },

        countBadge: {

            fontSize: 10,
            color: "#666"
        },

        attendeeRow: {

            paddingTop: 10,
            paddingBottom: 10,
            borderBottom: "1px solid #f5f5f5"
        },

        attendeeName: {

            fontSize: 12,
            fontWeight: 700,
            marginBottom: 4
        },

        attendeeInfo: {

            fontSize: 10,
            color: "#666",
            marginBottom: 2
        },

        restrictionList: {

            marginTop: 8
        },

        restrictionItem: {

            fontSize: 10,
            marginBottom: 4,
            color: "#222"
        },

        notesBox: {

            marginTop: 8,
            backgroundColor: "#f8f8f8",
            border: "1px solid #ececec",
            borderRadius: 8,
            padding: 8
        },

        notesText: {

            fontSize: 9,
            color: "#444",
            lineHeight: 1.4
        },

        footer: {

            marginTop: 20,
            paddingTop: 10,
            borderTop: "1px solid #ececec",
            fontSize: 9,
            color: "#999"
        }
    });

export default function EventDietaryReportDocument({

    event,
    report = [],
    mode = "restriction"

}) {

    const base = process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL;



    // =========================
    // USED RESTRICTIONS
    // =========================

    const usedRestrictions =
        report.filter(item =>
            Number(item.total_attendees || 0) > 0
        );

    // =========================
    // GROUP BY ATTENDEE
    // =========================

    const groupedAttendees = {};

    usedRestrictions.forEach(restriction => {

        restriction.attendees?.forEach(att => {

            if (!groupedAttendees[att.id]) {

                groupedAttendees[att.id] = {

                    id:
                        att.id,

                    name:
                        att.name,

                    email:
                        att.email,

                    phone:
                        att.phone,

                    custom_dietary_notes:
                        att.custom_dietary_notes,

                    restrictions: []
                };
            }

            groupedAttendees[att.id]
                .restrictions
                .push({

                    id:
                        restriction.id,

                    name:
                        restriction.name,

                    severity:
                        restriction.severity
                });
        });
    });

    const attendees =
        Object.values(groupedAttendees);

    return (

        <Document>

            <Page
                size="A4"
                style={styles.page}
            >

                {/* HEADER */}
                <View style={styles.header}>

                    <Text style={styles.title}>
                        Reporte Catering
                    </Text>

                    <Text style={styles.subtitle}>
                        {event?.name || ""}
                    </Text>

                    <Text style={styles.subtitle}>
                        Tipo:
                        {" "}
                        {
                            mode === "attendee"
                                ? "Agrupado por invitado"
                                : "Agrupado por restricción"
                        }
                    </Text>

                </View>

                {/* =========================
                    MODE: RESTRICTION
                ========================= */}

                {
                    mode === "restriction"
                    &&
                    usedRestrictions.map(item => (

                        <View
                            key={item.id}
                            style={styles.section}
                        >

                            <View
                                style={styles.sectionHeader}
                            >

                                <Text
                                    style={styles.sectionTitle}
                                >
                                    {item.name}
                                </Text>

                                <Text
                                    style={styles.countBadge}
                                >
                                    {item.total_attendees}
                                    {" "}
                                    invitados
                                </Text>

                            </View>

                            {
                                item.attendees?.map(att => (

                                    <View
                                        key={att.id}
                                        style={styles.attendeeRow}
                                    >

                                        <Text
                                            style={styles.attendeeName}
                                        >
                                            {att.name}
                                        </Text>

                                        {
                                            att.email
                                            &&
                                            (
                                                <Text
                                                    style={styles.attendeeInfo}
                                                >
                                                    {att.email}
                                                </Text>
                                            )
                                        }

                                        {
                                            att.phone
                                            &&
                                            (
                                                <Text
                                                    style={styles.attendeeInfo}
                                                >
                                                    {att.phone}
                                                </Text>
                                            )
                                        }

                                        {
                                            att.custom_dietary_notes
                                            &&
                                            (
                                                <View
                                                    style={styles.notesBox}
                                                >

                                                    <Text
                                                        style={styles.notesText}
                                                    >
                                                        {att.custom_dietary_notes}
                                                    </Text>

                                                </View>
                                            )
                                        }

                                    </View>

                                ))
                            }

                        </View>

                    ))
                }

                {/* =========================
                    MODE: ATTENDEE
                ========================= */}

                {
                    mode === "attendee"
                    &&
                    attendees.map(att => (

                        <View
                            key={att.id}
                            style={styles.section}
                        >

                            <View
                                style={styles.sectionHeader}
                            >

                                <Text
                                    style={styles.sectionTitle}
                                >
                                    {att.name}
                                </Text>

                                <Text
                                    style={styles.countBadge}
                                >
                                    {att.restrictions.length}
                                    {" "}
                                    restricciones
                                </Text>

                            </View>

                            {
                                att.email
                                &&
                                (
                                    <Text
                                        style={styles.attendeeInfo}
                                    >
                                        {att.email}
                                    </Text>
                                )
                            }

                            {
                                att.phone
                                &&
                                (
                                    <Text
                                        style={styles.attendeeInfo}
                                    >
                                        {att.phone}
                                    </Text>
                                )
                            }

                            <View
                                style={styles.restrictionList}
                            >

                                {
                                    att.restrictions?.map(r => (

                                        <Text
                                            key={r.id}
                                            style={styles.restrictionItem}
                                        >
                                            • {r.name}
                                        </Text>

                                    ))
                                }

                            </View>

                            {
                                att.custom_dietary_notes
                                &&
                                (
                                    <View
                                        style={styles.notesBox}
                                    >

                                        <Text
                                            style={styles.notesText}
                                        >
                                            {att.custom_dietary_notes}
                                        </Text>

                                    </View>
                                )
                            }

                        </View>

                    ))
                }

                {/* FOOTER */}
                {/* <View style={styles.footer}>

                   <Text>
    Generado automáticamente por Tags Eventos
    {"  "}☎ 3546-562855
    {"  "}✉ info@tags.com.ar
    {"  "}⌂ www.tags.com.ar
</Text>

                </View> */}
                <View
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 6,
                        color: "#666",
                        fontSize: 9
                    }}

                >
                    <Text>
                        Generado por Tags e-Events -
                    </Text>
                    <Image
                        src={`${base}/assets/icons/telefono.png`}
                        style={{
                            width: 10,
                            height: 10
                        }}
                    />

                    <Text>
                        3546-562855
                    </Text>

                    <Image
                        src={`${base}/assets/icons/email.png`}
                        style={{
                            width: 10,
                            height: 10
                        }}
                    />

                    <Text>
                        info@tags.com.ar
                    </Text>

                    <Image
                        src={`${base}/assets/icons/web.png`}
                        style={{
                            width: 10,
                            height: 10
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