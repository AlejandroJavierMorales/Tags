"use client";

import { useEffect, useRef, useState } from "react";
import { FaXmark } from "react-icons/fa6";
import "./GuestExperienceInstallPrompt.css";

function safeSlug(value) {
  return String(value || "guest").replace(/[^a-zA-Z0-9_-]/g, "-");
}

export default function GuestExperienceInstallPrompt({ slug, businessId, name, iconUrl }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(null);
  const [installing, setInstalling] = useState(false);
  const recordedRef = useRef(false);
  const installStartedAtRef = useRef(0);
  const appCode = `guest_experience:${businessId}`;
  const storageKey = `tags-guest-installation-id-${businessId}`;

  function installationId() {
    let value = window.localStorage.getItem(storageKey);
    if (!value) {
      value = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(storageKey, value);
    }
    return value;
  }

  function publicPath() {
    const marker = "/mi-estadia";
    const index = window.location.pathname.indexOf(marker);
    return index >= 0 ? window.location.pathname.slice(0, index) + marker : `/p/${safeSlug(slug)}/mi-estadia`;
  }

  function recordInstallation(outcome = "installed") {
    if (recordedRef.current) return;
    recordedRef.current = true;
    fetch("/api/public/pwa-installations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_code: appCode, installation_id: installationId(), outcome, platform: navigator.userAgentData?.platform || navigator.platform || "unknown" }),
      keepalive: true
    }).catch(() => {});
  }

  useEffect(() => {
    const displayMode = window.matchMedia?.("(display-mode: standalone)");
    const isStandalone = displayMode?.matches || window.navigator.standalone === true;
    setInstalled(Boolean(isStandalone));
    const onBeforeInstallPrompt = event => { event.preventDefault(); setDeferredPrompt(event); };
    const onInstalled = () => {
      const elapsed = Date.now() - installStartedAtRef.current;
      const remaining = Math.max(0, 2500 - elapsed);
      recordInstallation();
      window.setTimeout(() => {
        setInstalled(true);
        setDeferredPrompt(null);
        setInstalling(false);
      }, remaining);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`/api/guest-experience/public/pwa/sw?slug=${encodeURIComponent(slug)}`, { scope: publicPath() }).catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [slug, businessId]);

  async function install() {
    if (!deferredPrompt) return;
    installStartedAtRef.current = Date.now();
    setInstalling(true);
    const promptEvent = deferredPrompt;
    await new Promise(resolve => window.requestAnimationFrame(() => window.setTimeout(resolve, 60)));
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") recordInstallation("installed");
    else { setInstalling(false); recordInstallation("cancelled"); }
    setDeferredPrompt(null);
  }

  if (installed === null || dismissed || installed || (!deferredPrompt && !installing)) return null;
  return <>
    <aside className="tags_guest_install_prompt" aria-label="Instalar Mi Estadía">
      <div className="tags_guest_install_prompt_inner">
        <div className="tags_guest_install_prompt_copy">
          <img
            src={iconUrl}
            alt={`Icono de ${name || "Mi Estadía"}`}
          />
          <strong>Llevá Mi Estadía en tu teléfono</strong>
        </div>
        <div className="tags_guest_install_prompt_actions">
          <button type="button" onClick={install} className="tags_guest_install_button" disabled={installing}>
            {installing ? <><span className="tags_guest_install_spinner" aria-hidden="true" /> Instalando…</> : "Instalar"}
          </button>
          <button type="button" onClick={() => setDismissed(true)} className="tags_guest_install_close" aria-label="Cerrar aviso"><FaXmark /></button>
        </div>
      </div>
    </aside>
    {installing && <div className="tags_guest_install_progress" role="status" aria-live="polite">
      <div>
        <span className="tags_guest_install_progress_spinner" aria-hidden="true" />
        <strong>Instalando Mi Estadía…</strong>
        <small>Esto puede demorar unos segundos.</small>
      </div>
    </div>}
  </>;
}
