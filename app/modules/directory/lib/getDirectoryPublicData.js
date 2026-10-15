import { db } from "@/app/lib/tags-db";
import { normalizeDirectoryDbValue } from "./normalizeDirectoryDbValue";
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
    "SELECT id,code,name,primary_host,brand_config,seo_config,directory_config FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1",
    [siteCode]
  );
  const site = normalizeDirectoryDbValue(sites[0] || null);
  if (!site) return null;

  let selectedCategory = null;
  let breadcrumbs = [];
  if (categoryId) {
    const [selected] = await db.execute(
      `SELECT n.id,n.parent_id,n.name,n.slug,n.depth,n.image_url,n.description
       FROM tags_directory_taxonomy_nodes n
       WHERE n.id=? AND n.is_active=1
         AND (
           EXISTS (
             SELECT 1 FROM tags_directory_taxonomy_closure tc
             INNER JOIN tags_directory_listing_taxonomy lt ON lt.taxonomy_node_id=tc.descendant_id
             INNER JOIN tags_directory_site_listings sl ON sl.listing_id=lt.listing_id
             INNER JOIN tags_directory_listings l ON l.id=sl.listing_id AND l.status='published'
             WHERE tc.ancestor_id=n.id AND sl.site_id=? AND sl.publication_status='published'
           )
           OR EXISTS (
             SELECT 1 FROM tags_directory_taxonomy_closure tc
             INNER JOIN tags_ai_tourism_content_categories tcc ON tcc.taxonomy_node_id=tc.descendant_id AND tcc.site_id=?
             INNER JOIN tags_ai_tourism_contents content ON content.id=tcc.content_id AND content.site_id=tcc.site_id
             WHERE tc.ancestor_id=n.id AND content.status='published'
               AND (content.valid_until IS NULL OR DATE(content.valid_until)>=CURRENT_DATE())
           )
         )
       LIMIT 1`,
      [categoryId, site.id, site.id]
    );
    selectedCategory = normalizeDirectoryDbValue(selected[0] || null);
    if (selectedCategory) {
      const [ancestors] = await db.execute(
        `SELECT n.id,n.name,n.slug,n.depth
         FROM tags_directory_taxonomy_closure c
         INNER JOIN tags_directory_taxonomy_nodes n ON n.id=c.ancestor_id
         WHERE c.descendant_id=? AND c.depth>0
         ORDER BY n.depth`,
        [selectedCategory.id]
      );
      breadcrumbs = [...normalizeDirectoryDbValue(ancestors), selectedCategory];
    }
  }

  const parentId = selectedCategory?.id || null;
  const [categoriesRows] = await db.execute(
    `SELECT n.id,n.name,n.slug,n.depth,n.image_url,n.description,
            COALESCE(provider_counts.listing_count,0) listing_count,
            COALESCE(content_counts.content_count,0) content_count,
            COALESCE(provider_counts.listing_count,0)+COALESCE(content_counts.content_count,0) total_count
     FROM tags_directory_taxonomy_nodes n
     LEFT JOIN (
       SELECT tc.ancestor_id taxonomy_node_id,COUNT(DISTINCT l.id) listing_count
       FROM tags_directory_taxonomy_closure tc
       INNER JOIN tags_directory_listing_taxonomy lt ON lt.taxonomy_node_id=tc.descendant_id
       INNER JOIN tags_directory_site_listings sl ON sl.listing_id=lt.listing_id AND sl.site_id=? AND sl.publication_status='published'
       INNER JOIN tags_directory_listings l ON l.id=sl.listing_id AND l.status='published'
       GROUP BY tc.ancestor_id
     ) provider_counts ON provider_counts.taxonomy_node_id=n.id
     LEFT JOIN (
       SELECT tc.ancestor_id taxonomy_node_id,COUNT(DISTINCT content.id) content_count
       FROM tags_directory_taxonomy_closure tc
       INNER JOIN tags_ai_tourism_content_categories tcc ON tcc.taxonomy_node_id=tc.descendant_id AND tcc.site_id=?
       INNER JOIN tags_ai_tourism_contents content ON content.id=tcc.content_id AND content.site_id=tcc.site_id
       WHERE content.status='published'
         AND (content.valid_until IS NULL OR DATE(content.valid_until)>=CURRENT_DATE())
       GROUP BY tc.ancestor_id
     ) content_counts ON content_counts.taxonomy_node_id=n.id
     WHERE n.parent_id <=> ? AND n.is_active=1
       AND (COALESCE(provider_counts.listing_count,0)+COALESCE(content_counts.content_count,0))>0
     ORDER BY n.sort_order,n.name`,
    [site.id, site.id, parentId]
  );
  const categories = normalizeDirectoryDbValue(categoriesRows);
  if (!selectedCategory) categories.sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "es", { sensitivity: "base" }));

  const where = ["sl.site_id=?", "sl.publication_status='published'", "l.status='published'"];
  const values = [site.id];
  const tourismWhere = ["content.site_id=?", "content.status='published'", "(content.valid_until IS NULL OR DATE(content.valid_until)>=CURRENT_DATE())"];
  const tourismValues = [site.id];
  if (selectedCategory) {
    where.push(`EXISTS (
      SELECT 1 FROM tags_directory_listing_taxonomy flt
      INNER JOIN tags_directory_taxonomy_closure fc ON fc.descendant_id=flt.taxonomy_node_id
      WHERE flt.listing_id=l.id AND fc.ancestor_id=?
    )`);
    values.push(selectedCategory.id);
    tourismWhere.push(`EXISTS (
      SELECT 1 FROM tags_ai_tourism_content_categories ftcc
      INNER JOIN tags_directory_taxonomy_closure ftc ON ftc.descendant_id=ftcc.taxonomy_node_id
      WHERE ftcc.site_id=content.site_id AND ftcc.content_id=content.id AND ftc.ancestor_id=?
    )`);
    tourismValues.push(selectedCategory.id);
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
      tourismWhere.push(`(
        content.title LIKE ? OR content.summary LIKE ? OR content.description LIKE ? OR content.searchable_text LIKE ?
        OR EXISTS (
          SELECT 1 FROM tags_ai_tourism_content_categories qtcc
          INNER JOIN tags_directory_taxonomy_nodes qtn ON qtn.id=qtcc.taxonomy_node_id AND qtn.is_active=1
          WHERE qtcc.site_id=content.site_id AND qtcc.content_id=content.id AND (qtn.name LIKE ? OR qtn.description LIKE ?)
        )
      )`);
      tourismValues.push(like, like, like, like, like, like);
    }
  }

  const localityWhere = [...where];
  const localityValues = [...values];
  const [[localitiesRows],[tourismLocalitiesRows]] = await Promise.all([db.execute(
    `SELECT p.id,p.name,COUNT(DISTINCT l.id) listing_count
     FROM tags_directory_listings l
     INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
     INNER JOIN tags_directory_listing_places lp ON lp.listing_id=l.id AND lp.relation_type='location'
     INNER JOIN tags_geo_places p ON p.id=lp.place_id AND p.place_type='locality' AND p.is_active=1
     WHERE ${localityWhere.join(" AND ")}
     GROUP BY p.id,p.name
     HAVING COUNT(DISTINCT l.id)>0
     ORDER BY p.name`,
    localityValues
  ),db.execute(
    `SELECT p.id,p.name,COUNT(DISTINCT content.id) listing_count
       FROM tags_ai_tourism_contents content
       INNER JOIN tags_geo_places p ON p.place_type='locality' AND p.is_active=1
        AND (p.id=content.locality_id OR LOWER(p.name)=LOWER(content.locality_name))
      WHERE ${tourismWhere.join(" AND ")}
      GROUP BY p.id,p.name
      ORDER BY p.name`,
    tourismValues
  )]);
  const localityMap=new Map();
  for(const item of [...normalizeDirectoryDbValue(localitiesRows),...normalizeDirectoryDbValue(tourismLocalitiesRows)]){
    const existing=localityMap.get(Number(item.id));
    if(existing)existing.listing_count=Number(existing.listing_count||0)+Number(item.listing_count||0);
    else localityMap.set(Number(item.id),{...item,listing_count:Number(item.listing_count||0)});
  }
  const localities=[...localityMap.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name),"es"));

  if (localityId) {
    where.push("EXISTS (SELECT 1 FROM tags_directory_listing_places fp WHERE fp.listing_id=l.id AND fp.place_id=? AND fp.relation_type='location')");
    values.push(localityId);
    tourismWhere.push("(content.locality_id=? OR LOWER(content.locality_name)=(SELECT LOWER(p.name) FROM tags_geo_places p WHERE p.id=? LIMIT 1))");
    tourismValues.push(localityId,localityId);
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
    featuredListings = normalizeDirectoryDbValue(featured);
  }

  const [[providerCountRows],[tourismCountRows]] = isHome ? [[[{ total:0 }]],[[{ total:0 }]]] : await Promise.all([
    db.execute(
      `SELECT COUNT(DISTINCT l.id) total
       FROM tags_directory_listings l
       INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
       WHERE ${where.join(" AND ")}`,
      values
    ),
    db.execute(
      `SELECT COUNT(DISTINCT content.id) total
       FROM tags_ai_tourism_contents content
       WHERE ${tourismWhere.join(" AND ")}`,
      tourismValues
    )
  ]);
  const providerTotal=Number(providerCountRows[0]?.total||0);
  const tourismTotal=Number(tourismCountRows[0]?.total||0);
  const total = providerTotal+tourismTotal;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;

  const [[providerRows],[tourismRows]]=isHome?[[[]],[[]]]:await Promise.all([
    db.execute(
      `SELECT 'provider' result_type,l.id,COALESCE(NULLIF(b.display_name,''),b.name) display_name,
              l.short_description,b.phone,b.whatsapp,b.address,
              COALESCE(l.latitude,b.latitude) latitude,COALESCE(l.longitude,b.longitude) longitude,
              sl.slug,sl.is_free,
              (SELECT p.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places p ON p.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name,
              COALESCE(NULLIF(b.logo_url,''),(SELECT m.url FROM tags_directory_media m WHERE m.listing_id=l.id AND m.is_active=1 ORDER BY FIELD(m.media_type,'logo','cover','gallery'),m.sort_order,m.id LIMIT 1)) image_url,
              (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth DESC,n.name SEPARATOR ' | ') FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=l.id) category_names,
              sl.is_featured sort_featured,sl.sort_order result_sort,1 show_on_map
         FROM tags_directory_listings l
         INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
         INNER JOIN tags_businesses b ON b.id=l.business_id
        WHERE ${where.join(" AND ")}`,
      values
    ),
    db.execute(
      `SELECT 'tourism' result_type,content.id,content.title display_name,
              COALESCE(content.summary,LEFT(content.description,1000)) short_description,
              JSON_UNQUOTE(JSON_EXTRACT(content.contact_json,'$.phone')) phone,
              JSON_UNQUOTE(JSON_EXTRACT(content.contact_json,'$.whatsapp')) whatsapp,
              content.address,content.latitude,content.longitude,content.locality_name,
              content.primary_image_url image_url,
              COALESCE(content.public_url,JSON_UNQUOTE(JSON_EXTRACT(content.contact_json,'$.bookingUrl'))) public_url,
              content.content_type,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(content.event_json,'$.start')),content.valid_from) event_start,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(content.event_json,'$.end')),content.valid_until) event_end,
              JSON_UNQUOTE(JSON_EXTRACT(content.availability_json,'$.schedule')) schedule,
              (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.depth DESC,n.name SEPARATOR ' | ') FROM tags_ai_tourism_content_categories tcc INNER JOIN tags_directory_taxonomy_nodes n ON n.id=tcc.taxonomy_node_id AND n.is_active=1 WHERE tcc.site_id=content.site_id AND tcc.content_id=content.id) category_names,
              content.is_featured sort_featured,0 result_sort,content.show_on_map
         FROM tags_ai_tourism_contents content
        WHERE ${tourismWhere.join(" AND ")}`,
      tourismValues
    )
  ]);
  const allResults=[...normalizeDirectoryDbValue(providerRows),...normalizeDirectoryDbValue(tourismRows)].sort((a,b)=>Number(b.sort_featured||0)-Number(a.sort_featured||0)||Number(a.result_sort||0)-Number(b.result_sort||0)||String(a.display_name).localeCompare(String(b.display_name),"es"));
  const listings=allResults.slice(offset,offset+PAGE_SIZE);
  const mapListings=allResults.filter(item=>Number(item.show_on_map)!==0&&Number.isFinite(Number(item.latitude))&&Number.isFinite(Number(item.longitude))&&Number(item.latitude)>=-90&&Number(item.latitude)<=90&&Number(item.longitude)>=-180&&Number(item.longitude)<=180&&!(Number(item.latitude)===0&&Number(item.longitude)===0)).slice(0,500);

  return { site, selectedCategory, breadcrumbs, categories, localities, listings, featuredListings, mapListings, filters: { categoryId, localityId, query, page: safePage }, pagination: { total,providerTotal,tourismTotal,totalPages,page:safePage,pageSize:PAGE_SIZE } };
}

export async function getDirectoryListingBySlug(slug, siteCode = "calamuchitar") {
  const [rows] = await db.execute(
    `SELECT l.*,b.name business_name,b.display_name business_display_name,b.email business_email,b.phone business_phone,b.whatsapp business_whatsapp,b.address business_address,b.latitude business_latitude,b.longitude business_longitude,b.website_url business_website_url,b.instagram_url business_instagram_url,b.facebook_url business_facebook_url,b.description business_description,b.logo_url business_logo_url,b.cover_url business_cover_url,sl.slug,sl.seo_title,sl.seo_description,sl.publication_status,sl.is_free,s.id site_id,s.name site_name,s.code site_code,s.primary_host,s.directory_config,
            (SELECT p.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places p ON p.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name
     FROM tags_directory_site_listings sl
     INNER JOIN tags_directory_sites s ON s.id=sl.site_id AND s.code=? AND s.is_active=1
     INNER JOIN tags_directory_listings l ON l.id=sl.listing_id
     INNER JOIN tags_businesses b ON b.id=l.business_id
     WHERE sl.slug=? AND sl.publication_status IN ('published','hidden','archived')
     ORDER BY (sl.publication_status='published') DESC,sl.id DESC LIMIT 1`,
    [siteCode, slug]
  );
  const rawListing = normalizeDirectoryDbValue(rows[0] || null);
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
    db.execute("SELECT id,media_type,url,alt_text FROM tags_directory_media WHERE listing_id=? AND media_type IN ('cover','gallery') AND is_active=1 ORDER BY FIELD(media_type,'cover','gallery'),sort_order,id LIMIT 12", [listing.id]),
    db.execute("SELECT n.id,n.name,n.depth FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id WHERE lt.listing_id=? ORDER BY n.depth,n.name", [listing.id]),
  ]);
  return {
    listing,
    media: normalizeDirectoryDbValue([...logoMedia[0], ...galleryMedia[0]]),
    taxonomy: normalizeDirectoryDbValue(taxonomy[0]),
  };
}

export async function getDirectoryCurrentSlugFromHistory(slug, siteCode = "calamuchitar") {
  try {
    const [rows] = await db.execute(
      `SELECT current_listing.slug
         FROM tags_directory_slug_redirects history
         INNER JOIN tags_directory_sites site
           ON site.id=history.site_id AND site.code=? AND site.is_active=1
         INNER JOIN tags_directory_site_listings current_listing
           ON current_listing.site_id=history.site_id
          AND current_listing.listing_id=history.listing_id
          AND current_listing.publication_status='published'
         INNER JOIN tags_directory_listings listing
           ON listing.id=history.listing_id AND listing.status='published'
        WHERE history.old_slug=?
          AND current_listing.slug<>history.old_slug
        LIMIT 1`,
      [siteCode, slug]
    );
    return rows[0]?.slug || null;
  } catch (error) {
    // El despliegue del codigo no rompe rutas publicas si la migracion
    // todavia no fue ejecutada. El cambio de slug si queda bloqueado.
    if (error?.code === "ER_NO_SUCH_TABLE") return null;
    throw error;
  }
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

export async function getDirectoryPublicLoyaltyPrograms(searchParams = {}, siteCode = "calamuchitar") {
  const query = String(searchParams.q || "").trim().slice(0, 120);
  const localityId = integer(searchParams.localidad);
  const categoryId = integer(searchParams.categoria);
  const mechanic = ["points", "stamps", "visits"].includes(String(searchParams.modalidad || "")) ? String(searchParams.modalidad) : "";
  const page = Math.max(1, integer(searchParams.pagina, 1));
  const site = await getDirectorySiteByCode(siteCode);
  if (!site) return null;

  const where = ["sl.site_id=?", "sl.publication_status='published'", "l.status='published'", "p.status='active'", "ba.status='active'", "(ba.expires_at IS NULL OR ba.expires_at>=NOW())"];
  const values = [site.id];
  if (localityId) { where.push(`EXISTS (SELECT 1 FROM tags_directory_listing_places lp WHERE lp.listing_id=l.id AND lp.place_id=? AND lp.relation_type='location')`); values.push(localityId); }
  if (categoryId) { where.push(`EXISTS (SELECT 1 FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=lt.taxonomy_node_id WHERE lt.listing_id=l.id AND tc.ancestor_id=?)`); values.push(categoryId); }
  if (mechanic) { where.push("p.mechanic=?"); values.push(mechanic); }
  if (query) {
    for (const term of query.split(/\s+/).filter(Boolean).slice(0, 6)) {
      const like = `%${term}%`;
      where.push(`(b.name LIKE ? OR b.display_name LIKE ? OR p.name LIKE ? OR p.description LIKE ?)`);
      values.push(like, like, like, like);
    }
  }
  const from = `FROM tags_loyalty_programs p
    INNER JOIN tags_business_addons ba ON ba.business_id=p.business_id AND ba.addon_code='loyalty'
    INNER JOIN tags_businesses b ON b.id=p.business_id
    INNER JOIN tags_directory_listings l ON l.business_id=p.business_id
    INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id`;
  const [programs] = await db.execute(
    `SELECT p.id,p.name,p.description,p.mechanic,p.stamp_target,p.visit_target,p.points_currency,p.points_per_currency,
            l.id AS listing_id,sl.slug,COALESCE(NULLIF(b.display_name,''),b.name) AS business_name,b.whatsapp,b.phone,
            COALESCE(NULLIF(b.logo_url,''),(SELECT m.url FROM tags_directory_media m WHERE m.listing_id=l.id AND m.is_active=1 ORDER BY FIELD(m.media_type,'logo','cover','gallery'),m.sort_order,m.id LIMIT 1)) AS logo_url,
            (SELECT gp.name FROM tags_directory_listing_places glp INNER JOIN tags_geo_places gp ON gp.id=glp.place_id WHERE glp.listing_id=l.id AND glp.relation_type='location' ORDER BY glp.is_primary DESC,glp.place_id LIMIT 1) AS locality_name,
            (SELECT n.name FROM tags_directory_listing_taxonomy lt INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE lt.listing_id=l.id ORDER BY n.depth DESC,n.name LIMIT 1) AS category_name,
            (SELECT COUNT(*) FROM tags_loyalty_rewards r WHERE r.program_id=p.id AND r.status='active' AND (r.valid_from IS NULL OR r.valid_from<=NOW()) AND (r.valid_until IS NULL OR r.valid_until>=NOW())) AS reward_count
       ${from} WHERE ${where.join(" AND ")}
       ORDER BY business_name,p.name LIMIT 20 OFFSET ${(page - 1) * 20}`,
    values
  );
  const [countRows] = await db.execute(`SELECT COUNT(DISTINCT p.id) total ${from} WHERE ${where.join(" AND ")}`, values);
  const [localities] = await db.execute(`SELECT DISTINCT gp.id,gp.name ${from} INNER JOIN tags_directory_listing_places lp ON lp.listing_id=l.id AND lp.relation_type='location' INNER JOIN tags_geo_places gp ON gp.id=lp.place_id WHERE sl.site_id=? AND sl.publication_status='published' AND l.status='published' AND p.status='active' AND ba.status='active' ORDER BY gp.name`, [site.id]);
  const [categories] = await db.execute(`SELECT DISTINCT n.id,n.name ${from} INNER JOIN tags_directory_listing_taxonomy lt ON lt.listing_id=l.id INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lt.taxonomy_node_id AND n.is_active=1 WHERE sl.site_id=? AND sl.publication_status='published' AND l.status='published' AND p.status='active' AND ba.status='active' ORDER BY n.name`, [site.id]);
  const total = Number(countRows[0]?.total || 0);
  return { site, programs, localities, categories, filters: { query, localityId, categoryId, mechanic, page }, pagination: { total, totalPages: Math.max(1, Math.ceil(total / 20)) } };
}
