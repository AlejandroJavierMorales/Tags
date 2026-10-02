"use client";

import { useEffect, useRef, useState } from "react";
import { FaMobileScreenButton, FaXmark } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import "./DirectoryInstallPrompt.css";

export default function DirectoryInstallPrompt({
  appCode = "calamuchitar",
  title = "Llevá CalamuchitAr en Tu Teléfono",
  ariaLabel = "Instalar CalamuchitAr",
  iconUrl = "",
  serviceWorkerUrl = "/calamuchitar-sw.js",
  pageSelector = ".tags_directory_page",
} = {}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const recordedRef = useRef(false);

  function installationId() {
    const key = `${String(appCode).replace(/[^a-z0-9_-]/gi, "-")}-installation-id`;
    let value = window.localStorage.getItem(key);
    if (!value) {
      value = window.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(key, value);
    }
    return value;
  }

  async function permittedLocation() {
    if (!navigator.geolocation) return null;
    try {
      if (!navigator.permissions?.query) return null;
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state !== "granted") return null;
      return await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          position => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
        );
      });
    } catch {
      return null;
    }
  }

  async function recordInstallation(outcome = "installed") {
    if (recordedRef.current) return;
    recordedRef.current = true;
    const location = await permittedLocation();
    fetch("/api/public/pwa-installations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_code: appCode,
        installation_id: installationId(),
        outcome,
        platform: navigator.userAgentData?.platform || navigator.platform || "unknown",
        location
      }),
      keepalive: true
    }).catch(() => {});
  }

  useEffect(() => {
    setInstalled(Boolean(
      window.matchMedia?.("(display-mode: standalone)")?.matches
      || window.navigator.standalone === true
    ));

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setInstalling(false);
      recordInstallation();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(serviceWorkerUrl, { scope: "/" }).catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [serviceWorkerUrl]);

  useEffect(() => {
    const page = document.querySelector(pageSelector);
    if (!page) return undefined;

    const visible = !dismissed && !installed;
    page.classList.toggle("has-install-prompt", visible);

    return () => page.classList.remove("has-install-prompt");
  }, [dismissed, installed, pageSelector]);

  function closePrompt() {
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) {
      await showAlert({
        title,
        text: "Tocá los tres puntos del navegador y seleccioná ‘Agregar a la pantalla principal’ o ‘Instalar aplicación’. Después confirmá la instalación.",
        icon: "info",
        confirmButtonText: "Entendido"
      });
      return;
    }
    setInstalling(true);
    const promptEvent = deferredPrompt;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") recordInstallation("installed");
    else {
      setInstalling(false);
      recordInstallation("cancelled");
    }
    setDeferredPrompt(null);
  }

  if (dismissed || installed) return null;

  return (
    <aside className="tags_directory_install_prompt" aria-label={ariaLabel}>
      <div className="tags_directory_install_prompt_inner">
        <div className="tags_directory_install_prompt_copy">
          {iconUrl ? <img src={iconUrl} alt="" aria-hidden="true" /> : <FaMobileScreenButton aria-hidden="true" />}
          <strong>{title}</strong>
        </div>
        <div className="tags_directory_install_prompt_actions">
          <button type="button" onClick={install} className="tags_directory_install_button" disabled={installing}>
            {installing ? <><span className="tags_directory_install_spinner" aria-hidden="true" /> Instalando…</> : "Instalar"}
          </button>
          <button type="button" onClick={closePrompt} className="tags_directory_install_close" aria-label="Cerrar aviso"><FaXmark /></button>
        </div>
      </div>
    </aside>
  );
}
