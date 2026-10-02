import crypto from "node:crypto";
import { db } from "../../../lib/tags-db.js";

const REQUIRED_TABLES = ["tags_directory_point_types", "tags_directory_points", "tags_directory_point_photos"];
const POINT_STATUSES = new Set(["planned", "authorized", "installed", "maintenance", "retired"]);
const PERMISSION_STATUSES = new Set(["pending", "authorized", "denied", "revoked"]);

const clean = (value, max = 5000) => String(value ?? "").trim().slice(0, max);
const nullable = value => clean(value) || null;
const boolean = value => value === true || value === 1 || value === "1";
const actorId = access => Number(access?.session?.id || 0) || null;

function slug(value) {
  return clean(value, 100).toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function color(value) {
  const normalized = clean(value, 7);
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : "#ef7d22";
}

function physicalQrCode(value) {
  const normalized = clean(value, 20).toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{3,20}$/.test(normalized)) {
    throw Object.assign(new Error("El código del QR debe tener entre 3 y 20 letras o números, sin espacios"), { status: 400 });
  }
  return normalized;
}

function safeUrl(value, required = false) {
  const raw = clean(value, 2000);
  if (!raw && !required) return null;
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    return url.toString();
  } catch {
    throw Object.assign(new Error("La URL de destino debe comenzar con http:// o https://"), { status: 400 });
  }
}

function coordinate(value, min, max, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || number === 0) throw Object.assign(new Error(`${label} no válida`), { status: 400 });
  return Number(number.toFixed(7));
}

function destinationWithQr(destination, qrCode) {
  const url = new URL(destination);
  url.searchParams.delete("punto");
  url.searchParams.set("qr", qrCode);
  return url.toString();
}

async function digitalProductId(connection) {
  const [rows] = await connection.query(
    `SELECT p.id FROM tags_products p
     INNER JOIN tags_qr_types qt ON qt.id=p.qr_type_id AND qt.code='digital'
     LEFT JOIN tags_supports s ON s.id=p.support_id
     WHERE p.is_digital=1
     ORDER BY (LOWER(COALESCE(s.name,''))='qr digital') DESC,p.id
     LIMIT 1`
  );
  if (!rows[0]) throw new Error("No existe un producto QR Digital compatible");
  return Number(rows[0].id);
}

async function resolvePhysicalQr(connection, { code, type, baseDestination, pointId = 0 }) {
  const normalizedDestination = safeUrl(baseDestination, true);
  const destination = destinationWithQr(normalizedDestination, code);
  const [rows] = await connection.query("SELECT id FROM tags_qr_codes WHERE code=? LIMIT 1 FOR UPDATE", [code]);
  let qrCodeId = Number(rows[0]?.id || 0);
  if (qrCodeId) {
    const [assignments] = await connection.query(
      `SELECT p.id,p.point_number,p.point_type_id,COALESCE(p.destination_url,t.default_destination_url) base_destination
       FROM tags_directory_points p
       INNER JOIN tags_directory_point_types t ON t.id=p.point_type_id
       WHERE p.qr_code_id=? AND p.id<>? AND p.installation_status<>'retired'`,
      [qrCodeId, Number(pointId || 0)]
    );
    const incompatible = assignments.find(item => Number(item.point_type_id) !== Number(type.id) || safeUrl(item.base_destination, true) !== normalizedDestination);
    if (incompatible) {
      throw Object.assign(new Error(`El QR ${code} ya se usa con otro tipo o destino. Un QR compartido debe abrir siempre el mismo contenido.`), { status: 409 });
    }
  } else {
    const productId = await digitalProductId(connection);
    const [result] = await connection.query(
      `INSERT INTO tags_qr_codes (business_id,code,label,is_active,value,final_url,status,total_clicks,tracking_enabled,browser_geolocation_enabled,product_id,has_qr_page,created_at)
       VALUES (?,?,?,1,?,?,'active',0,1,0,?,0,NOW())`,
      [type.owner_business_id || null,code,`${type.name} · QR ${code}`,destination.slice(0,255),destination,productId]
    );
    qrCodeId = Number(result.insertId);
  }
  await connection.query(
    "UPDATE tags_qr_codes SET business_id=?,label=?,value=?,final_url=?,status='active',is_active=1,stop_message=NULL WHERE id=?",
    [type.owner_business_id || null,`${type.name} · QR ${code}`,destination.slice(0,255),destination,qrCodeId]
  );
  return qrCodeId;
}

async function deactivateQrWhenUnused(connection, qrCodeId, message) {
  if (!qrCodeId) return;
  const [rows] = await connection.query("SELECT COUNT(*) active_points FROM tags_directory_points WHERE qr_code_id=? AND installation_status<>'retired'", [qrCodeId]);
  if (Number(rows[0]?.active_points || 0) === 0) {
    await connection.query("UPDATE tags_qr_codes SET status='stopped',is_active=0,stop_message=? WHERE id=?", [message,qrCodeId]);
  }
}

async function validateSharedQrPointSuffix(connection, qrCodeId, pointNumber, pointId = 0) {
  const [assigned] = await connection.query(
    `SELECT id,point_number FROM tags_directory_points
     WHERE qr_code_id=? AND id<>? AND installation_status<>'retired'`,
    [qrCodeId,Number(pointId || 0)]
  );
  if (!assigned.length) return;
  const suffix = String(pointNumber || "").match(/(\d{3})$/)?.[1];
  if (!suffix) throw Object.assign(new Error("Los puntos que comparten un QR deben terminar en tres números impresos, por ejemplo MUCHI-001"),{ status:400 });
  for (const item of assigned) {
    const assignedSuffix = String(item.point_number || "").match(/(\d{3})$/)?.[1];
    if (!assignedSuffix) throw Object.assign(new Error(`El punto ${item.point_number} debe terminar en tres números antes de compartir su QR`),{ status:409 });
    if (assignedSuffix === suffix) throw Object.assign(new Error(`Ya existe otro punto de este QR identificado con ${suffix}`),{ status:409 });
  }
}

export async function ensureDirectoryPointsSchema(connection = db) {
  const [rows] = await connection.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?)", [REQUIRED_TABLES]);
  const present = new Set(rows.map(item => item.name));
  const missing = REQUIRED_TABLES.filter(name => !present.has(name));
  if (missing.length) throw Object.assign(new Error("Falta ejecutar la migración 2026-09-28-tags-directory-points.sql"), { status: 409, missingTables: missing });
}

export async function listDirectoryPointAdminData(siteId = 0) {
  await ensureDirectoryPointsSchema();
  const [sites] = await db.query("SELECT id,code,name,primary_host,brand_config FROM tags_directory_sites WHERE is_active=1 ORDER BY name");
  const selectedSiteId = Number(siteId || sites[0]?.id || 0);
  const site = sites.find(item => Number(item.id) === selectedSiteId);
  if (!site) throw Object.assign(new Error("Directorio no encontrado"), { status: 404 });
  const [[types], [points], [places], [businesses], [statsRows]] = await Promise.all([
    db.query(
      `SELECT t.*,b.display_name owner_display_name,b.name owner_name,
              COALESCE(stats.point_count,0) point_count,
              COALESCE(stats.installed_count,0) installed_count
       FROM tags_directory_point_types t
       LEFT JOIN tags_businesses b ON b.id=t.owner_business_id
       LEFT JOIN (
         SELECT point_type_id,COUNT(*) point_count,SUM(installation_status='installed') installed_count
         FROM tags_directory_points GROUP BY point_type_id
       ) stats ON stats.point_type_id=t.id
       WHERE t.site_id=?
       ORDER BY t.sort_order,t.name`,
      [selectedSiteId]
    ),
    db.query(
      `SELECT p.*,t.name type_name,t.code type_code,t.color_hex,t.marker_icon_url,t.number_prefix,
              COALESCE(NULLIF(b.display_name,''),b.name,p.host_name) host_display_name,
              q.code qr_code,q.total_clicks,q.last_click_at,q.status qr_status,
              COALESCE(qr_usage.point_count,1) qr_point_count,
              COALESCE(stats.scan_count,0) scan_count,
              COALESCE(stats.visitor_count,0) visitor_count,
              COALESCE(stats.unique_scan_count,0) unique_scan_count,
              COALESCE(stats.scans_today,0) scans_today,
              COALESCE(stats.scans_30_days,0) scans_30_days
       FROM tags_directory_points p
       INNER JOIN tags_directory_point_types t ON t.id=p.point_type_id
       LEFT JOIN tags_businesses b ON b.id=p.host_business_id
       LEFT JOIN tags_qr_codes q ON q.id=p.qr_code_id
       LEFT JOIN (
         SELECT qr_code_id,COUNT(*) point_count
         FROM tags_directory_points
         WHERE qr_code_id IS NOT NULL AND installation_status<>'retired'
         GROUP BY qr_code_id
       ) qr_usage ON qr_usage.qr_code_id=p.qr_code_id
       LEFT JOIN (
         SELECT qr_code_id,COUNT(*) scan_count,COUNT(DISTINCT NULLIF(visitor_id,'')) visitor_count,
                COALESCE(SUM(is_unique),0) unique_scan_count,
                COALESCE(SUM(created_at>=CURRENT_DATE()),0) scans_today,
                COALESCE(SUM(created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)),0) scans_30_days
         FROM tags_clicks GROUP BY qr_code_id
       ) stats ON stats.qr_code_id=q.id
       WHERE p.site_id=?
       ORDER BY t.sort_order,p.point_number,p.id`,
      [selectedSiteId]
    ),
    db.query("SELECT id,parent_id,place_type,name,latitude,longitude FROM tags_geo_places WHERE is_active=1 AND place_type IN ('locality','neighborhood') ORDER BY name"),
    db.query("SELECT id,COALESCE(NULLIF(display_name,''),name) name,email,phone,whatsapp,address FROM tags_businesses WHERE COALESCE(role,'client')<>'admin' ORDER BY COALESCE(NULLIF(display_name,''),name),id"),
    db.query(
      `SELECT COUNT(c.id) scan_count,COUNT(DISTINCT NULLIF(c.visitor_id,'')) visitor_count,
              COALESCE(SUM(c.created_at>=CURRENT_DATE()),0) scans_today,
              COALESCE(SUM(c.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)),0) scans_30_days
       FROM (
         SELECT DISTINCT qr_code_id
         FROM tags_directory_points
         WHERE site_id=? AND qr_code_id IS NOT NULL
       ) p
       LEFT JOIN tags_clicks c ON c.qr_code_id=p.qr_code_id`,
      [selectedSiteId]
    ),
  ]);
  return { sites, site, types, points, places, businesses, stats: statsRows[0] || {}, actorId: null };
}

export async function saveDirectoryPointType({ body, access }) {
  await ensureDirectoryPointsSchema();
  const id = Number(body?.id || 0), siteId = Number(body?.siteId || 0), name = clean(body?.name, 190), code = slug(body?.code || name);
  if (!siteId || !name || !code) throw Object.assign(new Error("Directorio, nombre y código son obligatorios"), { status: 400 });
  const values = {
    ownerBusinessId: Number(body?.ownerBusinessId || 0) || null,
    description: nullable(body?.description),
    numberPrefix: clean(body?.numberPrefix, 30).toUpperCase() || null,
    colorHex: color(body?.colorHex),
    markerIconUrl: nullable(body?.markerIconUrl),
    defaultDestinationUrl: safeUrl(body?.defaultDestinationUrl, true),
    isPublic: body?.isPublic === false ? 0 : 1,
    isActive: body?.isActive === false ? 0 : 1,
    sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
  };
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (id) {
      const [result] = await connection.query(
        `UPDATE tags_directory_point_types SET owner_business_id=?,code=?,name=?,description=?,number_prefix=?,color_hex=?,marker_icon_url=?,default_destination_url=?,is_public=?,is_active=?,sort_order=? WHERE id=? AND site_id=?`,
        [values.ownerBusinessId,code,name,values.description,values.numberPrefix,values.colorHex,values.markerIconUrl,values.defaultDestinationUrl,values.isPublic,values.isActive,values.sortOrder,id,siteId]
      );
      if (!result.affectedRows) throw Object.assign(new Error("Tipo de punto no encontrado"), { status: 404 });
      const [points] = await connection.query(
        `SELECT DISTINCT p.qr_code_id,p.destination_url,q.code qr_code
         FROM tags_directory_points p
         INNER JOIN tags_qr_codes q ON q.id=p.qr_code_id
         WHERE p.point_type_id=?`,
        [id]
      );
      for (const point of points) {
        const destination = destinationWithQr(point.destination_url || values.defaultDestinationUrl, point.qr_code);
        await connection.query("UPDATE tags_qr_codes SET business_id=?,label=?,final_url=?,value=? WHERE id=?", [values.ownerBusinessId,`${name} · QR ${point.qr_code}`,destination,destination.slice(0,255),point.qr_code_id]);
      }
      await connection.commit();
      return { ok: true, id };
    }
    const [result] = await connection.query(
      `INSERT INTO tags_directory_point_types (site_id,owner_business_id,code,name,description,number_prefix,color_hex,marker_icon_url,default_destination_url,is_public,is_active,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [siteId,values.ownerBusinessId,code,name,values.description,values.numberPrefix,values.colorHex,values.markerIconUrl,values.defaultDestinationUrl,values.isPublic,values.isActive,values.sortOrder]
    );
    await connection.commit();
    return { ok: true, id: Number(result.insertId), actorId: actorId(access) };
  } catch (error) { await connection.rollback();throw error; } finally { connection.release(); }
}

function pointValues(body) {
  const installationStatus = POINT_STATUSES.has(clean(body?.installationStatus)) ? clean(body.installationStatus) : "planned";
  const permissionStatus = PERMISSION_STATUSES.has(clean(body?.permissionStatus)) ? clean(body.permissionStatus) : "pending";
  const photoUrl = body?.primaryPhotoUrl ? safeUrl(body.primaryPhotoUrl, true) : null;
  return {
    siteId: Number(body?.siteId || 0),
    typeId: Number(body?.pointTypeId || 0),
    qrCode: physicalQrCode(body?.qrCode),
    pointNumber: clean(body?.pointNumber, 80).toUpperCase(),
    displayName: nullable(body?.displayName),
    hostBusinessId: Number(body?.hostBusinessId || 0) || null,
    hostName: nullable(body?.hostName),
    hostContactName: nullable(body?.hostContactName),
    hostPhone: nullable(body?.hostPhone),
    permissionStatus,
    installationStatus,
    localityPlaceId: Number(body?.localityPlaceId || 0) || null,
    localityName: nullable(body?.localityName),
    address: nullable(body?.address),
    latitude: coordinate(body?.latitude, -90, 90, "Latitud"),
    longitude: coordinate(body?.longitude, -180, 180, "Longitud"),
    accuracy: body?.locationAccuracyM === "" || body?.locationAccuracyM == null ? null : Math.max(0, Number(body.locationAccuracyM) || 0),
    destinationUrl: body?.destinationUrl ? safeUrl(body.destinationUrl, true) : null,
    photoUrl,
    photoStoragePath: nullable(body?.primaryPhotoStoragePath),
    notes: nullable(body?.notes),
    isPublic: body?.isPublic === false ? 0 : 1,
  };
}

async function lockedType(connection, siteId, typeId) {
  const [rows] = await connection.query("SELECT * FROM tags_directory_point_types WHERE id=? AND site_id=? LIMIT 1 FOR UPDATE", [typeId,siteId]);
  if (!rows[0]) throw Object.assign(new Error("Tipo de punto no encontrado"), { status: 404 });
  return rows[0];
}

export async function saveDirectoryPoint({ body, access }) {
  await ensureDirectoryPointsSchema();
  const id = Number(body?.id || 0), values = pointValues(body);
  if (!values.siteId || !values.typeId || !values.pointNumber || !values.photoUrl) throw Object.assign(new Error("Tipo, número y fotografía son obligatorios"), { status: 400 });
  if (!values.hostBusinessId && !values.hostName) throw Object.assign(new Error("Seleccioná o escribí el comercio anfitrión"), { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const type = await lockedType(connection, values.siteId, values.typeId);
    const destination = values.destinationUrl || type.default_destination_url;
    if (id) {
      const [rows] = await connection.query("SELECT * FROM tags_directory_points WHERE id=? AND site_id=? LIMIT 1 FOR UPDATE", [id,values.siteId]);
      const current = rows[0];
      if (!current) throw Object.assign(new Error("Punto no encontrado"), { status: 404 });
      const nowAuthorized = values.permissionStatus === "authorized" && current.permission_status !== "authorized";
      const nowInstalled = values.installationStatus === "installed" && current.installation_status !== "installed";
      const nowRetired = values.installationStatus === "retired" && current.installation_status !== "retired";
      const qrCodeId = await resolvePhysicalQr(connection, { code: values.qrCode, type, baseDestination: destination, pointId: id });
      await validateSharedQrPointSuffix(connection,qrCodeId,values.pointNumber,id);
      await connection.query(
        `UPDATE tags_directory_points SET point_type_id=?,qr_code_id=?,point_number=?,display_name=?,host_business_id=?,host_name=?,host_contact_name=?,host_phone=?,permission_status=?,permission_requested_at=COALESCE(permission_requested_at,IF(?='pending',NOW(),NULL)),permission_granted_at=IF(?=1,NOW(),permission_granted_at),installation_status=?,installed_at=IF(?=1,NOW(),installed_at),retired_at=IF(?=1,NOW(),IF(?<>'retired',NULL,retired_at)),locality_place_id=?,locality_name=?,address=?,latitude=?,longitude=?,location_accuracy_m=?,destination_url=?,primary_photo_url=?,primary_photo_storage_path=?,notes=?,is_public=?,updated_by_id=? WHERE id=?`,
        [values.typeId,qrCodeId,values.pointNumber,values.displayName,values.hostBusinessId,values.hostName,values.hostContactName,values.hostPhone,values.permissionStatus,values.permissionStatus,nowAuthorized?1:0,values.installationStatus,nowInstalled?1:0,nowRetired?1:0,values.installationStatus,values.localityPlaceId,values.localityName,values.address,values.latitude,values.longitude,values.accuracy,values.destinationUrl,values.photoUrl,values.photoStoragePath,values.notes,values.isPublic,actorId(access),id]
      );
      await connection.query("DELETE FROM tags_directory_point_photos WHERE point_id=? AND is_primary=1", [id]);
      await connection.query("INSERT INTO tags_directory_point_photos (point_id,image_url,storage_path,width,height,sort_order,is_primary) VALUES (?,?,?,1200,1200,0,1)", [id,values.photoUrl,values.photoStoragePath]);
      if (current.qr_code_id && Number(current.qr_code_id) !== qrCodeId) await deactivateQrWhenUnused(connection,current.qr_code_id,"Este QR ya no tiene puntos físicos activos asociados.");
      if (values.installationStatus === "retired") await deactivateQrWhenUnused(connection,qrCodeId,"Este QR ya no tiene puntos físicos activos asociados.");
      await connection.commit();
      return { ok: true, id, qrCodeId, qrCode: values.qrCode, oldPhotoStoragePath: current.primary_photo_storage_path || null };
    }
    const publicKey = crypto.randomBytes(18).toString("base64url");
    const qrCodeId = await resolvePhysicalQr(connection, { code: values.qrCode, type, baseDestination: destination });
    await validateSharedQrPointSuffix(connection,qrCodeId,values.pointNumber);
    const [pointResult] = await connection.query(
      `INSERT INTO tags_directory_points (site_id,point_type_id,qr_code_id,public_key,point_number,display_name,host_business_id,host_name,host_contact_name,host_phone,permission_status,permission_requested_at,permission_granted_at,installation_status,installed_at,locality_place_id,locality_name,address,latitude,longitude,location_accuracy_m,destination_url,primary_photo_url,primary_photo_storage_path,notes,is_public,created_by_id,updated_by_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,IF(?='pending',NOW(),NULL),IF(?='authorized',NOW(),NULL),?,IF(?='installed',NOW(),NULL),?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [values.siteId,values.typeId,qrCodeId,publicKey,values.pointNumber,values.displayName,values.hostBusinessId,values.hostName,values.hostContactName,values.hostPhone,values.permissionStatus,values.permissionStatus,values.permissionStatus,values.installationStatus,values.installationStatus,values.localityPlaceId,values.localityName,values.address,values.latitude,values.longitude,values.accuracy,values.destinationUrl,values.photoUrl,values.photoStoragePath,values.notes,values.isPublic,actorId(access),actorId(access)]
    );
    await connection.query("INSERT INTO tags_directory_point_photos (point_id,image_url,storage_path,width,height,sort_order,is_primary) VALUES (?,?,?,1200,1200,0,1)", [pointResult.insertId,values.photoUrl,values.photoStoragePath]);
    if (values.installationStatus === "retired") await deactivateQrWhenUnused(connection,qrCodeId,"Este QR ya no tiene puntos físicos activos asociados.");
    await connection.commit();
    return { ok: true, id: Number(pointResult.insertId), qrCodeId, qrCode: values.qrCode };
  } catch (error) {
    await connection.rollback();
    if (error?.code === "ER_DUP_ENTRY" && String(error?.sqlMessage || "").includes("uq_directory_point_qr")) {
      throw Object.assign(new Error("La base todavía no permite compartir QRs. Ejecutá la migración 2026-09-28-tags-directory-points-shared-qr.sql"), { status: 409 });
    }
    if (error?.code === "ER_DUP_ENTRY") throw Object.assign(new Error("Ya existe un punto de ese tipo con el mismo número"), { status: 409 });
    throw error;
  } finally { connection.release(); }
}

export async function retireDirectoryPoint({ id, access }) {
  await ensureDirectoryPointsSchema();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT id,qr_code_id FROM tags_directory_points WHERE id=? LIMIT 1 FOR UPDATE", [id]);
    if (!rows[0]) throw Object.assign(new Error("Punto no encontrado"), { status: 404 });
    await connection.query("UPDATE tags_directory_points SET installation_status='retired',retired_at=NOW(),is_public=0,updated_by_id=? WHERE id=?", [actorId(access),id]);
    if (rows[0].qr_code_id) await deactivateQrWhenUnused(connection,rows[0].qr_code_id,"Este QR ya no tiene puntos físicos activos asociados.");
    await connection.commit();
    return { ok: true };
  } catch (error) { await connection.rollback();throw error; } finally { connection.release(); }
}

export async function getPublicDirectoryPoints(siteCode) {
  await ensureDirectoryPointsSchema();
  const [sites] = await db.query("SELECT id,code,name,primary_host,brand_config,seo_config FROM tags_directory_sites WHERE code=? AND is_active=1 LIMIT 1", [clean(siteCode,80)]);
  const site = sites[0];
  if (!site) return null;
  const [[types], [points]] = await Promise.all([
    db.query("SELECT id,code,name,description,color_hex,marker_icon_url FROM tags_directory_point_types WHERE site_id=? AND is_active=1 AND is_public=1 ORDER BY sort_order,name", [site.id]),
    db.query(
      `SELECT p.id,p.public_key,p.point_number,p.display_name,p.host_name,p.address,p.locality_name,p.latitude,p.longitude,p.primary_photo_url,
              t.id point_type_id,t.code type_code,t.name type_name,t.color_hex,t.marker_icon_url,
              COALESCE(NULLIF(b.display_name,''),b.name,p.host_name) host_display_name,
              q.code qr_code
       FROM tags_directory_points p
       INNER JOIN tags_directory_point_types t ON t.id=p.point_type_id AND t.is_active=1 AND t.is_public=1
       LEFT JOIN tags_businesses b ON b.id=p.host_business_id
       LEFT JOIN tags_qr_codes q ON q.id=p.qr_code_id
       WHERE p.site_id=? AND p.installation_status='installed' AND p.is_public=1
       ORDER BY t.sort_order,p.point_number`,
      [site.id]
    ),
  ]);
  return { site, types, points };
}
