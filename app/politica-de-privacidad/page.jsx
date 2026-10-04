import LegalPage from "@/app/components/legal/LegalPage";
import { legalMetadata } from "@/app/components/legal/legalSiteContext";

export const dynamic = "force-dynamic";
export function generateMetadata() { return legalMetadata("Política de Privacidad", "Cómo tratamos, protegemos y gestionamos la información personal y los datos obtenidos mediante integraciones.", "/politica-de-privacidad"); }
export default function PrivacyPage() { return <LegalPage document="privacy" />; }
