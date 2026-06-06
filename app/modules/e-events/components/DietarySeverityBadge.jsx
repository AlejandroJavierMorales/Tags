export default function DietarySeverityBadge({
    severity
}) {

    let bg = "#dcfce7";
    let color = "#166534";
    let label = "Preference";

    if (severity === "allergy") {

        bg = "#fed7aa";
        color = "#9a3412";
        label = "Allergy";
    }

    if (severity === "critical") {

        bg = "#fee2e2";
        color = "#991b1b";
        label = "Critical";
    }

    return (

        <div
            style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: bg,
                color,
                fontSize: 12,
                fontWeight: 700
            }}
        >
            {label}
        </div>

    );
}