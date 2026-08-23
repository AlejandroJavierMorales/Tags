import { db } from "@/app/lib/tags-db";

const FOUNDATION_TABLES = [
  "tags_plan_profiles",
  "tags_plan_versions",
  "tags_plan_version_addons",
  "tags_plan_version_prices",
  "tags_plan_business_assignments",
  "tags_subscription_offers",
  "tags_subscription_terms",
  "tags_subscription_addon_grants",
  "tags_subscription_provider_events",
  "tags_subscription_audit_events"
];

export async function getSubscriptionFoundationStatus(queryDb = db) {
  const placeholders = FOUNDATION_TABLES.map(() => "?").join(",");
  const [rows] = await queryDb.query(
    `SELECT TABLE_NAME table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders})`,
    FOUNDATION_TABLES
  );
  const existing = new Set(rows.map(row => row.table_name));
  const missing = FOUNDATION_TABLES.filter(table => !existing.has(table));
  return { ready: missing.length === 0, existing: [...existing], missing };
}
