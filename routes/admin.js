const express = require('express');
const router = express.Router();
const db = require('../models/db'); // подключение к sqlite
const checkAdmin = require('../models/checkAdmin');
const { promisify } = require('util');
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));

// Панель
router.get('/', checkAdmin, async (req, res) => {
    const users = await dbAll('SELECT * FROM users');
    const projects = await dbAll('SELECT * FROM projects');
    res.render('admin', { users, projects });
});

// Обновление пользователя
router.post('/user/update/:id', checkAdmin, async (req, res) => {
    const { name, role } = req.body;
    await dbRun('UPDATE users SET name = ?, role = ? WHERE id = ?', [name, role, req.params.id]);
    res.redirect('/admin');
});

// Удаление пользователя
router.post('/user/delete/:id', checkAdmin, async (req, res) => {
    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.redirect('/admin');
});

// Обновление проекта
router.post('/project/update/:id', checkAdmin, async (req, res) => {
    const { title, description } = req.body;
    await dbRun('UPDATE projects SET title = ?, description = ? WHERE id = ?', [title, description, req.params.id]);
    res.redirect('/admin');
});

// Удаление проекта
router.post('/project/delete/:id', checkAdmin, async (req, res) => {
    await dbRun('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.redirect('/admin');
});

module.exports = router;