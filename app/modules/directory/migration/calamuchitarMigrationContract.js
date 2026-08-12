import { normalizeDirectorySlug } from "../lib/normalizeDirectorySlug.js";

export const CALAMUCHITAR_SOURCE_TABLES = Object.freeze([
  "publishers",
  "publishers_ac",
  "subscriptions",
  "subscription_categories",
  "images",
  "categories",
  "subcategories",
  "subsubcategories",
  "countries",
  "states",
  "regions",
  "locality",
]);

export const CALAMUCHITAR_TARGET_TABLES = Object.freeze([
  "tags_directory_sites",
  "tags_directory_listings",
  "tags_directory_site_listings",
  "tags_directory_taxonomy_nodes",
  "tags_directory_taxonomy_closure",
  "tags_directory_listing_taxonomy",
  "tags_geo_places",
  "tags_directory_listing_places",
  "tags_directory_media",
  "tags_legacy_routes",
  "tags_legacy_entity_map",
]);

export function firstValue(row, names, fallback = null) {
  for (const name of names) {
    if (row?.[name] !== undefined && row[name] !== null && row[name] !== "") return row[name];
  }
  return fallback;
}

export function legacyPublisherSlug(publisher) {
  const explicit = firstValue(publisher, ["name_site", "slug"]);
  return normalizeDirectorySlug(explicit || firstValue(publisher, ["company_name", "name"]));
}

export function normalizeNullableCoordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(normalized) && normalized >= minimum && normalized <= maximum
    ? normalized
    : null;
}

export function publisherIdentityKey(publisher, tableName) {
  const id = firstValue(publisher, ["id", "publisher_id"]);
  return `${tableName}:${id}`;
}
