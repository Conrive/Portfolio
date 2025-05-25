//Скрипт является системой защиты от SQL, NoSQL и XSS инъекций.
//Скрипт проверяет все строки текста и блокирует те, что содержат подозрительный ввод.
//Работает в паре с экранированием <%= %>.
const { promisify } = require('util');
const db = require("./db");
const dbRun = promisify(db.run.bind(db));

const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,  // XSS script tag
    /\$where|\$regex|\$ne|\$gt/i,                           // NoSQL injection
    /union\s+select\b/i,                                    // SQL injection
    /xp_cmdshell/i,                                         // MSSQL injection
    /(\b(or|and)\b\s+\d+=\d+)/i                             // Boolean-based SQL injection
];

function isMalicious(value) {
    if (typeof value !== 'string') return false;
    return dangerousPatterns.some((pattern) => pattern.test(value));
}

async function logAction(userId, action) {
    await dbRun('INSERT INTO logs (user_id, action) VALUES (?, ?)', [userId, action]);
}

function scanObject(obj, label, req) {
    for (const [key, value] of Object.entries(obj || {})) {
        if (typeof value === 'string' && isMalicious(value)) {
            if (label !== 'headers') {
                console.warn(`[⚠️ Injection detected] ${label} - "${key}": "${value}" from IP ${req.ip}`);
                logAction(req.session.user.id,`[Injection detected] ${label} - "${key}": "${value}" from IP ${req.ip}. User - ${req.session.user.id}, ${req.session.user.role}.`);
                return true;
            }
        }
    }
    return false;
}

module.exports = function validateInput(req, res, next) {
    const partsToScan = {
        query: req.query,
        body: req.body,
        params: req.params,
        headers: {
            'user-agent': req.headers['user-agent'],
            'referer': req.headers['referer']
        }
    };

    for (const [part, data] of Object.entries(partsToScan)) {
        if (scanObject(data, part, req)) {
            return res.status(400).render('errors/400', { title: '400 - Ошибка запроса' });
        }
    }

    next();
};