import { redirect } from "next/navigation";
import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import { requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import Ruta100TerritorialDiagnostic from "./Ruta100TerritorialDiagnostic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Diagnóstico territorial Ruta 100 | Tags",
  robots: { index: false, follow: false },
};

export default async function Ruta100TerritorialPage() {
  const access = await requireDirectoryAdmin();
  if (!access.ok) redirect("/login");

  return (
    <>
      <HeaderSwitcher />
      <Ruta100TerritorialDiagnostic />
    </>
  );
}
