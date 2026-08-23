import { getPagePublicEntitlement } from "@/app/modules/subscriptions/lib/publicEntitlement";
import PublicServicePaused from "@/app/modules/subscriptions/components/PublicServicePaused";

export const dynamic = "force-dynamic";

export default async function PublicProductLayout({ children, params }) {
  const values = await Promise.resolve(params);
  const entitlement = await getPagePublicEntitlement(values.slug);
  if (!entitlement.allowed) return <PublicServicePaused businessName={entitlement.businessName} />;
  return children;
}
