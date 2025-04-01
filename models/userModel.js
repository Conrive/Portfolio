const db = require('./db');
const bcrypt = require('bcrypt');

async function createUser(name, email, password, role = 'student') {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    stmt.run(name, email, hashedPassword, role, (err) => {
        if (err) console.error('Ошибка при добавлении пользователя:', err.message);
    });
    stmt.finalize();
}

module.exports = { createUser };
