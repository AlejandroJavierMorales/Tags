"use client";

import { useEffect, useState } from "react";

export default function QrLocationPage() {
  const [message, setMessage] = useState("Podés permitir la ubicación para identificar la ciudad del escaneo.");
  const [clickId, setClickId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("clickId") || "";
    setClickId(id);

    if (!id) {
      window.location.replace("/");
      return;
    }

  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Este navegador no permite obtener ubicación.");
      return;
    }
    setBusy(true);
    setMessage("Esperando permiso de ubicación…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetch("/api/qr/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clickId, latitude: position.coords.latitude, longitude: position.coords.longitude })
        }).then((response) => response.json()).then((result) => window.location.replace(result.destinationUrl || "/")).catch(() => window.location.replace("/"));
      },
      () => {
        setBusy(false);
        setMessage("No se obtuvo ubicación. Podés continuar sin compartirla.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const continueWithoutLocation = async () => {
    setBusy(true);
    setMessage("Continuando al destino…");
    try {
      const response = await fetch("/api/qr/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clickId })
      });
      const result = await response.json().catch(() => ({}));
      window.location.replace(result.destinationUrl || "/");
    } catch {
      window.location.replace("/");
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif", color: "#173a2d" }}>
      <section style={{ maxWidth: 420, textAlign: "center" }}>
        <img src="/logo.webp" alt="Tags" style={{ width: 110, maxWidth: "50vw", marginBottom: 24 }} />
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Un momento</h1>
        <p style={{ color: "#52645c", lineHeight: 1.5 }}>{message}</p>
        {clickId && <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
          <button type="button" disabled={busy} onClick={requestLocation} style={{ border: 0, borderRadius: 8, padding: "11px 18px", cursor: busy ? "wait" : "pointer", background: "#173a2d", color: "#fff" }}>Permitir ubicación</button>
          <button type="button" disabled={busy} onClick={continueWithoutLocation} style={{ border: "1px solid #cad5cf", borderRadius: 8, padding: "11px 18px", cursor: busy ? "wait" : "pointer", background: "#fff", color: "#173a2d" }}>Continuar sin ubicación</button>
        </div>}
      </section>
    </main>
  );
}
