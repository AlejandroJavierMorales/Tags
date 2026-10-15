const OPTIONAL_SCHEMA_ERRORS = new Set(["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"]);

function clean(value, max = 50000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function publicText(value, output = []) {
  if (typeof value === "string") {
    const text = clean(value, 10000);
    if (text && !/^https?:\/\//i.test(text) && !/^#[0-9a-f]{3,8}$/i.test(text)) output.push(text);
  } else if (Array.isArray(value)) value.forEach(item => publicText(item, output));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (!/^(?:url|image|images|storagePath|styles?|color|font|animation)/i.test(key)) publicText(item, output);
    }
  }
  return output;
}

async function optionalRows(connection, sql, params) {
  try {
    const [rows] = await connection.query(sql, params);
    return rows;
  } catch (error) {
    if (OPTIONAL_SCHEMA_ERRORS.has(error?.code)) return [];
    throw error;
  }
}

function addDocument(documents, sourceType, sourceId, title, values, updatedAt = null) {
  const parts = values.flatMap(value => {
    if (typeof value !== "string") return publicText(value);
    const trimmed = value.trim();
    return /^(?:\{|\[)/.test(trimmed) ? publicText(parseJson(trimmed)) : publicText(trimmed);
  }).filter(Boolean);
  const text = clean([title, ...parts].filter(Boolean).join(" | "));
  if (!text) return;
  documents.push({ sourceType, sourceId: String(sourceId), title: clean(title, 255), text, updatedAt });
}

export async function collectBusinessPublicKnowledge(connection, { businessId, siteId }) {
  const id = Number(businessId || 0);
  const directorySiteId = Number(siteId || 0);
  if (!id) return { documents: [], text: "", sourceTypes: [] };

  const [pageBlocks, storeBlocks, benefits, loyaltyPrograms, loyaltyRewards, customKnowledge, profileEntries] = await Promise.all([
    optionalRows(connection, `SELECT p.id page_id,p.page_type,p.title page_title,p.description page_description,
      sec.id section_id,sec.title section_title,bl.id block_id,bl.type block_type,bl.content_json,bl.updated_at
      FROM tags_qr_pages p
      LEFT JOIN tags_qr_page_sections sec ON sec.page_id=p.id AND sec.is_visible=1
      LEFT JOIN tags_qr_page_blocks bl ON bl.section_id=sec.id AND bl.is_visible=1
      WHERE p.business_id=? AND p.status='published'
      ORDER BY p.id,sec.sort_order,bl.sort_order`, [id]),
    optionalRows(connection, `SELECT st.id store_id,st.app_type,st.name store_name,s.id section_id,s.title section_title,
      b.id block_id,b.title block_title,b.block_type,b.content_json,b.updated_at
      FROM tags_stores st
      INNER JOIN tags_store_sections s ON s.store_id=st.id AND s.is_visible=1
      INNER JOIN tags_store_blocks b ON b.section_id=s.id AND b.is_visible=1
      WHERE st.business_id=? AND st.status='published'
      ORDER BY st.id,s.sort_order,b.sort_order`, [id]),
    optionalRows(connection, `SELECT id,name,benefit_type,benefit_value,promotion_buy_quantity,promotion_pay_quantity,
      promotion_item,valid_from,valid_until,description,visibility,updated_at
      FROM tags_directory_benefits
      WHERE business_id=? AND is_active=1 AND valid_from<=CURRENT_DATE() AND valid_until>=CURRENT_DATE()
        AND (?=0 OR site_id IS NULL OR site_id=?)
      ORDER BY sort_order,id`, [id, directorySiteId, directorySiteId]),
    optionalRows(connection, `SELECT p.id,p.name,p.description,p.mechanic,p.points_currency,p.points_per_currency,
      p.stamp_target,p.visit_target,p.settings_json,p.updated_at
      FROM tags_loyalty_programs p
      INNER JOIN tags_business_addons ba ON ba.business_id=p.business_id AND ba.addon_code='loyalty'
        AND ba.status='active' AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
      WHERE p.business_id=? AND p.status='active' AND (?=0 OR p.directory_site_id IS NULL OR p.directory_site_id=?)
      ORDER BY p.id`, [id, directorySiteId, directorySiteId]),
    optionalRows(connection, `SELECT r.id,r.program_id,r.name,r.description,r.reward_type,r.reward_value,
      r.required_points,r.required_stamps,r.required_visits,r.valid_from,r.valid_until,r.settings_json,r.updated_at
      FROM tags_loyalty_rewards r
      INNER JOIN tags_loyalty_programs p ON p.id=r.program_id AND p.business_id=? AND p.status='active'
      WHERE r.status='active' AND (r.valid_from IS NULL OR r.valid_from<=NOW()) AND (r.valid_until IS NULL OR r.valid_until>=NOW())
      ORDER BY r.program_id,r.id`, [id]),
    optionalRows(connection, "SELECT id,title,topics,content,updated_at FROM tags_ai_chatbot_knowledge WHERE business_id=? AND is_active=1 ORDER BY id", [id]),
    directorySiteId ? optionalRows(connection, "SELECT id,display_value,description,updated_at FROM tags_ai_business_profile_entries WHERE site_id=? AND business_id=? AND status='active' ORDER BY id", [directorySiteId, id]) : [],
  ]);

  const documents = [];
  for (const row of pageBlocks) addDocument(documents, "qr_page_block", row.block_id || `page:${row.page_id}`, row.block_title || row.section_title || row.page_title || row.page_type, [row.page_description, row.content_json], row.updated_at);
  for (const row of storeBlocks) addDocument(documents, `${row.app_type}_block`, row.block_id, row.block_title || row.section_title || row.store_name, [row.content_json], row.updated_at);
  for (const row of benefits) addDocument(documents, "directory_benefit", row.id, row.name, [{
    description: row.description,
    benefit: row.benefit_type === "quantity" ? `${row.promotion_buy_quantity}x${row.promotion_pay_quantity} ${row.promotion_item || ""}` : `${row.benefit_value}${row.benefit_type === "percentage" ? "%" : ""}`,
    validity: `${row.valid_from} a ${row.valid_until}`,
  }], row.updated_at);
  for (const row of loyaltyPrograms) addDocument(documents, "loyalty_program", row.id, row.name, [{
    description: row.description, mechanic: row.mechanic, pointsCurrency: row.points_currency,
    pointsPerCurrency: row.points_per_currency, stampTarget: row.stamp_target, visitTarget: row.visit_target,
  }, row.settings_json], row.updated_at);
  for (const row of loyaltyRewards) addDocument(documents, "loyalty_reward", row.id, row.name, [{
    description: row.description, rewardType: row.reward_type, rewardValue: row.reward_value,
    requiredPoints: row.required_points, requiredStamps: row.required_stamps, requiredVisits: row.required_visits,
    validity: [row.valid_from, row.valid_until].filter(Boolean).join(" a "),
  }, row.settings_json], row.updated_at);
  for (const row of customKnowledge) addDocument(documents, "business_knowledge", row.id, row.title, [row.topics, row.content], row.updated_at);
  for (const row of profileEntries) addDocument(documents, "business_profile", row.id, row.display_value, [row.description], row.updated_at);

  return {
    documents,
    text: clean(documents.map(item => `[${item.sourceType}] ${item.text}`).join(" | ")),
    sourceTypes: [...new Set(documents.map(item => item.sourceType))],
  };
}
