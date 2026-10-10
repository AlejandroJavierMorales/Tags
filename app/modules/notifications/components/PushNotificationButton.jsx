"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import "./PushNotificationButton.css";

function keyBytes(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}

async function dashboardRegistration() {
  return navigator.serviceWorker.register("/dashboard-sw.js", { scope: "/dashboard/", updateViaCache: "none" });
}

export default function PushNotificationButton({ businessId, platformAdmin = false }) {
  const [state, setState] = useState("checking");
  const registrationRef = useRef(null);
  const endpoint = platformAdmin ? "/api/notifications/push/platform-subscriptions" : "/api/notifications/push/subscriptions";

  const registerSubscription = useCallback(async (subscription, test = false) => {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, subscription: subscription.toJSON(), test }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo registrar este dispositivo.");
  }, [businessId, endpoint]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return undefined;
    }
    let active = true, settled = false;
    const timer = setTimeout(() => { if (active && !settled) setState(Notification.permission === "denied" ? "denied" : "available"); }, 10000);
    (async () => {
      try {
        const registration = await dashboardRegistration();
        registrationRef.current = registration;
        await registration.update().catch(() => {});
        const subscription = await registration.pushManager.getSubscription();
        if (!active) return;
        if (!subscription) { settled = true; setState(Notification.permission === "denied" ? "denied" : "available"); return; }
        await registerSubscription(subscription);
        settled = true; if (active) setState("active");
      } catch {
        settled = true; if (active) setState(Notification.permission === "denied" ? "denied" : "available");
      }
    })();
    return () => { active = false; clearTimeout(timer); };
  }, [registerSubscription]);

  async function enable() {
    try {
      setState("checking");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState("denied");
      const configResponse = await fetch(`${endpoint}${platformAdmin ? "" : `?businessId=${businessId}`}`, { cache: "no-store" });
      const config = await configResponse.json().catch(() => ({}));
      if (!configResponse.ok || !config.publicKey) throw new Error("Faltan las claves Web Push de la plataforma.");
      const registration = registrationRef.current || await dashboardRegistration();
      registrationRef.current = registration;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(config.publicKey) });
      await registerSubscription(subscription);
      setState("active");
      await showAlert({ title: "Notificaciones activadas", text: platformAdmin ? "Este dispositivo recibirá los avisos administrativos de toda la plataforma." : "Este dispositivo recibirá los avisos de las herramientas del negocio.", icon: "success" });
    } catch (error) {
      setState(Notification.permission === "denied" ? "denied" : "available");
      await showAlert({ title: "No se pudieron activar", text: error.message, icon: "error" });
    }
  }

  async function testNotification() {
    try {
      setState("checking");
      const registration = registrationRef.current || await dashboardRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) { setState("available"); throw new Error("La suscripción del navegador ya no existe. Volvé a activarla."); }
      await registerSubscription(subscription, true);
      setState("active");
      await showAlert({ title: "Prueba enviada", text: "El aviso fue aceptado por el servicio Web Push. Debería aparecer en este dispositivo.", icon: "success" });
    } catch (error) {
      setState("available");
      await showAlert({ title: "La prueba falló", text: error.message, icon: "error" });
    }
  }

  const detail = state === "active"
    ? platformAdmin ? "Este dispositivo está registrado para los avisos administrativos de la plataforma." : "Este dispositivo está registrado para los avisos de todos los aplicativos del negocio."
    : state === "unsupported" ? "Este navegador no admite notificaciones Web Push."
      : state === "denied" ? "El permiso está bloqueado en la configuración del navegador."
        : platformAdmin ? "Activá en este dispositivo los avisos administrativos de toda la plataforma." : "Activá los avisos en este celular o computadora.";
  return <section className="tags_push_notification_setting"><div><FaBell /><span><strong>Notificaciones en este dispositivo</strong><small>{detail}</small></span></div><button className={`tags_push_notification_button is_${state}`} type="button" disabled={["checking","unsupported","denied"].includes(state)} onClick={state==="active"?testNotification:enable}>{state === "active" ? "Enviar prueba" : state === "unsupported" ? "No compatible" : state === "denied" ? "Permiso bloqueado" : state === "checking" ? "Verificando..." : "Activar notificaciones"}</button></section>;
}
