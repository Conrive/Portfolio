const db = require('./db');
const bcrypt = require('bcrypt');

async function createUser(name, email, password, role = 1) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
    });
}

function findUserBy(field, value) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE ${field} = ?`, [value], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function findUserByEmail(email) {
    return findUserBy('email', email);
}

async function findUserByUsername(name) {
    return findUserBy('name', name);
}

module.exports = { createUser, findUserByEmail, findUserByUsername };
