// =====================================
// MODULE: Tags Fidelizacion
// Descripcion: Identidad global de usuario y miembro Loyalty.
// =====================================

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";
import {
    assertEmail,
    normalizeName
} from "./loyaltyConstants";

function createMemberCode() {
    return `MEM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

export function hashMemberToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function createMemberQrToken() {
    return crypto.randomBytes(32).toString("hex");
}

export async function createOrGetUser(input, connection = db) {
    const email = assertEmail(input.email);
    const firstName = normalizeName(input.firstName || input.first_name);
    const lastName = normalizeName(input.lastName || input.last_name);

    if (!firstName || !lastName) {
        throw new Error("Nombre y apellido son obligatorios");
    }

    await connection.query(
        `INSERT INTO tags_users
            (email,email_normalized,first_name,last_name,display_name,phone,whatsapp,source)
         VALUES (?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
            first_name=COALESCE(NULLIF(VALUES(first_name),''),first_name),
            last_name=COALESCE(NULLIF(VALUES(last_name),''),last_name),
            display_name=COALESCE(NULLIF(VALUES(display_name),''),display_name),
            phone=COALESCE(NULLIF(VALUES(phone),''),phone),
            whatsapp=COALESCE(NULLIF(VALUES(whatsapp),''),whatsapp),
            updated_at=NOW()`,
        [
            email,
            email,
            firstName,
            lastName,
            normalizeName(input.displayName || input.display_name) || `${firstName} ${lastName}`,
            String(input.phone || "").trim() || null,
            String(input.whatsapp || "").trim() || null,
            String(input.source || "").trim() || null
        ]
    );

    const [rows] = await connection.query(
        `SELECT * FROM tags_users WHERE email_normalized=? LIMIT 1`,
        [email]
    );

    return rows[0] || null;
}

export async function ensureLoyaltyMember(userId, connection = db) {
    const [existing] = await connection.query(
        `SELECT * FROM tags_loyalty_members WHERE user_id=? LIMIT 1`,
        [userId]
    );
    if (existing[0]) return existing[0];

    const rawToken = createMemberQrToken();
    await connection.query(
        `INSERT INTO tags_loyalty_members
            (user_id,member_code,status,qr_token_hash)
         VALUES (?,?, 'active',?)`,
        [userId, createMemberCode(), hashMemberToken(rawToken)]
    );

    const [rows] = await connection.query(
        `SELECT * FROM tags_loyalty_members WHERE user_id=? LIMIT 1`,
        [userId]
    );

    return {
        ...(rows[0] || {}),
        qrToken: rawToken
    };
}

export async function rotateMemberQrToken(userId, connection = db) {
    const rawToken = createMemberQrToken();
    const [result] = await connection.query(
        `UPDATE tags_loyalty_members
            SET qr_token_hash=?,updated_at=NOW()
          WHERE user_id=? AND status='active'`,
        [hashMemberToken(rawToken), userId]
    );
    if (!result.affectedRows) return null;
    const [rows] = await connection.query(`SELECT * FROM tags_loyalty_members WHERE user_id=? LIMIT 1`, [userId]);
    return rows[0] ? { ...rows[0], qrToken: rawToken } : null;
}

export async function getMemberByQrToken(token, connection = db) {
    const value = String(token || "").trim();
    if (!value) return null;
    const [rows] = await connection.query(
        `SELECT lm.*,u.id AS user_id,u.email,u.first_name,u.last_name,u.display_name
           FROM tags_loyalty_members lm
           INNER JOIN tags_users u ON u.id=lm.user_id
          WHERE lm.qr_token_hash=? AND lm.status='active' AND u.status='active'
          LIMIT 1`,
        [hashMemberToken(value)]
    );
    return rows[0] || null;
}

export async function getMemberByCode(memberCode, connection = db) {
    const code = String(memberCode || "").trim();
    if (!code) return null;
    const [rows] = await connection.query(
        `SELECT lm.*,u.id AS user_id,u.email,u.first_name,u.last_name,u.display_name
           FROM tags_loyalty_members lm
           INNER JOIN tags_users u ON u.id=lm.user_id
          WHERE lm.member_code=? AND lm.status='active' AND u.status='active'
          LIMIT 1`,
        [code]
    );
    return rows[0] || null;
}

export async function getUserByEmail(email, connection = db) {
    const normalized = assertEmail(email);
    const [rows] = await connection.query(
        `SELECT * FROM tags_users WHERE email_normalized=? LIMIT 1`,
        [normalized]
    );
    return rows[0] || null;
}
