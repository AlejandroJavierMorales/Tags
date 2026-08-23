"use client";

import Image from "next/image";
import { tagsSiteConfig } from "../config/configSite";

export default function WhatsAppFloat() {
  const phone = tagsSiteConfig?.contact?.phone?.replace(/\D/g, "") || "";
  const message = encodeURIComponent("*🏷️ Tags QR - Gestión de Códigos QR*\n\n💬 Quiero hacer una consulta: ");

  return <div className="tagsWhatsapp_float_wrapper">
    <div className="tagsWhatsapp_float_box">
      <div className="tagsWhatsapp_float_text">¿Necesitás ayuda?</div>
      <a href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noopener noreferrer" className="tagsWhatsapp_float_btn" aria-label="Contactar por WhatsApp">
        <Image src="/assets/images/icons/whatsapp_verde_bordeblanco.png" alt="WhatsApp" width={42} height={42} />
      </a>
    </div>
  </div>;
}
