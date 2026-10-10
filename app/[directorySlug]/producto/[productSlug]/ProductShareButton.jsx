"use client";

import { FaShareNodes } from "react-icons/fa6";

export default function ProductShareButton({ title, description }) {
  async function share() {
    const data = { title, text: description || title, url: window.location.href };
    if (navigator.share) {
      await navigator.share(data).catch(() => null);
      return;
    }
    await navigator.clipboard?.writeText(window.location.href).catch(() => null);
  }

  return <button type="button" className="tags_directory_product_share" onClick={share}>
    <FaShareNodes /> Compartir
  </button>;
}
