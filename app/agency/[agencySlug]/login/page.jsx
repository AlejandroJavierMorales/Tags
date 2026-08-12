import Link from "next/link";
import "./QrAgencyLoginPending.css";

export default async function QrAgencyLoginPending({ params, searchParams }) {
    const { agencySlug } = await params;
    const query = await searchParams;
    const invalid = query?.error === "invalid_link";
    return <main className="tags_qr_agency_login_pending"><section><span>QR AGENCY</span><h1>{invalid ? "El enlace venció o ya fue utilizado" : "Acceso privado"}</h1><p>{invalid ? "Solicitá a tu agencia que vuelva a enviarte el acceso." : "Ingresá desde el enlace privado enviado por tu agencia."}</p><Link href={`/agency/${agencySlug}/login`}>Volver</Link></section></main>;
}
