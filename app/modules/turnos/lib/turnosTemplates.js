export const TURNOS_TEMPLATES = {
    generic: {
        code: "generic",
        label: "Genérico",
        description: "Configurá servicios, recursos y horarios desde cero.",
        resourceLabel: "Recurso",
        serviceLabel: "Servicio",
        bookingMode: "individual",
        capabilities: ["appointments"]
    },
    spa: {
        code: "spa",
        label: "Spa",
        description: "Tratamientos, profesionales, cabinas y tiempos de preparación.",
        resourceLabel: "Profesional o cabina",
        serviceLabel: "Tratamiento",
        bookingMode: "individual",
        capabilities: ["appointments", "resources", "service_buffers"]
    },
    bike_kayak: {
        code: "bike_kayak",
        label: "Bicicletas / Kayaks",
        description: "Alquiler de unidades por duración, cantidad y disponibilidad.",
        resourceLabel: "Bicicleta o kayak",
        serviceLabel: "Tipo de alquiler",
        bookingMode: "rental",
        capabilities: ["rentals", "resources", "capacity"]
    },
    hairdresser: {
        code: "hairdresser",
        label: "Peluquería",
        description: "Servicios de peluquería, profesionales y duración por atención.",
        resourceLabel: "Profesional",
        serviceLabel: "Servicio",
        bookingMode: "individual",
        capabilities: ["appointments", "resources", "service_buffers"]
    }
};

export function getTurnosTemplate(code) {
    return TURNOS_TEMPLATES[code] || TURNOS_TEMPLATES.generic;
}

export const TURNOS_TEMPLATE_OPTIONS = Object.values(TURNOS_TEMPLATES);
