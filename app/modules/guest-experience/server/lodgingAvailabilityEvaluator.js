import { GAP_PROTECTION_MODE, INVENTORY_RELEASED_STATUSES, countLodgingNights, normalizeLodgingPolicy, validateUnitCapacity } from "../lib/lodgingReservationRules.js";
import { evaluateUnitRateRestrictions, loadLodgingRateContext } from "./lodgingRateService.js";
import { parseGuestJson } from "../lib/guestExperienceService.js";
import { applyLodgingPromotion, loadLodgingPromotionContext } from "./lodgingPromotionService.js";

const dateValue=value=>value instanceof Date?new Date(value.getFullYear(),value.getMonth(),value.getDate(),12):new Date(`${String(value).slice(0,10)}T12:00:00`);
const dateKey=value=>{const date=value instanceof Date?value:dateValue(value);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`};
const daysBetween=(from,to)=>countLodgingNights(dateValue(from),dateValue(to));
const releasedPlaceholders=INVENTORY_RELEASED_STATUSES.map(()=>"?").join(",");

export async function evaluateLodgingAvailability(connection,{app,settings,startsAt,endsAt,adults,children,excludeRequestId=0,couponCode=""}){
 const policy=normalizeLodgingPolicy(settings?.lodgingPolicy),guestAppId=Number(app.id),windowDays=Math.max(policy.minimumGapBefore,policy.minimumGapAfter,1);
 const windowStart=new Date(startsAt);windowStart.setDate(windowStart.getDate()-windowDays);
 const windowEnd=new Date(endsAt);windowEnd.setDate(windowEnd.getDate()+windowDays);
 const [units]=await connection.query("SELECT id,code,name,description,capacity_adults,capacity_children,features_json,sort_order FROM tags_guest_units WHERE guest_app_id=? AND is_active=1 ORDER BY sort_order,name",[guestAppId]);
 const [stays]=await connection.query(`SELECT id,unit_id,stay_code,status,starts_at,ends_at FROM tags_guest_stays WHERE guest_app_id=? AND status NOT IN (${releasedPlaceholders}) AND starts_at<? AND ends_at>? ORDER BY starts_at,id`,[guestAppId,...INVENTORY_RELEASED_STATUSES,windowEnd,windowStart]);
 const [blocks]=await connection.query("SELECT id,scope_type,unit_id,block_type,reason,starts_on starts_at,ends_on ends_at FROM tags_guest_unit_blocks WHERE guest_app_id=? AND status='active' AND starts_on<? AND ends_on>? ORDER BY starts_on,id",[guestAppId,windowEnd,windowStart]);
 const [holds]=await connection.query(`SELECT r.id,r.unit_id,r.request_code,r.starts_on starts_at,r.ends_on ends_at
   FROM tags_guest_booking_requests r WHERE r.guest_app_id=? AND r.status IN ('held','pending_payment') AND r.hold_expires_at>NOW() AND (?=0 OR r.id<>?) AND r.starts_on<? AND r.ends_on>?
   UNION ALL
   SELECT r.id,ru.unit_id,r.request_code,r.starts_on starts_at,r.ends_on ends_at
   FROM tags_guest_booking_request_units ru INNER JOIN tags_guest_booking_requests r ON r.id=ru.request_id AND r.guest_app_id=ru.guest_app_id
   WHERE ru.guest_app_id=? AND ru.status='held' AND r.status IN ('held','pending_payment') AND r.hold_expires_at>NOW() AND (?=0 OR r.id<>?) AND r.starts_on<? AND r.ends_on>?
   ORDER BY starts_at,id`,[guestAppId,excludeRequestId,excludeRequestId,windowEnd,windowStart,guestAppId,excludeRequestId,excludeRequestId,windowEnd,windowStart]);
 const rateContext=await loadLodgingRateContext(connection,{guestAppId,startsOn:startsAt,endsOn:endsAt});
 const promotionContext=await loadLodgingPromotionContext(connection,{guestAppId,startsOn:dateKey(startsAt),endsOn:dateKey(endsAt)});
 const requestedStart=dateValue(startsAt),requestedEnd=dateValue(endsAt),results=[];
 for(const unit of units){
  const unitCapacity={adults:Number(unit.capacity_adults||0),children:Number(unit.capacity_children||0),total:Number(unit.capacity_adults||0)+Number(unit.capacity_children||0)};
  const capacity=validateUnitCapacity({unit,adults,children,settings});if(!capacity.ok){results.push({unitId:unit.id,name:unit.name,code:unit.code,capacity:unitCapacity,decision:"unavailable",reasonCode:capacity.code,reason:capacity.error});continue}
  const {ratePlan,restrictions,pricing:basePricing}=evaluateUnitRateRestrictions(rateContext,{unitId:unit.id,startsOn:startsAt,endsOn:endsAt,occupants:capacity.adults+capacity.children});
  const pricing=applyLodgingPromotion({promotions:promotionContext,unitId:unit.id,startsOn:dateKey(startsAt),endsOn:dateKey(endsAt),pricing:basePricing,couponCode});
  if(!ratePlan||!pricing.configured){results.push({unitId:unit.id,name:unit.name,code:unit.code,decision:"unavailable",reasonCode:"rate_not_configured",reason:"La unidad no tiene un precio disponible para todas las noches y la ocupación consultada.",ratePlan:null,restrictions,pricing});continue}
  if(!restrictions.allowed){const restriction=restrictions.reasons[0];results.push({unitId:unit.id,name:unit.name,code:unit.code,decision:"unavailable",reasonCode:restriction.code,reason:restriction.message,ratePlan:ratePlan?{id:Number(ratePlan.id),name:ratePlan.name,code:ratePlan.code,currency:ratePlan.currency,depositPercentage:Number(settings?.depositPercentage||0)}:null,restrictions,pricing});continue}
  const occupied=[...stays.filter(item=>Number(item.unit_id)===Number(unit.id)),...blocks.filter(item=>item.scope_type==="property"||Number(item.unit_id)===Number(unit.id)),...holds.filter(item=>Number(item.unit_id)===Number(unit.id))];
  const overlap=occupied.find(item=>dateValue(item.starts_at)<requestedEnd&&dateValue(item.ends_at)>requestedStart);
  if(overlap){const held=Boolean(overlap.request_code);results.push({unitId:unit.id,name:unit.name,code:unit.code,decision:"unavailable",reasonCode:overlap.stay_code?"occupied":held?"held":"blocked",reason:overlap.stay_code?"La unidad ya está ocupada en ese período":held?"La unidad está temporalmente retenida por otra solicitud":overlap.reason||"La unidad está bloqueada"});continue}
  const previous=occupied.filter(item=>dateValue(item.ends_at)<=requestedStart).sort((a,b)=>dateValue(b.ends_at)-dateValue(a.ends_at))[0];
  const next=occupied.filter(item=>dateValue(item.starts_at)>=requestedEnd).sort((a,b)=>dateValue(a.starts_at)-dateValue(b.starts_at))[0];
  const gapBefore=previous?daysBetween(previous.ends_at,startsAt):null,gapAfter=next?daysBetween(endsAt,next.starts_at):null;
  const shortBefore=gapBefore!=null&&gapBefore>0&&gapBefore<policy.minimumGapBefore,shortAfter=gapAfter!=null&&gapAfter>0&&gapAfter<policy.minimumGapAfter;
  const shortGap=shortBefore||shortAfter;
  let decision="available",reasonCode=null,reason=null,suggestion=null;
  if(shortGap&&policy.gapProtectionMode!==GAP_PROTECTION_MODE.DISABLED){
   reasonCode="residual_gap";reason=`La solicitud dejaría un hueco difícil de vender${shortBefore?` de ${gapBefore} noche${gapBefore===1?"":"s"} antes`:""}${shortBefore&&shortAfter?" y":""}${shortAfter?` de ${gapAfter} noche${gapAfter===1?"":"s"} después`:""}.`;
   if(policy.gapProtectionMode===GAP_PROTECTION_MODE.WARN)decision="available_with_warning";
   else if(policy.gapProtectionMode===GAP_PROTECTION_MODE.MANUAL_REVIEW)decision="review_required";
   else if(policy.gapProtectionMode===GAP_PROTECTION_MODE.BLOCK)decision="unavailable";
   else if(policy.gapProtectionMode===GAP_PROTECTION_MODE.AUTO_ADJUST){decision="alternative_suggested";if(shortAfter&&next){const nights=daysBetween(startsAt,next.starts_at);if(nights<=policy.maximumNights)suggestion={startsOn:dateKey(startsAt),endsOn:dateKey(next.starts_at),nights}}else if(shortBefore&&previous){const nights=daysBetween(previous.ends_at,endsAt);if(nights<=policy.maximumNights)suggestion={startsOn:dateKey(previous.ends_at),endsOn:dateKey(endsAt),nights}}}
  }
  if(decision==="available"&&restrictions.requiresManualReview){decision="review_required";reasonCode="rate_manual_review";reason="Estas fechas requieren confirmación manual del alojamiento."}
  const features=parseGuestJson(unit.features_json);
  results.push({unitId:unit.id,name:unit.name,code:unit.code,description:unit.description||"",equipment:Array.isArray(features.equipment)?features.equipment:[],details:features.details||"",images:Array.isArray(features.images)?features.images.filter(image=>image?.url).slice(0,12):[],capacity:{adults:Number(unit.capacity_adults||0),children:Number(unit.capacity_children||0),total:capacity.totalCapacity},decision,reasonCode,reason,gapBefore,gapAfter,suggestion,ratePlan:ratePlan?{id:Number(ratePlan.id),name:ratePlan.name,code:ratePlan.code,currency:ratePlan.currency,depositPercentage:Number(settings?.depositPercentage||0)}:null,restrictions,pricing});
 }
 const requestedOccupants=Math.max(1,Number(adults||0)+Number(children||0));
 const decisionRank={available:0,available_with_warning:1,review_required:2,alternative_suggested:3,unavailable:4};
 results.sort((left,right)=>{
  const rankDifference=(decisionRank[left.decision]??9)-(decisionRank[right.decision]??9);if(rankDifference)return rankDifference;
  const leftSurplus=Math.max(0,Number(left.capacity?.total||999)-requestedOccupants),rightSurplus=Math.max(0,Number(right.capacity?.total||999)-requestedOccupants);if(leftSurplus!==rightSurplus)return leftSurplus-rightSurplus;
  const priceDifference=Number(left.pricing?.total||Number.MAX_SAFE_INTEGER)-Number(right.pricing?.total||Number.MAX_SAFE_INTEGER);if(priceDifference)return priceDifference;
  return String(left.name||"").localeCompare(String(right.name||""),"es");
 });
 const selectable=results.filter(item=>!["unavailable","alternative_suggested"].includes(item.decision)&&item.capacity?.total);
 const minimumSurplus=selectable.length?Math.min(...selectable.map(item=>Math.max(0,Number(item.capacity.total)-requestedOccupants))):null;
 selectable.forEach(item=>{item.capacitySuitability=Math.max(0,Number(item.capacity.total)-requestedOccupants)===minimumSurplus?"best_fit":"larger_alternative"});
 return {policy,units:results,summary:{total:results.length,available:results.filter(item=>["available","available_with_warning"].includes(item.decision)).length,reviewRequired:results.filter(item=>item.decision==="review_required").length,alternatives:results.filter(item=>item.decision==="alternative_suggested").length}};
}
