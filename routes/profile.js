const express = require('express');
const router = express.Router();
const { getUserProjects } = require('../models/projectModel');

router.get('/', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); // Если не авторизован, перенаправляем на вход
    }

    const user = req.session.user;
    const projects = await getUserProjects(user.id); // Получаем проекты пользователя

    res.render('profile', { user, projects });
});

module.exports = router;