import { INVENTORY_RELEASED_STATUSES } from "../lib/lodgingReservationRules";

const releasedStatusPlaceholders = INVENTORY_RELEASED_STATUSES.map(() => "?").join(",");

export async function lockGuestInventory(connection, { guestAppId, businessId }) {
    const [rows] = await connection.query(
        "SELECT id,settings_json,currency,timezone FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE",
        [guestAppId, businessId]
    );
    return rows[0] || null;
}

export async function lockActiveGuestUnit(connection, { guestAppId, unitId }) {
    const [rows] = await connection.query(
        "SELECT id,guest_app_id,code,name,capacity_adults,capacity_children FROM tags_guest_units WHERE id=? AND guest_app_id=? AND is_active=1 LIMIT 1 FOR UPDATE",
        [unitId, guestAppId]
    );
    return rows[0] || null;
}

export async function findBlockingStay(connection, { guestAppId, unitId, startsAt, endsAt, excludeStayId = 0 }) {
    const excludeSql = excludeStayId ? "AND id<>?" : "";
    const params = [guestAppId, unitId];
    if (excludeStayId) params.push(excludeStayId);
    params.push(...INVENTORY_RELEASED_STATUSES, endsAt, startsAt);

    const [rows] = await connection.query(
        `SELECT id,stay_code,status,starts_at,ends_at
           FROM tags_guest_stays
          WHERE guest_app_id=?
            AND unit_id=?
            ${excludeSql}
            AND status NOT IN (${releasedStatusPlaceholders})
            AND starts_at<?
            AND ends_at>?
          ORDER BY starts_at,id
          LIMIT 1
          FOR UPDATE`,
        params
    );
    return rows[0] || null;
}

export async function findBlockingUnitBlock(connection, { guestAppId, unitId, startsAt, endsAt, excludeBlockId = 0 }) {
    const excludeSql = excludeBlockId ? "AND id<>?" : "";
    const params = [guestAppId, unitId];
    if (excludeBlockId) params.push(excludeBlockId);
    params.push(endsAt, startsAt);
    const [rows] = await connection.query(
        `SELECT id,scope_type,unit_id,starts_on,ends_on,block_type,reason
           FROM tags_guest_unit_blocks
          WHERE guest_app_id=?
            AND status='active'
            AND (scope_type='property' OR unit_id=?)
            ${excludeSql}
            AND starts_on<?
            AND ends_on>?
          ORDER BY starts_on,id
          LIMIT 1
          FOR UPDATE`,
        params
    );
    return rows[0] || null;
}

export async function findStayConflictingWithBlock(connection, { guestAppId, unitId = 0, startsAt, endsAt }) {
    const unitSql = unitId ? "AND unit_id=?" : "";
    const params = [guestAppId];
    if (unitId) params.push(unitId);
    params.push(...INVENTORY_RELEASED_STATUSES, endsAt, startsAt);
    const [rows] = await connection.query(
        `SELECT id,stay_code,status,unit_id,starts_at,ends_at
           FROM tags_guest_stays
          WHERE guest_app_id=?
            ${unitSql}
            AND status NOT IN (${releasedStatusPlaceholders})
            AND starts_at<?
            AND ends_at>?
          ORDER BY starts_at,id
          LIMIT 1
          FOR UPDATE`,
        params
    );
    return rows[0] || null;
}
