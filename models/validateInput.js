//Скрипт является системой защиты от SQL, NoSQL и XSS инъекций.
//Скрипт проверяет все строки текста и блокирует те, что содержат подозрительный ввод.
//Работает в паре с экранированием <%= %>.

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

function scanObject(obj, label, req) {
    for (const [key, value] of Object.entries(obj || {})) {
        if (typeof value === 'string' && isMalicious(value)) {
            if (label !== 'headers') {
                console.warn(`[⚠️ Injection detected] ${label} - "${key}": "${value}" from IP ${req.ip}`);
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
            return res.status(400).send('Bad Request: Suspicious input detected');
        }
    }

    next();
};