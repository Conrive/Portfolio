const dangerousPatterns = [
    /('|--|;|\/\*|\*\/|xp_cmdshell|union\s+select|\bor\b|\band\b)/i, // SQL
    /<script.*?>.*?<\/script>/i, // XSS
    /\$ne|\$gt|\$where|\$regex/i // NoSQL
];

function isMalicious(value) {
    if (typeof value !== 'string') return false;
    return dangerousPatterns.some((pattern) => pattern.test(value));
}

function scanObject(obj, label, req) {
    for (const [key, value] of Object.entries(obj || {})) {
        if (typeof value === 'string' && isMalicious(value)) {
            if (label !== 'headers') {
                console.warn(`[⚠️  Injection detected] ${label} - "${key}": "${value}" from IP ${req.ip}`);
                return true;
            } else {
                console.info(`[ℹ️ Suspicious header] ${label} - "${key}": "${value}" from IP ${req.ip}`);
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