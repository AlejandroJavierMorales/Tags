"use client";

import { useEffect, useState } from "react";
import "./RutiCharacter.css";

export default function RutiCharacter({ images, open, onClick, onDismiss, title = "¡Hola! Soy Ruti!", buttonLabel = "Charlá con Ruti" }) {
  const [pose, setPose] = useState("idle");

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    let returnTimer;
    const greet = () => {
      if (document.hidden) return;
      setPose("wave");
      window.clearTimeout(returnTimer);
      returnTimer = window.setTimeout(() => setPose("idle"), 2200);
    };
    greet();
    const repeatTimer = window.setInterval(greet, 15000);
    return () => {
      window.clearInterval(repeatTimer);
      window.clearTimeout(returnTimer);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setPose("wave");
    const timer = window.setTimeout(() => setPose("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [open]);

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
    return () => {
      window.clearInterval(blink);
      window.clearInterval(tail);
    };
  }, []);

  return <div className="tags_destination_character_shell tags_ruti_character_shell">
    {!open && onDismiss && <button type="button" className="tags_destination_character_dismiss" onClick={onDismiss} aria-label="Ocultar a Ruti">×</button>}
    {!open && title && <strong className="tags_destination_character_title">{title}</strong>}
    <button type="button" className="tags_destination_character tags_ruti_character" onClick={onClick} aria-label={open ? "Cerrar conversación con Ruti" : "Conversar con Ruti"}>
      {Object.entries(images || {}).map(([name, src]) => <img key={name} src={src} alt="" aria-hidden="true" data-visible={pose === name ? "true" : "false"} />)}
    </button>
    {!open && <button type="button" className="tags_destination_character_cta" onClick={onClick}>{buttonLabel}</button>}
  </div>;
}
