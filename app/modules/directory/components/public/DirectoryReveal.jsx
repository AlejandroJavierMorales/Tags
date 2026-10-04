"use client";

import { useEffect, useRef, useState } from "react";
import "./DirectoryReveal.css";

const MODES = new Set(["none", "slide-up", "fade", "slide-left", "zoom"]);

export default function DirectoryReveal({ mode = "slide-up", children }) {
  const elementRef = useRef(null);
  const [prepared, setPrepared] = useState(false);
  const [visible, setVisible] = useState(mode === "none");
  const resolvedMode = MODES.has(mode) ? mode : "slide-up";

  useEffect(() => {
    if (resolvedMode === "none" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    setPrepared(true);
    const element = elementRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [resolvedMode]);

  return <div ref={elementRef} className={`tags_directory_reveal is_${resolvedMode} ${prepared ? "is_prepared" : ""} ${visible ? "is_visible" : ""}`}>{children}</div>;
}
