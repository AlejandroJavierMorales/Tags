import { cleanText } from "./turnosService";

const ALLOWED_TYPES = new Set(["text", "textarea", "select", "checkbox"]);

export function normalizeIntakeFields(value) {
    if (!Array.isArray(value)) return [];
    const used = new Set();
    return value.slice(0, 20).map((item, index) => {
        const rawKey = cleanText(item?.key || `pregunta_${index + 1}`, 80)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "") || `pregunta_${index + 1}`;
        let key = rawKey;
        let suffix = 2;
        while (used.has(key)) key = `${rawKey}_${suffix++}`;
        used.add(key);
        const type = ALLOWED_TYPES.has(item?.type) ? item.type : "text";
        const options = type === "select"
            ? (Array.isArray(item?.options) ? item.options : String(item?.options || "").split("\n"))
                .map(option => cleanText(option, 120)).filter(Boolean).slice(0, 30)
            : [];
        return {
            key,
            label: cleanText(item?.label || `Pregunta ${index + 1}`, 190),
            type,
            required: item?.required === true,
            options,
            sortOrder: index
        };
    }).filter(item => item.label && (item.type !== "select" || item.options.length));
}

export function normalizeIntakeAnswers(fields, value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const answers = [];
    for (const field of normalizeIntakeFields(fields)) {
        const raw = source[field.key];
        let answer = field.type === "checkbox"
            ? (raw === true || raw === 1 || raw === "1" || raw === "true" ? "Sí" : "No")
            : cleanText(raw, 4000);
        if (field.type === "select" && answer && !field.options.includes(answer)) answer = "";
        if (field.required && (!answer || (field.type === "checkbox" && answer !== "Sí"))) {
            return { ok: false, error: `Completá: ${field.label}`, answers: [] };
        }
        if (answer) answers.push({ ...field, answer });
    }
    return { ok: true, answers };
}

export async function saveIntakeAnswers(connection, bookingId, answers) {
    for (const item of answers) {
        await connection.query(
            `INSERT INTO tags_turnos_booking_answers
             (booking_id, field_key, field_label, field_type, answer_text, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [bookingId, item.key, item.label, item.type, item.answer, item.sortOrder]
        );
    }
}
