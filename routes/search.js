//Скрипт маршрутов страницы поиска

const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { promisify } = require('util');

const dbAll = promisify(db.all.bind(db));

//Форма страницы поиска
router.get('/search', async (req, res) => {
    const q = req.query.q?.trim();
    const filter = req.query.filter;

    if (!q) return res.render('search', { users: [], projects: [], query: q });

    try {
        let users = [];
        let projects = [];

        if (!filter || filter === 'users' || filter === 'all') {
            const userIsAdmin = req.session?.user?.role === 2;
            const hiddenFilter = userIsAdmin ? '' : 'AND hidden = 0';

            users = await dbAll(
                `SELECT * FROM users WHERE (name LIKE ? COLLATE NOCASE OR bio LIKE ? COLLATE NOCASE) ${hiddenFilter}`,
                [`%${q}%`, `%${q}%`]
            );
        }

        if (!filter || filter === 'projects' || filter === 'all') {
            projects = await dbAll(
                `SELECT * FROM projects WHERE title LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE`,
                [`%${q}%`, `%${q}%`]
            );
        }

        if (users.length === 0 && projects.length === 0) {
            return res.status(404).render('search_404', { message: 'Ничего не найдено по вашему запросу.' });
        }

        res.render('search', { users, projects, query: q });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Ошибка сервера при выполнении поиска.' });
    }
});

//API для поиска (возвращает JSON)
router.get('/api/search', async (req, res) => {
    const q = req.query.q?.trim();
    const filter = req.query.filter;

    if (!q) return res.json({ users: [], projects: [] });

    try {
        let users = [];
        let projects = [];

        if (!filter || filter === 'users' || filter === 'all') {
            const userIsAdmin = req.session?.user?.role === 2;
            const hiddenFilter = userIsAdmin ? '' : 'AND hidden = 0';

            users = await dbAll(
                `SELECT * FROM users WHERE (name LIKE ? COLLATE NOCASE OR bio LIKE ? COLLATE NOCASE) ${hiddenFilter} LIMIT 7`,
                [`%${q}%`, `%${q}%`]
            );
        }

        if (!filter || filter === 'projects' || filter === 'all') {
            projects = await dbAll(
                `SELECT * FROM projects WHERE title LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE LIMIT 7`,
                [`%${q}%`, `%${q}%`]
            );
        }

        res.json({ users, projects });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;