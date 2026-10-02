export function selectRecommendedCandidates({ candidates = [], recommendationKeys = [], limit = 9 }) {
  const authorizedKeys = new Set(recommendationKeys.map(item => String(item || "").trim()).filter(Boolean).slice(0, limit));
  return candidates.filter(item => authorizedKeys.has(item?.entityKey)).slice(0, limit);
}
