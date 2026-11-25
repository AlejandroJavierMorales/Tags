import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import "./Ruta100Territorial.css";

export default function Ruta100TerritorialShell({ site, active, children }) {
  return (
    <main className="ruta100_public_page" data-directory-site="ruta100cordoba">
      <DirectoryPublicHeader site={site} compact={false} showSearch={false} territorialNavigation />
      {children}
      <DirectoryPublicFooter site={site} />
    </main>
  );
}
