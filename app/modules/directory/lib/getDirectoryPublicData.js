import { db } from "@/app/lib/tags-db";
export { directoryImageUrl, directoryWhatsappUrl } from "./directoryPublicFormatting";

const PAGE_SIZE = 12;

function integer(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function getDirectoryPublicData(searchParams = {}, siteCode = "calamuchitar") {
  const categoryId = integer(searchParams.categoria);
  const localityId = integer(searchParams.localidad);
  const page = Math.max(1, integer(searchParams.pagina, 1));
  const query = String(searchParams.q || "").trim().slice(0, 120);

  const [sites] = await db.execute(
    "SELECT id,code,name,primary_host,brand_config,seo_config FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1",
    [siteCode]
  );
  const site = sites[0] || null;
  if (!site) return null;

  let selectedCategory = null;
  let breadcrumbs = [];
  if (categoryId) {
    const [selected] = await db.execute(
      `SELECT n.id,n.parent_id,n.name,n.slug,n.depth,n.image_url,n.description
       FROM tags_directory_taxonomy_nodes n
       WHERE n.id=? AND n.is_active=1
         AND EXISTS (
           SELECT 1 FROM tags_directory_taxonomy_closure tc
           INNER JOIN tags_directory_listing_taxonomy lt ON lt.taxonomy_node_id=tc.descendant_id
           INNER JOIN tags_directory_site_listings sl ON sl.listing_id=lt.listing_id
           WHERE tc.ancestor_id=n.id AND sl.site_id=? AND sl.publication_status='published'
         )
       LIMIT 1`,
      [categoryId, site.id]
    );
    selectedCategory = selected[0] || null;
    if (selectedCategory) {
      const [ancestors] = await db.execute(
        `SELECT n.id,n.name,n.slug,n.depth
         FROM tags_directory_taxonomy_closure c
         INNER JOIN tags_directory_taxonomy_nodes n ON n.id=c.ancestor_id
         WHERE c.descendant_id=? AND c.depth>0
         ORDER BY n.depth`,
        [selectedCategory.id]
      );
      breadcrumbs = [...ancestors, selectedCategory];
    }
  }

  const parentId = selectedCategory?.id || null;
  const [categories] = await db.execute(
    `SELECT n.id,n.name,n.slug,n.depth,n.image_url,n.description,
            COUNT(DISTINCT sl.listing_id) listing_count
     FROM tags_directory_taxonomy_nodes n
     LEFT JOIN tags_directory_taxonomy_closure c ON c.ancestor_id=n.id
     LEFT JOIN tags_directory_listing_taxonomy lt ON lt.taxonomy_node_id=c.descendant_id
     LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=lt.listing_id AND sl.site_id=? AND sl.publication_status='published'
     LEFT JOIN tags_directory_listings l ON l.id=sl.listing_id AND l.status='published'
     WHERE n.parent_id <=> ? AND n.is_active=1
       AND EXISTS (
         SELECT 1 FROM tags_directory_taxonomy_closure visible_c
         INNER JOIN tags_directory_listing_taxonomy visible_lt ON visible_lt.taxonomy_node_id=visible_c.descendant_id
         INNER JOIN tags_directory_site_listings visible_sl ON visible_sl.listing_id=visible_lt.listing_id
         WHERE visible_c.ancestor_id=n.id AND visible_sl.site_id=? AND visible_sl.publication_status='published'
       )
     GROUP BY n.id,n.name,n.slug,n.depth,n.image_url,n.description,n.sort_order
     ORDER BY n.sort_order,n.name`,
    [site.id, parentId, site.id]
  );

  const [localities] = await db.execute(
    `SELECT p.id,p.name,COUNT(DISTINCT lp.listing_id) listing_count
     FROM tags_geo_places p
     INNER JOIN tags_directory_listing_places lp ON lp.place_id=p.id AND lp.relation_type='location'
     INNER JOIN tags_directory_site_listings sl ON sl.listing_id=lp.listing_id AND sl.site_id=? AND sl.publication_status='published'
     INNER JOIN tags_directory_listings l ON l.id=sl.listing_id AND l.status='published'
     WHERE p.place_type='locality' AND p.is_active=1
     GROUP BY p.id,p.name ORDER BY p.name`,
    [site.id]
  );

  const where = ["sl.site_id=?", "sl.publication_status='published'", "l.status='published'"];
  const values = [site.id];
  if (selectedCategory) {
    where.push(`EXISTS (
      SELECT 1 FROM tags_directory_listing_taxonomy flt
      INNER JOIN tags_directory_taxonomy_closure fc ON fc.descendant_id=flt.taxonomy_node_id
      WHERE flt.listing_id=l.id AND fc.ancestor_id=?
    )`);
    values.push(selectedCategory.id);
  }
  if (localityId) {
    where.push("EXISTS (SELECT 1 FROM tags_directory_listing_places fp WHERE fp.listing_id=l.id AND fp.place_id=? AND fp.relation_type='location')");
    values.push(localityId);
  }
  if (query) {
    const terms = query.split(/\s+/).map(term => term.trim()).filter(Boolean).slice(0, 6);
    for (const term of terms) {
      const like = `%${term}%`;
      where.push(`(
        l.display_name LIKE ? OR l.short_description LIKE ? OR l.description LIKE ? OR sl.seo_keywords LIKE ?
        OR EXISTS (
          SELECT 1 FROM tags_directory_listing_taxonomy qlt
          INNER JOIN tags_directory_taxonomy_nodes qn ON qn.id=qlt.taxonomy_node_id AND qn.is_active=1
          WHERE qlt.listing_id=l.id AND (qn.name LIKE ? OR qn.description LIKE ?)
        )
        OR EXISTS (
          SELECT 1 FROM tags_directory_listing_places qlp
          INNER JOIN tags_geo_places qp ON qp.id=qlp.place_id AND qp.is_active=1
          WHERE qlp.listing_id=l.id AND qp.name LIKE ?
        )
      )`);
      values.push(like, like, like, like, like, like, like);
    }
  }

  const isHome = !selectedCategory && !localityId && !query;
  let featuredListings = [];
  if (isHome) {
    const [featured] = await db.execute(
      `SELECT l.id,COALESCE(NULLIF(b.display_name,''),b.name) AS display_name,l.short_description,b.whatsapp,b.address,b.latitude,b.longitude,sl.slug,
              (SELECT p.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places p ON p.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name,
              COALESCE(NULLIF(b.logo_url,''),(SELECT m.url FROM tags_directory_media m WHERE m.listing_id=l.id AND m.is_active=1 ORDER BY FIELD(m.media_type,'cover','logo','gallery'),m.sort_order,m.id LIMIT 1)) image_url
       FROM tags_directory_site_listings sl
       INNER JOIN tags_directory_listings l ON l.id=sl.listing_id AND l.status='published'
       INNER JOIN tags_businesses b ON b.id=l.business_id
       WHERE sl.site_id=? AND sl.publication_status='published' AND sl.is_free=0 AND sl.is_featured=1
       ORDER BY sl.sort_order,l.display_name LIMIT 8`,
      [site.id]
    );
    featuredListings = featured;
  }

  const [countRows] = isHome ? [[{ total: 0 }]] : await db.execute(
    `SELECT COUNT(DISTINCT l.id) total
     FROM tags_directory_listings l
     INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
     WHERE ${where.join(" AND ")}`,
    values
  );
  const total = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;
  const [listings] = isHome ? [[]] : await db.execute(
    `SELECT l.id,COALESCE(NULLIF(b.display_name,''),b.name) AS display_name,l.short_description,b.phone,b.whatsapp,b.address,b.latitude,b.longitude,
            sl.slug,sl.is_free,
            (SELECT p.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places p ON p.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name,
            COALESCE(NULLIF(b.logo_url,''),(SELECT m.url FROM tags_directory_media m WHERE m.listing_id=l.id AND m.is_active=1 ORDER BY FIELD(m.media_type,'logo','cover','gallery'),m.sort_order,m.id LIMIT 1)) image_url
     FROM tags_directory_listings l
     INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
     INNER JOIN tags_businesses b ON b.id=l.business_id
     WHERE ${where.join(" AND ")}
     ORDER BY sl.is_featured DESC,sl.sort_order,l.display_name
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    values
  );

  const [mapListings] = isHome ? [[]] : await db.execute(
    `SELECT DISTINCT l.id,COALESCE(NULLIF(b.display_name,''),b.name) AS display_name,l.short_description,b.phone,b.whatsapp,b.address,b.latitude,b.longitude,sl.slug,sl.is_free,
            (SELECT p.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places p ON p.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name
     FROM tags_directory_listings l
     INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
     INNER JOIN tags_businesses b ON b.id=l.business_id
     WHERE ${where.join(" AND ")} AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
     ORDER BY l.display_name LIMIT 500`,
    values
  );

  return { site, selectedCategory, breadcrumbs, categories, localities, listings, featuredListings, mapListings, filters: { categoryId, localityId, query, page: safePage }, pagination: { total, totalPages, page: safePage, pageSize: PAGE_SIZE } };
}

export async function getDirectoryListingBySlug(slug, siteCode = "calamuchitar") {
  const [rows] = await db.execute(
    `SELECT l.*,b.name business_name,b.display_name business_display_name,b.email business_email,b.phone business_phone,b.whatsapp business_whatsapp,b.address business_address,b.latitude business_latitude,b.longitude business_longitude,b.website_url business_website_url,b.instagram_url business_instagram_url,b.facebook_url business_facebook_url,b.description business_description,b.logo_url business_logo_url,b.cover_url business_cover_url,sl.slug,sl.seo_title,sl.seo_description,s.name site_name,s.code site_code,s.primary_host,
            (SELECT p.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places p ON p.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name
     FROM tags_directory_site_listings sl
     INNER JOIN tags_directory_sites s ON s.id=sl.site_id AND s.code=? AND s.is_active=1
     INNER JOIN tags_directory_listings l ON l.id=sl.listing_id AND l.status='published'
     INNER JOIN tags_businesses b ON b.id=l.business_id
     WHERE sl.slug=? AND sl.publication_status='published' LIMIT 1`,
    [siteCode, slug]
  );
  const rawListing = rows[0] || null;
  const listing = rawListing && {
    ...rawListing,
    display_name: rawListing.business_display_name || rawListing.business_name || rawListing.display_name,
    description: rawListing.business_description ?? rawListing.description,
    email: rawListing.business_email ?? rawListing.email,
    phone: rawListing.business_phone ?? rawListing.phone,
    whatsapp: rawListing.business_whatsapp ?? rawListing.whatsapp,
    address: rawListing.business_address ?? rawListing.address,
    latitude: rawListing.business_latitude ?? rawListing.latitude,
    longitude: rawListing.business_longitude ?? rawListing.longitude,
    website_url: rawListing.business_website_url ?? rawListing.website_url,
    social_config: rawListing.social_config
  };
  if (!listing) return null;
  const [logoMedia, galleryMedia, taxonomy] = await Promise.all([
    db.execute("SELECT id,media_type,url,alt_text FROM tags_directory_media WHERE listing_id=? AND media_type='logo' AND is_active=1 ORDER BY sort_order,id LIMIT 1", [listing.id]),
    db.execute("SELECT id,media_type,url,alt_text FROM tags_directory_media WHERE listing_id=? AND media_type IN ('cover','gallery') AND is_active=1 ORDER BY FIELD(media_type,'cover','gallery'),sort_order,id LIMIT 8", [listing.id]),
    db.execute("SELECT n.id,n.name,n.depth FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id WHERE lt.listing_id=? ORDER BY n.depth,n.name", [listing.id]),
  ]);
  return { listing, media: [...logoMedia[0], ...galleryMedia[0]], taxonomy: taxonomy[0] };
}

export async function getDirectorySiteCodeByHost(rawHost) {
  const host = String(rawHost || "").toLowerCase().split(":")[0].replace(/^www\./, "");
  if (!host || host === "localhost") return "calamuchitar";
  const [rows] = await db.execute(
    `SELECT code FROM tags_directory_sites
     WHERE is_active=1 AND (LOWER(primary_host)=? OR LOWER(primary_host)=?)
     LIMIT 1`,
    [host, `www.${host}`]
  );
  return rows[0]?.code || "calamuchitar";
}

export async function getDirectorySiteByCode(siteCode) {
  const [rows] = await db.execute(
    "SELECT id,code,name,primary_host,brand_config,seo_config,directory_config FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1",
    [siteCode]
  );
  return rows[0] || null;
}

export async function getDirectoryPublicBenefits(searchParams = {}, siteCode = "calamuchitar") {
  const query = String(searchParams.q || "").trim().slice(0, 120);
  const localityId = integer(searchParams.localidad);
  const categoryId = integer(searchParams.categoria);
  const page = Math.max(1, integer(searchParams.pagina, 1));

  const site = await getDirectorySiteByCode(siteCode);
  if (!site) return null;

  const where = [
    "db.site_id=?",
    "db.visibility='public'",
    "db.is_active=1",
    "db.valid_from<=CURDATE()",
    "db.valid_until>=CURDATE()",
    "sl.publication_status='published'",
    "l.status='published'"
  ];
  const values = [site.id];

  if (localityId) {
    where.push(`EXISTS (
      SELECT 1 FROM tags_directory_listing_places blp
      WHERE blp.listing_id=l.id AND blp.place_id=? AND blp.relation_type='location'
    )`);
    values.push(localityId);
  }

  if (categoryId) {
    where.push(`EXISTS (
      SELECT 1
      FROM tags_directory_listing_taxonomy blt
      INNER JOIN tags_directory_taxonomy_closure btc ON btc.descendant_id=blt.taxonomy_node_id
      WHERE blt.listing_id=l.id AND btc.ancestor_id=?
    )`);
    values.push(categoryId);
  }

  if (query) {
    for (const term of query.split(/\s+/).filter(Boolean).slice(0, 6)) {
      const like = `%${term}%`;
      where.push(`(
        b.name LIKE ? OR b.display_name LIKE ? OR db.name LIKE ? OR db.description LIKE ?
        OR EXISTS (
          SELECT 1 FROM tags_geo_places bq
          INNER JOIN tags_directory_listing_places bqlp ON bqlp.place_id=bq.id AND bqlp.listing_id=l.id
          WHERE bq.name LIKE ?
        )
        OR EXISTS (
          SELECT 1
          FROM tags_directory_listing_taxonomy bqlt
          INNER JOIN tags_directory_taxonomy_nodes bqn ON bqn.id=bqlt.taxonomy_node_id AND bqn.is_active=1
          WHERE bqlt.listing_id=l.id AND bqn.name LIKE ?
        )
      )`);
      values.push(like, like, like, like, like, like);
    }
  }

  const [benefits] = await db.execute(
    `SELECT db.id,db.name,db.benefit_type,db.benefit_value,db.valid_from,db.valid_until,
            db.description,db.image_url,db.visibility,
            l.id listing_id,sl.slug,
            COALESCE(NULLIF(b.display_name,''),b.name) business_name,
            b.phone,b.whatsapp,b.address,b.latitude,b.longitude,
            (SELECT gp.name
             FROM tags_directory_listing_places glp
             INNER JOIN tags_geo_places gp ON gp.id=glp.place_id
             WHERE glp.listing_id=l.id AND glp.relation_type='location'
             ORDER BY glp.is_primary DESC,glp.place_id LIMIT 1) locality_name,
            (SELECT gn.name
             FROM tags_directory_listing_taxonomy glt
             INNER JOIN tags_directory_taxonomy_nodes gn ON gn.id=glt.taxonomy_node_id
             WHERE glt.listing_id=l.id AND gn.is_active=1
             ORDER BY gn.depth DESC,gn.name LIMIT 1) category_name,
            COALESCE(NULLIF(b.logo_url,''),
              (SELECT gm.url FROM tags_directory_media gm
               WHERE gm.listing_id=l.id AND gm.is_active=1
               ORDER BY FIELD(gm.media_type,'logo','cover','gallery'),gm.sort_order,gm.id LIMIT 1)
            ) logo_url
     FROM tags_directory_benefits db
     INNER JOIN tags_directory_listings l ON l.id=db.listing_id
     INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.site_id=db.site_id
     INNER JOIN tags_businesses b ON b.id=l.business_id
     WHERE ${where.join(" AND ")}
     ORDER BY db.valid_until,db.sort_order,db.id
     LIMIT 20 OFFSET ${(page - 1) * 20}`,
    values
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) total
     FROM tags_directory_benefits db
     INNER JOIN tags_directory_listings l ON l.id=db.listing_id
     INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.site_id=db.site_id
     INNER JOIN tags_businesses b ON b.id=l.business_id
     WHERE ${where.join(" AND ")}`,
    values
  );

  const [localities] = await db.execute(
    `SELECT DISTINCT p.id,p.name
     FROM tags_geo_places p
     INNER JOIN tags_directory_listing_places lp ON lp.place_id=p.id AND lp.relation_type='location'
     INNER JOIN tags_directory_listings l ON l.id=lp.listing_id AND l.status='published'
     INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.site_id=? AND sl.publication_status='published'
     INNER JOIN tags_directory_benefits db ON db.listing_id=l.id AND db.site_id=sl.site_id
     WHERE p.place_type='locality' AND p.is_active=1 AND db.visibility='public' AND db.is_active=1
       AND db.valid_from<=CURDATE() AND db.valid_until>=CURDATE()
     ORDER BY p.name`,
    [site.id]
  );

  const [categories] = await db.execute(
    `SELECT DISTINCT n.id,n.name,n.depth
     FROM tags_directory_taxonomy_nodes n
     INNER JOIN tags_directory_taxonomy_closure c ON c.ancestor_id=n.id
     INNER JOIN tags_directory_listing_taxonomy lt ON lt.taxonomy_node_id=c.descendant_id
     INNER JOIN tags_directory_listings l ON l.id=lt.listing_id AND l.status='published'
     INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.site_id=? AND sl.publication_status='published'
     INNER JOIN tags_directory_benefits db ON db.listing_id=l.id AND db.site_id=sl.site_id
     WHERE n.is_active=1 AND db.visibility='public' AND db.is_active=1
       AND db.valid_from<=CURDATE() AND db.valid_until>=CURDATE()
     ORDER BY n.name`,
    [site.id]
  );

  const total = Number(countRows[0]?.total || 0);
  return { site, benefits, localities, categories, filters: { query, localityId, categoryId, page }, pagination: { total, totalPages: Math.max(1, Math.ceil(total / 20)) } };
}
