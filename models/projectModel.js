const db = require('./db');

async function getUserProjects(userId) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM projects WHERE user_id = ?', [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

module.exports = { getUserProjects };