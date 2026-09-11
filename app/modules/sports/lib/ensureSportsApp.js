const DEFAULT_DISCIPLINES = [
    { code: "tennis", name: "Tenis", teamMode: "individual", scoringMode: "sets", order: 10 },
    { code: "padel", name: "Pádel", teamMode: "doubles", scoringMode: "sets", order: 20 },
    { code: "football", name: "Fútbol", teamMode: "team", scoringMode: "goals", order: 30 }
];

export async function ensureSportsApp({ connection, businessId, turnosId, name }) {
    await connection.query(
        `INSERT INTO tags_sports_apps
            (business_id, turnos_id, name, status, settings_json)
         VALUES (?, ?, ?, 'active', ?)
         ON DUPLICATE KEY UPDATE
            business_id = VALUES(business_id),
            name = VALUES(name),
            status = 'active',
            updated_at = NOW()`,
        [businessId, turnosId, name, JSON.stringify({ version: 1 })]
    );

    const [rows] = await connection.query(
        "SELECT id FROM tags_sports_apps WHERE turnos_id = ? AND business_id = ? LIMIT 1",
        [turnosId, businessId]
    );
    const sportsAppId = Number(rows[0]?.id || 0);
    if (!sportsAppId) throw new Error("No se pudo inicializar Tags Deportes");

    for (const discipline of DEFAULT_DISCIPLINES) {
        await connection.query(
            `INSERT IGNORE INTO tags_sports_disciplines
                (sports_app_id, code, name, team_mode, scoring_mode, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sportsAppId, discipline.code, discipline.name, discipline.teamMode, discipline.scoringMode, discipline.order]
        );
    }

    await connection.query(
        `UPDATE tags_sports_apps a
         SET a.default_discipline_id = (
            SELECT d.id
            FROM tags_sports_disciplines d
            WHERE d.sports_app_id = a.id AND d.is_active = 1
            ORDER BY d.sort_order ASC, d.id ASC
            LIMIT 1
         )
         WHERE a.id = ? AND a.default_discipline_id IS NULL`,
        [sportsAppId]
    );

    return sportsAppId;
}

