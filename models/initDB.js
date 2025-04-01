const fs = require('fs');
const path = require('path');
const db = require('./db');

const initSqlPath = path.join(__dirname, '../db/init.sql');
const initSql = fs.readFileSync(initSqlPath, 'utf-8');

db.exec(initSql, (err) => {
    if (err) {
        console.error('Ошибка инициализации базы данных:', err.message);
    } else {
        console.log('✅ База данных успешно инициализирована.');
    }
    db.close();
});
