"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./qr-location.css";

async function readJson(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

export default function QrLocationPage() {
  const [message, setMessage] = useState("Podés permitir la ubicación para identificar el lugar del escaneo.");
  const [clickId, setClickId] = useState("");
  const [context, setContext] = useState(null);
  const [suffix, setSuffix] = useState("");
  const [busy, setBusy] = useState(false);
  const automaticLocationAttempted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("clickId") || "";
    setClickId(id);
    if (!id) { window.location.replace("/"); return; }
    fetch(`/api/qr/location?clickId=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(readJson)
      .then(result => {
        setContext(result);
        if (result.sharedPointQr) setMessage("Identificá rápidamente desde qué cartel llegaste.");
      })
      .catch(() => setContext({ sharedPointQr: params.get("point") === "shared" }));
  }, []);

  const post = useCallback(async body => {
    const response = await fetch("/api/qr/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clickId, ...body }),
    });
    const result = await readJson(response);
    if (!response.ok) throw new Error(result.error || "No se pudo registrar el escaneo");
    return result;
  }, [clickId]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage("Este navegador no permite obtener ubicación. Podés ingresar los tres números del cartel.");
      return;
    }
    setBusy(true);
    setMessage("Detectando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const result = await post({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          if (context?.sharedPointQr && !result.pointAttribution?.matched) {
            setBusy(false);
            setMessage("La ubicación no fue suficientemente precisa. Ingresá los tres números impresos debajo del QR.");
            return;
          }
          window.location.replace(result.destinationUrl || "/");
        } catch (error) {
          setBusy(false);
          setMessage(error.message || "No pudimos registrar la ubicación. Podés ingresar los números del cartel.");
        }
      },
      () => {
        setBusy(false);
        setMessage(context?.sharedPointQr
          ? "No se obtuvo la ubicación. Podés ingresar los tres números impresos debajo del QR."
          : "No se obtuvo ubicación. Podés continuar sin compartirla.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [context?.sharedPointQr, post]);

  useEffect(() => {
    if (!clickId || !context?.sharedPointQr || automaticLocationAttempted.current || !navigator.permissions) return;
    automaticLocationAttempted.current = true;
    navigator.permissions.query({ name: "geolocation" }).then(permission => {
      if (permission.state === "granted") requestLocation();
    }).catch(() => {});
  }, [clickId, context?.sharedPointQr, requestLocation]);

  const submitSuffix = async event => {
    event.preventDefault();
    if (!/^\d{3}$/.test(suffix)) {
      setMessage("Ingresá los tres números tal como aparecen debajo del QR. Por ejemplo: 001.");
      return;
    }
    setBusy(true);
    setMessage("Identificando el cartel…");
    try {
      const result = await post({ printedSuffix: suffix });
      if (!result.pointAttribution?.matched) {
        setBusy(false);
        setMessage("Esos números no corresponden a este QR. Revisalos e intentá nuevamente.");
        return;
      }
      window.location.replace(result.destinationUrl || "/");
    } catch (error) {
      setBusy(false);
      setMessage(error.message || "No pudimos identificar el cartel.");
    }
  };

  const continueWithoutLocation = async () => {
    setBusy(true);
    setMessage("Continuando…");
    try {
      const result = await post({ declined: Boolean(context?.sharedPointQr) });
      window.location.replace(result.destinationUrl || "/");
    } catch { window.location.replace("/"); }
  };

  const shared = Boolean(context?.sharedPointQr);
  return <main className="tags_qr_location_page">
    <section className="tags_qr_location_card" style={{ "--qr-accent": context?.colorHex || "#2f7958" }}>
      <img className="tags_qr_location_logo" src={context?.markerIconUrl || "/logo.webp"} alt="" />
      <span>{shared ? context?.typeName || "Punto QR" : "Escaneo QR"}</span>
      <h1>{shared ? "¿Desde qué punto escaneaste?" : "Un momento"}</h1>
      <p>{message}</p>
      {clickId && shared && <>
        <button className="tags_qr_location_primary" type="button" disabled={busy} onClick={requestLocation}>Usar mi ubicación</button>
        <div className="tags_qr_location_divider"><span>o</span></div>
        <form onSubmit={submitSuffix}>
          <label htmlFor="point-suffix">Ingresá los 3 números debajo del QR</label>
          <div><input id="point-suffix" value={suffix} disabled={busy} onChange={event => setSuffix(event.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" autoComplete="off" placeholder="001" maxLength="3" /><button type="submit" disabled={busy}>Continuar</button></div>
        </form>
      </>}
      {clickId && !shared && <button className="tags_qr_location_primary" type="button" disabled={busy} onClick={requestLocation}>Permitir ubicación</button>}
      {clickId && <button className="tags_qr_location_skip" type="button" disabled={busy} onClick={continueWithoutLocation}>{shared?"Continuar sin identificar el punto":"Continuar sin ubicación"}</button>}
      {shared && <small>La ubicación se usa solamente para identificar el cartel cercano. También podés continuar sin compartirla.</small>}
    </section>
  </main>;
}
