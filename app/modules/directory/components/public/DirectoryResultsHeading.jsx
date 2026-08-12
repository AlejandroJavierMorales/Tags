"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaXmark } from "react-icons/fa6";
import "./DirectoryResultsHeading.css";

export default function DirectoryResultsHeading({ title, total, navigationKey }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setTimeout(() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    return () => window.clearTimeout(timer);
  }, [navigationKey]);

  function close() {
    router.push("/directorio", { scroll: false });
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 40);
  }

  return <div className="tags_directory_results_title"><div><span>RESULTADOS DE BÚSQUEDA</span><h2 id="directory-results-title">{title}</h2><p>{total} resultados encontrados</p></div><button type="button" onClick={close} aria-label="Cerrar resultados"><FaXmark /></button></div>;
}
