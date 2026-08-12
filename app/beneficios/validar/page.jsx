import { Suspense } from "react";
import BenefitMerchantValidator from "@/app/modules/benefits/components/merchant/BenefitMerchantValidator";
export const metadata={title:"Validar cupón | Tags"};
export const dynamic="force-dynamic";
export default function BenefitValidatePage(){return <Suspense fallback={null}><BenefitMerchantValidator/></Suspense>}
