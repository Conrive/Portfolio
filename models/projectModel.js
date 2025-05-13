const db = require('./db');
const { promisify } = require('util');
const dbAll = promisify(db.all.bind(db));

async function getUserProjects(userId) {
    const projects = await dbAll(`
        SELECT * FROM projects
        WHERE user_id = ?
        ORDER BY is_favorite DESC, created_at DESC
        LIMIT 10
    `, [userId]);

    return projects;
}

module.exports = { getUserProjects };