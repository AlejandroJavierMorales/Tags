// =========================
    // BADGES
    // =========================

    export function badgeStatusEvent(status) {

        switch (status) {

            case "draft":
                return "badge pending";

            case "published":
                return "badge";

            case "active":
                return "badge active";

            case "finished":
                return "badge";

            case "cancelled":
                return "badge danger";

            default:
                return "badge";
        }
    }

    export function statusLabelEvent(status) {

        switch (status) {

            case "draft":
                return "Borrador";

            case "published":
                return "Publicado";

            case "active":
                return "Activo";

            case "finished":
                return "Finalizado";

            case "cancelled":
                return "Cancelado";

            default:
                return status;
        }
    }
