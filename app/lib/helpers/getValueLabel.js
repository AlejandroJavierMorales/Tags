// -----------------------------
// LABEL DINÁMICO
// -----------------------------
export function getValueLabel(qrTypeCode) {
    switch (qrTypeCode) {
        case "whatsapp":
            return { label: "Nro de Whatsapp", place: "Ej: 5493512345678" };

        case "instagram":
            return { label: "Usuario de Instagram", place: "Ej: usuario (sin @)" };

        case "facebook":
            return { label: "Usuario de Facebook", place: "Ej: usuario (sin @)" };

        case "google_reviews":
            return { label: "Link de Google", place: "Ej: https://www.google.com/maps/..." };

        case "google_maps":
            return { label: "Link de Google", place: "Ej: https://www.google.com/maps/..." };

        case "website":
            return { label: "Link Web", place: "Ej: https://www.tuweb.com" };

        case "url":
            return { label: "Link Web", place: "Ej: https://www.tuweb.com" };

        case "tictok":
            return { label: "Link", place: "Ej: usuario (sin @)" };
            
        case "digital":
            return { label: "Link", place: "Ej: https://www.rutaCompleta.com" };



        default:
            return "Ingresar enlace";
    }
}

