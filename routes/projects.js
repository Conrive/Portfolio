const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Показ формы добавления проекта
router.get('/add', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    res.render('addProject');
});

// Обработка формы добавления проекта
router.post('/add', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    const { title, description, link } = req.body;
    const userId = req.session.user.id;

    if (!title.trim()) {
        return res.render('addProject', { error: "Название проекта обязательно" });
    }

    db.run(
        'INSERT INTO projects (user_id, title, description, link) VALUES (?, ?, ?, ?)',
        [userId, title, description, link],
        function (err) {
            if (err) {
                return res.render('addProject', { error: "Ошибка при добавлении проекта" });
            }
            res.redirect('/profile');
        }
    );
});

// Показ формы редактирования проекта
router.get('/edit/:id', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    const projectId = req.params.id;
    db.get('SELECT * FROM projects WHERE id = ? AND user_id = ?',
        [projectId, req.session.user.id],
        (err, project) => {
            if (err || !project) {
                return res.redirect('/profile');
            }
            res.render('editProject', { project });
        }
    );
});

// Обновление данных проекта
router.post('/edit/:id', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    const { title, description, link } = req.body;
    const projectId = req.params.id;
    const userId = req.session.user.id;

    db.run(
        'UPDATE projects SET title = ?, description = ?, link = ? WHERE id = ? AND user_id = ?',
        [title, description, link, projectId, userId],
        function (err) {
            if (err) {
                return res.render('editProject', { project: { id: projectId, title, description, link }, error: "Ошибка при обновлении" });
            }
            res.redirect('/profile');
        }
    );
});

router.post('/delete/:id', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    const projectId = req.params.id;
    const userId = req.session.user.id;

    db.run('DELETE FROM projects WHERE id = ? AND user_id = ?', [projectId, userId], function (err) {
        if (err) {
            return res.redirect('/profile');
        }
        res.redirect('/profile');
    });
});

module.exports = router;