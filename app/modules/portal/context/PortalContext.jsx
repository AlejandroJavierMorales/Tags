// =====================================
// FILE: app/modules/portal/context/PortalContext.jsx
// Descripción: Contexto público del Portal para compartir configuración, navegación y modo de render.
// =====================================

"use client";

import { createContext, useContext } from "react";

const PortalContext =
    createContext(null);

export function PortalProvider({
    value,
    children
}) {
    return (
        <PortalContext.Provider value={value}>
            {children}
        </PortalContext.Provider>
    );
}

export function usePortal() {
    return useContext(PortalContext);
}