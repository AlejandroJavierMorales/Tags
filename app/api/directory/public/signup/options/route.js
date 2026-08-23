import { db } from "@/app/lib/tags-db";
import { getDirectorySiteCodeByHost, getDirectorySiteByCode } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getRequestHost } from "@/app/lib/channelContext";
import { currentDirectoryMonth, directoryCalendarAmount, directoryCalendarLabel } from "@/app/modules/directory/lib/directoryCalendarPricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const siteCode = await getDirectorySiteCodeByHost(getRequestHost(req));
  const [plans] = await db.query("SELECT id,code,name,description,price,currency,is_free,is_public FROM tags_plans WHERE is_active=1 AND is_public=1 ORDER BY sort_order,price");
  const [places] = await db.query("SELECT id,parent_id,place_type,name FROM tags_geo_places WHERE is_active=1 ORDER BY name");
  // Se devuelve el árbol completo para poder mostrar el camino del rubro.
  // El formulario filtra las hojas y nunca permite seleccionar un padre.
  const [taxonomy] = await db.query(`SELECT id,parent_id,name,depth FROM tags_directory_taxonomy_nodes WHERE is_active=1 ORDER BY depth,name`);
  const site = await getDirectorySiteByCode(siteCode);
  let brandConfig = {};
  try { brandConfig = typeof site?.brand_config === "string" ? JSON.parse(site.brand_config || "{}") : (site?.brand_config || {}); } catch { brandConfig = {}; }
  const [prices] = site
    ? await db.query("SELECT * FROM tags_directory_plan_prices WHERE site_id=? AND is_active=1", [site.id])
    : [[]];
  const startMonth = currentDirectoryMonth();
  const monthField = `manual_month_${String(startMonth).padStart(2, "0")}`;
  const publicPlans = plans.map(plan => {
    const price = prices.find(item => String(item.plan_id) === String(plan.id));
    if (!price) return plan;
    return {
      ...plan,
      price: price[monthField],
      currency: price.currency,
      paymentOptions: [
        ...Array.from({ length: 11 }, (_, index) => {
          const months = index + 1;
          const calculated = directoryCalendarAmount(price, startMonth, months);
          return { code: `manual_calendar_${months}`, method: "manual", months, startMonth, label: `${months} ${months === 1 ? "mes" : "meses"} · ${directoryCalendarLabel(calculated.months)}`, amount: calculated.hasMissingPrice ? 0 : calculated.amount, calendarMonths: calculated.months };
        }),
        { code: "manual_12", method: "manual", months: 12, startMonth, label: "Promo anual · 12 meses", amount: price.manual_pack_12 },
        { code: "mercadopago_monthly", method: "mercadopago", months: 1, label: "Suscripción automática mensual", amount: price.mercadopago_monthly }
      ].filter(option => Number(option.amount) > 0)
    };
  });
  return Response.json({
    ok: true,
    site,
    siteCode,
    plans: publicPlans,
    places,
    taxonomy,
    prices,
    manualPayment: {
      holder: process.env.DIRECTORY_MANUAL_PAYMENT_HOLDER || "",
      alias: process.env.DIRECTORY_MANUAL_PAYMENT_ALIAS || "",
      cbu: process.env.DIRECTORY_MANUAL_PAYMENT_CBU || "",
      account: process.env.DIRECTORY_MANUAL_PAYMENT_ACCOUNT || ""
    },
    contact: {
      whatsapp: brandConfig.whatsapp || brandConfig.contactWhatsapp || "",
      phone: brandConfig.phone || ""
    }
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
