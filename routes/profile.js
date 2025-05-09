const express = require('express');
const router = express.Router();
const { getUserProjects } = require('../models/projectModel');
const db = require('../models/db');
const { deleteFileIfExists, upload, storage} = require('../public/deleteFile');
const { ensureAuth } = require('../models/ensureAuth');

router.get('/', ensureAuth, async (req, res) => {

    const user = req.session.user;
    const projects = await getUserProjects(user.id); // Получаем проекты пользователя
    const token = req.csrfToken();
    res.render('profile', { user, profileUser: user, projects, isOwner: true, csrfToken: token });
});

router.get('/:id', async (req, res) => {
    const viewer = req.session.user;
    const profileId = parseInt(req.params.id);

    if (isNaN(profileId)) return res.redirect('/');

    db.get('SELECT * FROM users WHERE id = ?', [profileId], async (err, user) => {
        if (err || !user) {
            return res.status(404).send('Пользователь не найден');
        }

        const projects = await getUserProjects(profileId);
        const isOwner = viewer && viewer.id === user.id;
        const token = req.csrfToken();
        res.render('profile', { profileUser: user, projects, isOwner, csrfToken: token });
    });
});

// Форма редактирования профиля
router.get('/:id/edit', ensureAuth, (req, res) => {

    db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, user) => {
        if (err || !user) {
            return res.redirect(`/profile/${req.session.user.id}`);
        }
        const token = req.csrfToken();
        res.render('editProfile', { user, csrfToken: token });
    });
});

// Обновление профиля
router.post('/:id/edit', ensureAuth,
    upload.fields([{ name: 'avatar' }, { name: 'cover' }]),
    (req, res) => {

    const { name, bio, github, telegram, linkedin } = req.body;
    let avatar = req.session.user.avatar;
    let cover = req.session.user.cover;

    // Удаление старых и сохранение новых
    if (req.files['avatar']) {
        deleteFileIfExists(avatar); // удаляем старый
        avatar = `/uploads/${req.files['avatar'][0].filename}`;
    }
    if (req.files['cover']) {
        deleteFileIfExists(cover); // удаляем старый
        cover = `/uploads/${req.files['cover'][0].filename}`;
    }

    db.run(
        'UPDATE users SET name = ?, bio = ?, github = ?, telegram = ?, linkedin = ?, avatar = ?, cover = ? WHERE id = ?',
        [name, bio, github, telegram, linkedin, avatar, cover, req.session.user.id],
        function (err) {
            if (err) {
                return res.render('editProfile', { user: req.body, error: "Ошибка при обновлении" });
            }

            // Обновляем сессию
            req.session.user.name = name;
            req.session.user.bio = bio;
            req.session.user.github = github;
            req.session.user.telegram = telegram;
            req.session.user.linkedin = linkedin;
            req.session.user.avatar = avatar;
            req.session.user.cover = cover;

            return res.redirect(`/profile/${req.session.user.id}`);
        }
    );
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;