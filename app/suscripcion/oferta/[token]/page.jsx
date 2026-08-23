import SubscriptionOfferClient from "./pageClient";
export const runtime="nodejs";export const dynamic="force-dynamic";export const metadata={title:"Propuesta comercial | Tags",robots:{index:false,follow:false}};
export default async function SubscriptionOfferPage({params}){const{token}=await params;return <SubscriptionOfferClient token={token}/>}

