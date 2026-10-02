import { db } from "../../../lib/tags-db.js";

const SCAN_TABLE = "tags_directory_point_scans";
const MATCH_RADIUS_METERS = 20;
const MAX_GPS_ACCURACY_METERS = 50;

function isMissingScanTable(error) {
  return error?.code === "ER_NO_SUCH_TABLE" || String(error?.message || "").includes(SCAN_TABLE);
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRadians = value => value * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

async function candidatesForQr(connection, qrCodeId) {
  const [rows] = await connection.query(
    `SELECT p.id,p.site_id,p.point_number,p.display_name,p.host_name,p.locality_name,
            p.latitude,p.longitude,t.name type_name,t.color_hex,t.marker_icon_url
     FROM tags_directory_points p
     INNER JOIN tags_directory_point_types t ON t.id=p.point_type_id
     WHERE p.qr_code_id=? AND p.installation_status='installed'
     ORDER BY p.point_number,p.id`,
    [qrCodeId]
  );
  return rows;
}

export async function startDirectoryPointScan({ clickId, qrCodeId }) {
  try {
    const candidates = await candidatesForQr(db, qrCodeId);
    if (!candidates.length) return { available: true, mode: "none", candidateCount: 0 };
    const point = candidates.length === 1 ? candidates[0] : null;
    await db.query(
      `INSERT INTO ${SCAN_TABLE}
         (click_id,site_id,qr_code_id,point_id,attribution_method,attribution_status,resolved_at)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE site_id=VALUES(site_id),qr_code_id=VALUES(qr_code_id)`,
      [clickId,candidates[0].site_id,qrCodeId,point?.id || null,point ? "unique_qr" : "unattributed",point ? "matched" : "pending",point ? new Date() : null]
    );
    return { available: true, mode: point ? "matched" : "shared", candidateCount: candidates.length };
  } catch (error) {
    if (isMissingScanTable(error)) return { available: false, mode: "none", candidateCount: 0 };
    console.error("DIRECTORY POINT SCAN START ERROR", error);
    return { available: false, mode: "none", candidateCount: 0 };
  }
}

export async function getDirectoryPointScanContext({ clickId, visitorId }) {
  try {
    const [[scan]] = await db.query(
      `SELECT s.*,c.visitor_id,q.final_url,q.destination_url
       FROM ${SCAN_TABLE} s
       INNER JOIN tags_clicks c ON c.id=s.click_id
       INNER JOIN tags_qr_codes q ON q.id=s.qr_code_id
       WHERE s.click_id=? AND c.created_at>=NOW()-INTERVAL 15 MINUTE
       LIMIT 1`,
      [clickId]
    );
    if (!scan || (visitorId && scan.visitor_id !== visitorId)) return null;
    const candidates = await candidatesForQr(db, scan.qr_code_id);
    return {
      scan,
      candidates,
      destinationUrl: scan.final_url || scan.destination_url || "/",
      shared: candidates.length > 1,
      typeName: candidates[0]?.type_name || "punto QR",
      colorHex: candidates[0]?.color_hex || "#2f7958",
      markerIconUrl: candidates[0]?.marker_icon_url || null,
    };
  } catch (error) {
    if (isMissingScanTable(error)) return null;
    throw error;
  }
}

async function markUnmatched(clickId, status, values = {}) {
  await db.query(
    `UPDATE ${SCAN_TABLE}
     SET point_id=NULL,attribution_method='unattributed',attribution_status=?,distance_m=?,location_accuracy_m=?,printed_suffix=?,resolved_at=NOW()
     WHERE click_id=?`,
    [status,values.distanceM ?? null,values.accuracy ?? null,values.suffix ?? null,clickId]
  );
}

export async function resolveDirectoryPointScan({ context, latitude, longitude, accuracy, printedSuffix, declined = false }) {
  const { scan, candidates } = context;
  if (declined) {
    await markUnmatched(scan.click_id, "declined");
    return { status: "declined", matched: false };
  }

  const suffix = String(printedSuffix || "").replace(/\D/g, "").slice(-3).padStart(3, "0");
  if (printedSuffix != null && String(printedSuffix).trim() !== "") {
    const matches = candidates.filter(item => String(item.point_number || "").match(/(\d{3})$/)?.[1] === suffix);
    if (matches.length === 1) {
      await db.query(
        `UPDATE ${SCAN_TABLE}
         SET point_id=?,attribution_method='printed_code',attribution_status='matched',printed_suffix=?,resolved_at=NOW()
         WHERE click_id=?`,
        [matches[0].id,suffix,scan.click_id]
      );
      return { status: "matched", matched: true, pointId: Number(matches[0].id), method: "printed_code" };
    }
    await markUnmatched(scan.click_id, matches.length > 1 ? "ambiguous" : "invalid_code", { suffix });
    return { status: matches.length > 1 ? "ambiguous" : "invalid_code", matched: false };
  }

  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
    await markUnmatched(scan.click_id, "unavailable");
    return { status: "unavailable", matched: false };
  }

  const gpsAccuracy = Number.isFinite(Number(accuracy)) ? Math.max(0, Number(accuracy)) : null;
  const ranked = candidates.map(point => ({
    point,
    distance: distanceMeters(Number(latitude),Number(longitude),Number(point.latitude),Number(point.longitude)),
  })).sort((a,b) => a.distance-b.distance);
  const insideRadius = ranked.filter(item => item.distance <= MATCH_RADIUS_METERS);
  if (gpsAccuracy != null && gpsAccuracy > MAX_GPS_ACCURACY_METERS) {
    await markUnmatched(scan.click_id, "unavailable", { distanceM: ranked[0]?.distance, accuracy: gpsAccuracy });
    return { status: "unavailable", matched: false, needsPrintedCode: true };
  }
  if (insideRadius.length !== 1) {
    const status = insideRadius.length > 1 ? "ambiguous" : "out_of_range";
    await markUnmatched(scan.click_id, status, { distanceM: ranked[0]?.distance, accuracy: gpsAccuracy });
    return { status, matched: false, needsPrintedCode: true };
  }

  const selected = insideRadius[0];
  await db.query(
    `UPDATE ${SCAN_TABLE}
     SET point_id=?,attribution_method='geolocation',attribution_status='matched',distance_m=?,location_accuracy_m=?,resolved_at=NOW()
     WHERE click_id=?`,
    [selected.point.id,selected.distance,gpsAccuracy,scan.click_id]
  );
  return { status: "matched", matched: true, pointId: Number(selected.point.id), method: "geolocation" };
}

export const directoryPointScanSettings = {
  matchRadiusMeters: MATCH_RADIUS_METERS,
  maxGpsAccuracyMeters: MAX_GPS_ACCURACY_METERS,
};

function dateValue(value, fallback) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function pointStatsDataset(filters) {
  const today = new Date();
  const endFallback = today.toISOString().slice(0,10);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate()-29);
  const from = dateValue(filters.from,startDate.toISOString().slice(0,10));
  const to = dateValue(filters.to,endFallback);
  const params = [Number(filters.siteId),from,to];
  const innerWhere = ["scope.site_id=?","c.created_at>=?","c.created_at<DATE_ADD(?,INTERVAL 1 DAY)"];
  if (Number(filters.typeId || 0)) { innerWhere.push("scope.point_type_id=?");params.push(Number(filters.typeId)); }
  const outerWhere = [];
  if (Number(filters.pointId || 0)) { outerWhere.push("scan.effective_point_id=?");params.push(Number(filters.pointId)); }
  if (Number(filters.hostBusinessId || 0)) { outerWhere.push("scan.host_business_id=?");params.push(Number(filters.hostBusinessId)); }
  if (filters.attribution === "identified") outerWhere.push("scan.effective_point_id IS NOT NULL");
  if (filters.attribution === "unidentified") outerWhere.push("scan.effective_point_id IS NULL");
  const sql = `
    SELECT * FROM (
      SELECT c.id click_id,c.qr_code_id,c.visitor_id,c.is_unique,c.device_type,c.os,c.browser,c.country,c.region,c.city,c.created_at,
             q.code qr_code,q.label qr_label,scope.point_type_id,scope.point_count,
             COALESCE(s.point_id,scope.single_point_id) effective_point_id,
             COALESCE(s.attribution_method,IF(scope.point_count=1,'unique_qr','unattributed')) attribution_method,
             COALESCE(s.attribution_status,IF(scope.point_count=1,'matched','pending')) attribution_status,
             s.distance_m,s.location_accuracy_m,
             p.point_number,p.display_name,p.host_business_id,p.host_name,p.locality_name point_locality,
             COALESCE(NULLIF(b.display_name,''),b.name,p.host_name) host_display_name,
             t.name type_name
      FROM tags_clicks c
      INNER JOIN (
        SELECT dp.site_id,dp.qr_code_id,MIN(dp.point_type_id) point_type_id,COUNT(*) point_count,
               IF(COUNT(*)=1,MIN(dp.id),NULL) single_point_id
        FROM tags_directory_points dp
        WHERE dp.qr_code_id IS NOT NULL AND dp.installation_status='installed'
        GROUP BY dp.site_id,dp.qr_code_id
      ) scope ON scope.qr_code_id=c.qr_code_id
      INNER JOIN tags_qr_codes q ON q.id=c.qr_code_id
      INNER JOIN tags_directory_point_types t ON t.id=scope.point_type_id
      LEFT JOIN ${SCAN_TABLE} s ON s.click_id=c.id
      LEFT JOIN tags_directory_points p ON p.id=COALESCE(s.point_id,scope.single_point_id)
      LEFT JOIN tags_businesses b ON b.id=p.host_business_id
      WHERE ${innerWhere.join(" AND ")}
    ) scan${outerWhere.length ? ` WHERE ${outerWhere.join(" AND ")}` : ""}`;
  return { sql,params,from,to };
}

export async function getDirectoryPointStats(filters) {
  if (!Number(filters.siteId || 0)) throw Object.assign(new Error("Directorio requerido"),{ status:400 });
  const { sql,params,from,to } = pointStatsDataset(filters);
  try {
    const queries = [
      db.query(`SELECT COUNT(*) total_scans,COUNT(DISTINCT NULLIF(visitor_id,'')) visitors,COALESCE(SUM(is_unique),0) unique_scans,COALESCE(SUM(effective_point_id IS NOT NULL),0) identified_scans,COALESCE(SUM(effective_point_id IS NULL),0) unidentified_scans FROM (${sql}) data`,params),
      db.query(`SELECT DATE(created_at) scan_date,COUNT(*) scans,COUNT(DISTINCT NULLIF(visitor_id,'')) visitors,COALESCE(SUM(effective_point_id IS NOT NULL),0) identified FROM (${sql}) data GROUP BY DATE(created_at) ORDER BY scan_date`,params),
      db.query(`SELECT effective_point_id point_id,point_number,display_name,host_display_name,point_locality,type_name,COUNT(*) scans,COUNT(DISTINCT NULLIF(visitor_id,'')) visitors,MAX(created_at) last_scan_at FROM (${sql}) data WHERE effective_point_id IS NOT NULL GROUP BY effective_point_id,point_number,display_name,host_display_name,point_locality,type_name ORDER BY scans DESC,last_scan_at DESC`,params),
      db.query(`SELECT host_business_id,host_display_name,COUNT(*) scans,COUNT(DISTINCT NULLIF(visitor_id,'')) visitors,COUNT(DISTINCT effective_point_id) points FROM (${sql}) data WHERE effective_point_id IS NOT NULL GROUP BY host_business_id,host_display_name ORDER BY scans DESC,host_display_name`,params),
      db.query(`SELECT qr_code_id,qr_code,qr_label,type_name,MAX(point_count) point_count,COUNT(*) scans,COUNT(DISTINCT NULLIF(visitor_id,'')) visitors,COALESCE(SUM(effective_point_id IS NOT NULL),0) identified FROM (${sql}) data GROUP BY qr_code_id,qr_code,qr_label,type_name ORDER BY scans DESC,qr_code`,params),
      db.query(`SELECT COALESCE(NULLIF(device_type,''),'Otro') label,COUNT(*) scans FROM (${sql}) data GROUP BY COALESCE(NULLIF(device_type,''),'Otro') ORDER BY scans DESC`,params),
      db.query(`SELECT COALESCE(NULLIF(city,''),'Sin identificar') city,COUNT(*) scans FROM (${sql}) data GROUP BY COALESCE(NULLIF(city,''),'Sin identificar') ORDER BY scans DESC LIMIT 12`,params),
      db.query(`SELECT click_id,created_at,qr_code,point_number,host_display_name,type_name,attribution_method,attribution_status,city,device_type FROM (${sql}) data ORDER BY created_at DESC LIMIT 50`,params),
    ];
    const results = await Promise.all(queries);
    return {
      from,to,
      summary: results[0][0][0] || {},
      timeline: results[1][0],
      points: results[2][0],
      clients: results[3][0],
      qrs: results[4][0],
      devices: results[5][0],
      cities: results[6][0],
      recent: results[7][0],
    };
  } catch (error) {
    if (isMissingScanTable(error)) throw Object.assign(new Error("Falta ejecutar la migración 2026-09-28-tags-directory-point-scan-attribution.sql"),{ status:409 });
    throw error;
  }
}
