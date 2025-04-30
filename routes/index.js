const express = require('express');
const router = express.Router();
const db = require('../models/db');
const app = express();

router.get('/', async (req, res) => {
    const projects = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM projects ORDER BY created_at DESC LIMIT 40', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    res.render('index', { title: 'Последние добавленные проекты', projects });
});

app.get('/api/search', async (req, res) => {
    const q = req.query.q?.toLowerCase() || '';

    const users = mockUsers.filter(u => u.name.toLowerCase().includes(q));
    const projects = mockProjects.filter(p => p.title.toLowerCase().includes(q));

    res.json({ users, projects });
});


module.exports = router;