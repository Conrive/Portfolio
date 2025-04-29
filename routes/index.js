const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/', async (req, res) => {
    const projects = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM projects ORDER BY created_at DESC LIMIT 40', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    res.render('index', { title: 'Последние добавленные проекты', projects });
});

module.exports = router;