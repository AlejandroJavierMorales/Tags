import LegalPage from "@/app/components/legal/LegalPage";
import { legalMetadata } from "@/app/components/legal/legalSiteContext";

export const dynamic = "force-dynamic";
export function generateMetadata() { return legalMetadata("Gestión y eliminación de datos", "Cómo desconectar integraciones y solicitar acceso, corrección o eliminación de información personal.", "/gestion-de-datos"); }
export default function DataManagementPage() { return <LegalPage document="data" />; }
