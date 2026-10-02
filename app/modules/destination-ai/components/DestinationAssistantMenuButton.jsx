"use client";

import { FaComments } from "react-icons/fa6";

export default function DestinationAssistantMenuButton({ mobile = false, label = "Charlá con Muchi", href = "" }) {
  function openAssistant(event) {
    event.currentTarget.closest("details")?.removeAttribute("open");
    if (!document.querySelector(".tags_destination_widget")) {
      window.location.assign("/directorio?muchi=1");
      return;
    }
    window.dispatchEvent(new CustomEvent("tags:destination-assistant:open"));
  }

  if (href) return <a className={mobile ? "tags_destination_menu_button is_mobile" : "tags_destination_menu_button"} href={href}><FaComments /> {label}</a>;

  return <button type="button" className={mobile ? "tags_destination_menu_button is_mobile" : "tags_destination_menu_button"} onClick={openAssistant}>
    <FaComments /> {label}
  </button>;
}
