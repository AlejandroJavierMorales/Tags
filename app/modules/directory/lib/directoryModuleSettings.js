export const DIRECTORY_MODULE_CODES = [
    "store",
    "resto",
    "turnos",
    "chatbot",
    "reviewsInvitation",
    "reviewsSlider"
];

const DEFAULT_CONTENT = {
    turnos: {
        menuLabel: "Reservas",
        eyebrow: "RESERVAS ONLINE",
        title: "Reservá tu próximo turno",
        description: "Elegí la actividad, el día y el horario que prefieras.",
        showIntro: true,
        backgroundColor: "#f3f7f5",
        surfaceColor: "#ffffff",
        textColor: "#17231d",
        accentColor: "#26734f",
        borderRadius: "18px",
        padding: "24px"
    },
    reviewsInvitation: {
        eyebrow: "TU EXPERIENCIA",
        title: "¿Cómo fue tu experiencia?",
        text: "Tu opinión nos ayuda a mejorar y también orienta a quienes están planificando su visita.",
        buttonLabel: "Dejar una reseña"
    },
    reviewsSlider: {
        eyebrow: "OPINIONES",
        title: "Lo que cuentan nuestros clientes",
        description: "Experiencias compartidas por quienes ya nos visitaron.",
        limit: 10,
        showDate: true,
        showVerified: true
    }
};

export function getDirectoryModuleSettings(globalStyles = {}) {
    const source = globalStyles?.directoryModules || {};
    return DIRECTORY_MODULE_CODES.reduce((result, code, index) => {
        const legacyReviews = code.startsWith("reviews")
            ? source?.reviews || {}
            : {};
        const current = source?.[code] || legacyReviews;
        result[code] = {
            enabled: current.enabled !== false,
            sortOrder: Number(current.sortOrder || (1000 + index * 10)),
            content: {
                ...(DEFAULT_CONTENT[code] || {}),
                ...(current.content || {})
            }
        };
        return result;
    }, {});
}
