// page.jsx (SIN "use client")
import BusinessesPageClient from "./pageClient";
import HeaderSwitcher from "../../components/HeaderSwitcher";



export default function Page() {
  return (
    <>
      <HeaderSwitcher />
      <BusinessesPageClient />
    </>
  );
}