const fs = require('fs');
const path = require('path');
const db = require('./db');
const { promisify } = require('util');
const dbExec = promisify(db.exec.bind(db));

const initSqlPath = path.join(__dirname, '../db/init.sql');

(async () => {
    try {
        const initSql = fs.readFileSync(initSqlPath, 'utf-8');
        await dbExec(initSql);
        console.log('✅ База данных успешно инициализирована.');
    } catch (err) {
        console.error('❌ Ошибка инициализации базы данных:', err.message);
    } finally {
        db.close();
    }
})();