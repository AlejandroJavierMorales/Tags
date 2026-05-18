export function getSubscriptionStatusLabel(status) {

    switch (status) {

        case "active":
            return "Activo";

        case "pending":
            return "Pendiente";

        case "paused":
            return "Pausado";

        case "inactive":
            return "Deshabilitado";

        default:
            return "Desconocido";
    }
}