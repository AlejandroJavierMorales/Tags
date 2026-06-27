// =====================================
// Archivo:
// /app/modules/store/lib/storeSession.js
//
// Descripción:
// Maneja la sesión pública anónima
// utilizada por Tags Tienda.
//
// Función:
// - Crear session_id.
// - Persistir session_id.
// - Recuperar session_id.
//
// Utilizado por:
// - Favoritos
// - Historial
// - Comparador (futuro)
// - Carrito persistente (futuro)
//
// Contexto:
// store
// =====================================

export function getStoreSessionId() {
    if (typeof window === "undefined") {
        return null;
    }

    const key =
        "tags_store_session_id";

    let sessionId =
        localStorage.getItem(key);

    if (!sessionId) {
        sessionId =
            crypto.randomUUID();

        localStorage.setItem(
            key,
            sessionId
        );
    }

    return sessionId;
}