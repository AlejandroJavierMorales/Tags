export function formatDate(dateInput) {
    if (!dateInput) return "-";

    const date = new Date(dateInput);

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("es-AR");
}