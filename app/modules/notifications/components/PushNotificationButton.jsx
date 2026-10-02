"use client";

import { useEffect, useState } from "react";
import { FaBell } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import "./PushNotificationButton.css";

function keyBytes(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}

export default function PushNotificationButton({ businessId }) {
  const [state, setState] = useState("checking");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
    navigator.serviceWorker.register("/dashboard-sw.js", { scope: "/dashboard/" }).then(() => navigator.serviceWorker.ready).then(registration => registration.pushManager.getSubscription()).then(subscription => setState(subscription ? "active" : "available")).catch(() => setState("available"));
  }, []);

  async function enable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState("denied");
      const configResponse = await fetch(`/api/notifications/push/subscriptions?businessId=${businessId}`, { cache: "no-store" });
      const config = await configResponse.json();
      if (!configResponse.ok || !config.publicKey) throw new Error("Faltan las claves Web Push de la plataforma.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(config.publicKey) });
      const response = await fetch("/api/notifications/push/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, subscription: subscription.toJSON() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo registrar este dispositivo.");
      setState("active");
      await showAlert({ title: "Notificaciones activadas", text: "Este dispositivo recibirá los avisos de las herramientas del negocio.", icon: "success" });
    } catch (error) { await showAlert({ title: "No se pudieron activar", text: error.message, icon: "error" }); }
  }

  const detail = state === "active" ? "Este dispositivo recibirá avisos de Turnos, Mi Estadía, Tienda, Resto y Reseñas." : state === "unsupported" ? "Este navegador no admite notificaciones Web Push." : state === "denied" ? "El permiso está bloqueado en la configuración del navegador." : "Activá los avisos en este celular o computadora.";
  return <section className="tags_push_notification_setting"><div><FaBell /><span><strong>Notificaciones en este dispositivo</strong><small>{detail}</small></span></div><button className={`tags_push_notification_button is_${state}`} type="button" disabled={["checking","active","unsupported","denied"].includes(state)} onClick={enable}>{state === "active" ? "Activadas" : state === "unsupported" ? "No compatible" : state === "denied" ? "Permiso bloqueado" : state === "checking" ? "Verificando..." : "Activar notificaciones"}</button></section>;
}
