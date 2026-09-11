import { db } from "@/app/lib/tags-db";

export async function getPublicLoyaltyProgram(programId, connection = db) {
    const [rows] = await connection.query(
        `SELECT p.id,p.business_id,p.directory_site_id,p.name,p.description,p.mechanic,
                p.points_currency,p.points_per_currency,p.stamp_target,p.visit_target,p.settings_json,
                b.display_name AS business_name,b.logo_url AS business_logo,b.phone,b.whatsapp,b.email
           FROM tags_loyalty_programs p
           INNER JOIN tags_businesses b ON b.id=p.business_id
           INNER JOIN tags_business_addons ba
                   ON ba.business_id=p.business_id
                  AND ba.addon_code='loyalty'
                  AND ba.status='active'
                  AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
          WHERE p.id=? AND p.status='active'
          LIMIT 1`,
        [programId]
    );
    const program = rows[0] || null;
    if (!program) return null;

    const [rewards] = await connection.query(
        `SELECT id,name,description,reward_type,reward_value,
                required_points,required_stamps,required_visits,valid_from,valid_until
           FROM tags_loyalty_rewards
          WHERE program_id=? AND status='active'
            AND (valid_from IS NULL OR valid_from<=NOW())
            AND (valid_until IS NULL OR valid_until>=NOW())
          ORDER BY COALESCE(required_points,required_stamps,required_visits,0),id`,
        [program.id]
    );
    return { ...program, rewards };
}

export async function getPublicLoyaltyProgramByBusiness(businessId, connection = db) {
    const [rows] = await connection.query(
        `SELECT id FROM tags_loyalty_programs WHERE business_id=? AND status='active' LIMIT 1`,
        [businessId]
    );
    return rows[0] ? getPublicLoyaltyProgram(rows[0].id, connection) : null;
}
