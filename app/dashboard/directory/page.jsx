import { redirect } from "next/navigation";
import HeaderSwitcher from "@/app/components/HeaderSwitcher";
import { requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import DirectoryAdminClient from "./pageClient";

export const runtime="nodejs";export const dynamic="force-dynamic";
export const metadata={title:"Administración de Directorios | Tags",robots:{index:false,follow:false}};
export default async function DirectoryAdminPage(){const access=await requireDirectoryAdmin();if(!access.ok)redirect("/login");return <><HeaderSwitcher/><DirectoryAdminClient/></>}
