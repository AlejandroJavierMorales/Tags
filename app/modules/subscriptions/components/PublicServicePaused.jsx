import { FaClockRotateLeft } from "react-icons/fa6";
import "./PublicServicePaused.css";

export default function PublicServicePaused({ businessName = "Este servicio" }) {
  return <main className="tags_public_service_paused">
    <section>
      <span><FaClockRotateLeft /></span>
      <small>SERVICIO MOMENTÁNEAMENTE PAUSADO</small>
      <h1>{businessName}</h1>
      <p>Esta publicación no se encuentra disponible temporalmente.</p>
      <p className="tags_public_service_paused_hint">Si sos responsable del negocio, ingresá a tu panel o contactá a la plataforma para regularizar el servicio.</p>
    </section>
  </main>;
}
