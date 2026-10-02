"use client";

import { useEffect, useState } from "react";
import { FaBell, FaBellSlash } from "react-icons/fa6";
import "./LoyaltyPushButton.css";

function decodeKey(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
}

export default function LoyaltyPushButton({ businessId, businessIds = [] }) {
    const ids = [...new Set([businessId, ...businessIds].map(Number).filter(Boolean))];
    const [state, setState] = useState("loading");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!(typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window)) return setState("unsupported");
        navigator.serviceWorker.register("/dashboard-sw.js", { scope: "/" })
            .then(registration => registration.pushManager.getSubscription())
            .then(subscription => setState(subscription ? "active" : Notification.permission === "denied" ? "denied" : "idle"))
            .catch(() => setState("idle"));
    }, []);

    async function toggle() {
        setState("busy");
        setError("");
        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") return setState("denied");
            if (!ids.length) throw new Error("No hay programas adheridos para activar avisos.");
            const configResponse = await fetch(`/api/loyalty/member/push/subscriptions?businessId=${ids[0]}`, { cache: "no-store" });
            const config = await configResponse.json();
            if (!configResponse.ok || !config.publicKey) throw new Error("Las notificaciones push no están configuradas en producción.");
            const registration = await navigator.serviceWorker.register("/dashboard-sw.js", { scope: "/" });
            const current = await registration.pushManager.getSubscription();
            const subscription = current || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(config.publicKey) });
            const responses = await Promise.all(ids.map(id => fetch("/api/loyalty/member/push/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId: id, subscription: subscription.toJSON() })
            })));
            const failed = responses.find(response => !response.ok);
            if (failed) throw new Error("No se pudo registrar este dispositivo para todos tus programas.");
            setState("active");
        } catch (error) {
            console.error("LOYALTY PUSH ERROR", error);
            setError(error.message || "No se pudieron activar los avisos.");
            setState("error");
        }
    }

    if (state === "unsupported") return null;
    return <span className="tags_loyalty_push_wrap">
        <button type="button" className={`tags_loyalty_push_button is_${state}`} onClick={toggle} disabled={state === "loading" || state === "busy" || state === "active"}>
            <span>{state === "active" ? <FaBell /> : <FaBellSlash />}</span>
            {state === "active" ? "Avisos activados" : state === "denied" ? "Avisos bloqueados" : state === "error" ? "Reintentar avisos" : state === "busy" ? "Configurando..." : "Activar avisos"}
        </button>
        {error && <small className="tags_loyalty_push_error">{error}</small>}
    </span>;
}
