const db = require('./db');
const bcrypt = require('bcrypt');

async function createUser(name, email, password, role = 'student') {
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

async function findUserByEmail(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function findUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE name = ?', [username], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        })
    })
}

module.exports = { createUser, findUserByEmail, findUserByUsername };
