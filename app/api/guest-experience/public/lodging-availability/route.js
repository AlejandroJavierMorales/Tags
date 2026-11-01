export const runtime="nodejs";
export const dynamic="force-dynamic";

import { db } from "@/app/lib/tags-db";
import { guestError,parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { countLodgingNights,normalizeGuestCounts,normalizeLodgingPolicy,parseLodgingDateInput,validateStayLength } from "@/app/modules/guest-experience/lib/lodgingReservationRules";
import { evaluateLodgingAvailability } from "@/app/modules/guest-experience/server/lodgingAvailabilityEvaluator";
import { evaluateLodgingGroupAvailability } from "@/app/modules/guest-experience/server/lodgingGroupAvailabilityEvaluator";

export async function GET(req){
 try{
  const params=new URL(req.url).searchParams,slug=String(params.get("slug")||"").trim(),couponCode=String(params.get("couponCode")||"").trim(),startsOn=params.get("startsOn"),endsOn=params.get("endsOn"),startsAt=parseLodgingDateInput(startsOn),endsAt=parseLodgingDateInput(endsOn),guests=normalizeGuestCounts({adults:params.get("adults"),children:params.get("children")}),requestedUnitOccupancies=String(params.get("requestedUnitOccupancies")||"").split(",").filter(Boolean).map(Number).filter(value=>Number.isInteger(value)&&value>0);
  if(!slug)return guestError("Alojamiento inválido",400,"INVALID_LODGING");
  if(!startsAt||!endsAt||endsAt<=startsAt)return guestError("Definí fechas válidas de ingreso y egreso",400,"INVALID_DATES");
  const [apps]=await db.query("SELECT id,business_id,name,slug,currency,timezone,settings_json FROM tags_guest_apps WHERE BINARY slug=BINARY ? AND status='published' LIMIT 1",[slug]);
  const app=apps[0];if(!app)return guestError("El motor de reservas no está disponible",404,"LODGING_NOT_AVAILABLE");
  const settings=parseGuestJson(app.settings_json),policy=normalizeLodgingPolicy(settings.lodgingPolicy),length=validateStayLength({startsAt,endsAt,policy});
  if(!length.ok)return guestError(length.error,409,length.code);
  const today=new Date();today.setHours(12,0,0,0);const advance=countLodgingNights(today,startsAt);
  if(advance<policy.minimumAdvanceDays)return guestError(`La reserva requiere al menos ${policy.minimumAdvanceDays} día${policy.minimumAdvanceDays===1?"":"s"} de anticipación`,409,"minimum_advance");
  if(advance>policy.maximumAdvanceDays)return guestError(`Sólo se reciben reservas con hasta ${policy.maximumAdvanceDays} días de anticipación`,409,"maximum_advance");
  const availability=await evaluateLodgingAvailability(db,{app,settings,startsAt,endsAt,couponCode,...guests});
  const hasIndividual=availability.units.some(item=>!["unavailable","alternative_suggested"].includes(item.decision));
  const requestedGuests=guests.adults+guests.children;
  const maxSingleCapacity=availability.units.reduce((maximum,item)=>Math.max(maximum,Number(item.capacity?.total||0)),0);
  const groupMode=settings.groupSuggestionMode==="when_no_single_available"?"when_no_single_available":"exceeds_single_capacity";
  const explicitGroup=requestedUnitOccupancies.length>1&&requestedUnitOccupancies.reduce((sum,value)=>sum+value,0)===requestedGuests;
  const groupAllowed=settings.groupBookingEnabled!==false&&(explicitGroup||requestedGuests>maxSingleCapacity||(groupMode==="when_no_single_available"&&!hasIndividual));
  const groupProposals=groupAllowed?await evaluateLodgingGroupAvailability(db,{app,settings,startsAt,endsAt,couponCode,...guests,requestedUnitOccupancies:explicitGroup?requestedUnitOccupancies:[],maximumOptions:settings.groupMaximumOptions||3}):[];
  const couponApplied=Boolean(couponCode)&&(availability.units.some(item=>item.pricing?.promotion?.applicationMode==="coupon")||groupProposals.some(proposal=>proposal.units?.some(item=>item.pricing?.promotion?.applicationMode==="coupon")));
  return Response.json({ok:true,query:{startsOn,endsOn,nights:length.nights,...guests},automationMode:policy.automationMode,...availability,groupProposals,coupon:{requested:Boolean(couponCode),applied:couponApplied}});
 }catch(error){console.error("GUEST PUBLIC LODGING AVAILABILITY ERROR",error);return guestError("No se pudo consultar la disponibilidad",500)}
}
