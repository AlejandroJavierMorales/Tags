"use client";

import { useEffect, useState } from "react";

export default function MuchiCharacter({ images, mode = "tourist", open, onClick, onDismiss, title = "¡Hola! Soy Muchi!", buttonLabel = "Charlá con Muchi" }) {
  const [pose, setPose] = useState("idle");
  const selected = images?.[mode] || images?.tourist;

  useEffect(() => {
    if (!open) return undefined;
    setPose("wave");
    const timer = window.setTimeout(() => setPose("idle"), 1500);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const blink = window.setInterval(() => {
      if (document.hidden) return;
      setPose("blink");
      window.setTimeout(() => setPose("idle"), 190);
    }, 5800);
    const tail = window.setInterval(() => {
      if (document.hidden) return;
      setPose("tail");
      window.setTimeout(() => setPose("idle"), 650);
    }, 9700);
    return () => { window.clearInterval(blink); window.clearInterval(tail); };
  }, []);

  return <div className="tags_destination_character_shell">
    {!open && onDismiss && <button type="button" className="tags_destination_character_dismiss" onClick={onDismiss} aria-label="Ocultar a Muchi">×</button>}
    {!open && title && <strong className="tags_destination_character_title">{title}</strong>}
    <button type="button" className="tags_destination_character" onClick={onClick} aria-label={open ? "Cerrar conversación con Muchi" : "Conversar con Muchi"}>
      {Object.entries(selected || {}).map(([name, src]) => <img key={name} src={src} alt="" aria-hidden="true" data-visible={pose === name ? "true" : "false"} />)}
    </button>
    {!open && <button type="button" className="tags_destination_character_cta" onClick={onClick}>{buttonLabel}</button>}
  </div>;
}
