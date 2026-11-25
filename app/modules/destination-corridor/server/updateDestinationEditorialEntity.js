import { db } from "@/app/lib/tags-db";
import { normalizeDirectoryDbValue } from "@/app/modules/directory/lib/normalizeDirectoryDbValue";

const EDITORIAL_STATUSES = new Set(["draft", "in_review", "observed"]);

function clean(value, maxLength) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function required(value, maxLength, label) {
  const text = clean(value, maxLength);
  if (!text) throw new DestinationEditorialError(`${label} es obligatorio.`, 400);
  return text;
}

function status(value) {
  const normalized = String(value || "").trim();
  if (!EDITORIAL_STATUSES.has(normalized)) {
    throw new DestinationEditorialError("El estado editorial no es válido.", 400);
  }
  return normalized;
}

function actorId(value) {
  const parsed = Number(value || 0);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export class DestinationEditorialError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "DestinationEditorialError";
    this.statusCode = statusCode;
  }
}

export async function updateDestinationEditorialEntity({ siteCode, entityType, entityId, values, userId }) {
  const id = Number(entityId || 0);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new DestinationEditorialError("El registro indicado no es válido.", 400);
  }
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new DestinationEditorialError("Los datos enviados no son válidos.", 400);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[site]] = await connection.execute(
      "SELECT id FROM tags_directory_sites WHERE code=? LIMIT 1 FOR UPDATE",
      [String(siteCode || "").trim().toLowerCase()]
    );
    if (!site) throw new DestinationEditorialError("El directorio Ruta 100 Córdoba no está configurado.", 404);

    let before;
    let after;

    if (entityType === "corridor") {
      [[before]] = await connection.execute(
        `SELECT id,code,slug,name,eyebrow,summary,description,distance_km,status,source_id,source_url,source_checked_at
           FROM tags_destination_corridors
          WHERE id=? AND site_id=? LIMIT 1 FOR UPDATE`,
        [id, site.id]
      );
      if (!before) throw new DestinationEditorialError("El corredor no existe en Ruta 100.", 404);

      const distance = Number(values.distanceKm);
      if (!Number.isFinite(distance) || distance <= 0 || distance > 9999999) {
        throw new DestinationEditorialError("La distancia debe ser un número mayor a cero.", 400);
      }
      await connection.execute(
        `UPDATE tags_destination_corridors
            SET name=?,eyebrow=?,summary=?,description=?,distance_km=?,status=?,updated_by_id=?,updated_at=NOW()
          WHERE id=? AND site_id=?`,
        [
          required(values.name, 190, "El nombre"),
          clean(values.eyebrow, 190),
          required(values.summary, 1000, "El resumen"),
          clean(values.description, 50000),
          distance,
          status(values.status),
          actorId(userId),
          id,
          site.id,
        ]
      );
      [[after]] = await connection.execute(
        `SELECT id,code,slug,name,eyebrow,summary,description,distance_km,status,source_id,source_url,source_checked_at
           FROM tags_destination_corridors WHERE id=? AND site_id=? LIMIT 1`,
        [id, site.id]
      );
    } else if (entityType === "experience") {
      [[before]] = await connection.execute(
        `SELECT id,code,slug,name,short_name,summary,description,sort_order,seo_title,seo_description,status,source_id,source_url,source_checked_at
           FROM tags_destination_experiences
          WHERE id=? AND site_id=? LIMIT 1 FOR UPDATE`,
        [id, site.id]
      );
      if (!before) throw new DestinationEditorialError("La experiencia no existe en Ruta 100.", 404);

      const sortOrder = Number(values.sortOrder);
      if (!Number.isSafeInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
        throw new DestinationEditorialError("El orden debe ser un número entero válido.", 400);
      }
      await connection.execute(
        `UPDATE tags_destination_experiences
            SET name=?,short_name=?,summary=?,description=?,sort_order=?,seo_title=?,seo_description=?,status=?,updated_by_id=?,updated_at=NOW()
          WHERE id=? AND site_id=?`,
        [
          required(values.name, 190, "El nombre"),
          clean(values.shortName, 120),
          required(values.summary, 1000, "El resumen"),
          clean(values.description, 50000),
          sortOrder,
          clean(values.seoTitle, 255),
          clean(values.seoDescription, 500),
          status(values.status),
          actorId(userId),
          id,
          site.id,
        ]
      );
      [[after]] = await connection.execute(
        `SELECT id,code,slug,name,short_name,summary,description,sort_order,seo_title,seo_description,status,source_id,source_url,source_checked_at
           FROM tags_destination_experiences WHERE id=? AND site_id=? LIMIT 1`,
        [id, site.id]
      );
    } else {
      throw new DestinationEditorialError("El tipo de contenido no es válido.", 400);
    }

    await connection.execute(
      `INSERT INTO tags_destination_audit_log
         (site_id,entity_type,entity_id,action,actor_type,actor_id,summary,changes_json)
       VALUES (?,?,?,'editorial.update','directory_admin',?,?,?)`,
      [
        site.id,
        entityType,
        id,
        actorId(userId),
        `Actualización editorial de ${after.name}.`,
        JSON.stringify({ before: normalizeDirectoryDbValue(before), after: normalizeDirectoryDbValue(after) }),
      ]
    );

    await connection.commit();
    return normalizeDirectoryDbValue(after);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
