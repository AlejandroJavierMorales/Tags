import Link from "next/link";
import QrAgencyLoginForm from "./QrAgencyLoginForm";
import "./QrAgencyLoginPending.css";

export default async function QrAgencyLoginPending({ params, searchParams }) {
    const { agencySlug } = await params;
    const query = await searchParams;
    const invalid = query?.error === "invalid_link" || query?.error === "session_expired";
    return <main className="tags_qr_agency_login_pending"><section><span>QR AGENCY</span><h1>{invalid ? "El enlace venció o ya fue utilizado" : "Acceso privado"}</h1><p>{invalid ? "Podés solicitar un nuevo enlace desde acá." : "Ingresá desde el enlace privado enviado por tu agencia o solicitá uno nuevo."}</p><QrAgencyLoginForm agencySlug={agencySlug} /><Link href={`/agency/${agencySlug}/login`}>Volver</Link></section></main>;
}
