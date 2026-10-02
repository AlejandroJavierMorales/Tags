const EVIDENCE_PRIORITY={structured_item:5,tourism_editorial:5,business_identity:5,explicit_business_text:4,structural_category:3};

export function rankDestinationCandidates(items,limit=4){
  const seen=new Set();
  return [...items].sort((a,b)=>{
    const evidence=(EVIDENCE_PRIORITY[b.evidenceLevel]||0)-(EVIDENCE_PRIORITY[a.evidenceLevel]||0);
    if(evidence)return evidence;
    if(Number.isFinite(a.distanceKm)&&Number.isFinite(b.distanceKm)&&a.distanceKm!==b.distanceKm)return a.distanceKm-b.distanceKm;
    if(Number.isFinite(a.distanceKm)!==Number.isFinite(b.distanceKm))return Number.isFinite(a.distanceKm)?-1:1;
    return Number(b.rankingScore||0)-Number(a.rankingScore||0);
  }).filter(item=>{const key=item.entityType==="business_location"?`listing:${item.id}`:item.entityKey;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,limit);
}
