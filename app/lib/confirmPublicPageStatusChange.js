import showAlert from "@/app/components/showAlert";

export default function confirmPublicPageStatusChange(nextStatus, pageLabel = "página") {
  const publishing = nextStatus === "published" || nextStatus === true;
  return showAlert({
    title: publishing ? `¿Publicar ${pageLabel}?` : `¿Despublicar ${pageLabel}?`,
    text: publishing
      ? "La página quedará visible en Internet y podrá ser indexada por buscadores como Google."
      : "La página dejará de mostrarse en Internet, quedará totalmente desactivada e invisible para el público y los buscadores ya no podrán acceder a ella. Si ya aparecía en Google, su eliminación de los resultados puede demorar.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: publishing ? "Publicar" : "Despublicar",
    cancelButtonText: "Cancelar"
  });
}
