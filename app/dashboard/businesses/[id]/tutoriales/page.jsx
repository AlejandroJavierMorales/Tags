import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import BusinessTutorialLibrary from "@/app/modules/directory/components/client/BusinessTutorialLibrary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tutoriales | Tags", robots: { index: false, follow: false } };

export default async function BusinessTutorialsPage({ params }) {
  const { id } = await params;
  const businessId = Number(id);
  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
  if (!access.ok) return <main className="tags_business_tutorials"><h1>Sin acceso</h1><p>{access.error}</p></main>;
  return <BusinessTutorialLibrary businessId={businessId} businessName={access.business.name} />;
}
