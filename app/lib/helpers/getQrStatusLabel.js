export function mapStatus(status) {
    switch (status) {
        case "active": return "Activo";
        case "pending": return "Activación Pendiente";
        case "disabled": return "Deshabilitado";
        case "available": return "En stock";
        case "assigned": return "Asignado s/Activar";
        case "stopped": return "Pausado";
        case "generated" : return "Generado"
        default: return status;
    }
}