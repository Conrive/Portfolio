//Скрипт маршрута заглавной страницы

const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/', async (req, res) => {
    try {
        const projects = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM projects ORDER BY created_at DESC LIMIT 40', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.render('index', { title: 'Последние добавленные проекты', projects });
    } catch (err) {
        console.error('Ошибка загрузки проектов:', err);
        res.status(500).render('error', { message: 'Не удалось загрузить проекты' });
    }
});

module.exports = router;