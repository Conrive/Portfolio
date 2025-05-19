module.exports = function checkAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 2) {
        return next();
    }
    res.status(403).render('errors/403', { title: '403 - Запрещено' });
};