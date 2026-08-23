export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";
import { getGuestPublicSession } from "@/app/modules/guest-experience/lib/getGuestPublicSession";
import { guestError, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";
export async function GET(req) {
    const slug=new URL(req.url).searchParams.get("slug"),session=await getGuestPublicSession(slug);
    if(!session)return guestError("La sesión venció o no es válida",401);
    const checkedIn = String(session.stay_status || "").toLowerCase() === "active";
    const[rows]=checkedIn
        ? await db.query("SELECT id,sector,network_name,password,instructions FROM tags_guest_wifi_networks WHERE guest_app_id=? AND is_active=1 ORDER BY sort_order,id",[session.id])
        : [[]];
    const settings=parseGuestJson(session.settings_json);
    return Response.json({ok:true,wifiAvailable:checkedIn,wifiMessage:checkedIn?"":"Las claves de WiFi estarán disponibles una vez confirmado el check-in.",wifiNetworks:rows.map(item=>({id:item.id,sector:item.sector,networkName:item.network_name,password:item.password,instructions:item.instructions})),information:{checkinTime:settings.checkinTime||"",checkoutTime:settings.checkoutTime||"",receptionPhone:settings.receptionPhone||"",receptionEmail:settings.receptionEmail||"",arrivalInstructions:settings.arrivalInstructions||"",departureInstructions:settings.departureInstructions||"",houseRules:settings.houseRules||""}});
}
