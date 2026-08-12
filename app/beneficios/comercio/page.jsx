import { Suspense } from "react";
import BenefitMerchantValidator from "@/app/modules/benefits/components/merchant/BenefitMerchantValidator";
export const metadata={title:"Validador de beneficios | Tags"};
export const dynamic="force-dynamic";
export default function BenefitMerchantPage(){return <Suspense fallback={null}><BenefitMerchantValidator/></Suspense>}
