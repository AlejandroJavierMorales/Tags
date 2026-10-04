import LegalPage from "@/app/components/legal/LegalPage";
import { legalMetadata } from "@/app/components/legal/legalSiteContext";

export const dynamic = "force-dynamic";
export function generateMetadata() { return legalMetadata("Términos y Condiciones", "Condiciones aplicables al acceso y uso de la plataforma, sus directorios, herramientas e integraciones.", "/terminos-y-condiciones"); }
export default function TermsPage() { return <LegalPage document="terms" />; }
