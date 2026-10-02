"use client";

import { useEffect, useState } from "react";

const IMAGES = {
  tourist: "/assets/destination-ai/muchi/tourist-wave.webp",
  resident: "/assets/destination-ai/muchi/resident-wave.webp",
};

export default function MuchiGreeting() {
  const [mode, setMode] = useState("tourist");

  useEffect(() => {
    const update = event => {
      if (["tourist", "resident"].includes(event?.detail?.mode)) setMode(event.detail.mode);
    };
    window.addEventListener("tags:destination-assistant:mode", update);
    window.addEventListener("tags:destination-assistant:open", update);
    return () => {
      window.removeEventListener("tags:destination-assistant:mode", update);
      window.removeEventListener("tags:destination-assistant:open", update);
    };
  }, []);

  return <div className="tags_muchi_greeting" data-mode={mode}>
    <span className="tags_muchi_greeting_face" aria-hidden="true"><img src={IMAGES[mode]} alt="" /></span>
    <h1><small>¡Hola!</small>Soy Muchi.</h1>
  </div>;
}
