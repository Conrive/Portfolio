//Скрипт маршрутов профилем пользователя

const express = require('express');
const router = express.Router();
const { getUserProjects } = require('../models/projectModel');
const db = require('../models/db');
const { deleteFileIfExists, upload, storage} = require('../public/fileHandling');
const { ensureAuth } = require('../models/ensureAuth');

router.get('/', ensureAuth, async (req, res) => {
    const user = req.session.user;
    const projects = await getUserProjects(user.id);
    const token = req.csrfToken();
    res.render('profile', {
        user,
        profileUser: user,
        projects,
        isOwner: true,
        comments: [],
        currentUser: user,
        csrfToken: token
    });
});

//Форма профиля
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
        db.all(`
            SELECT comments.*, u.name as teacher_name, u.avatar as teacher_avatar, u.role as teacher_role, u.id as teacher_id
            FROM comments
            JOIN users u ON comments.teacher_id = u.id
            WHERE comments.student_id = ?
            ORDER BY comments.created_at DESC
            `, [profileId], (err2, comments) => {
            if (err2) return res.status(500).send('Ошибка загрузки комментариев');

            const token = req.csrfToken();
            res.render('profile', {
                profileUser: user,
                projects,
                isOwner,
                comments,
                currentUser: viewer,
                csrfToken: token
            });
        });
    });
});

//Форма редактирования профиля
router.get('/:id/edit', ensureAuth, (req, res) => {
    db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, user) => {
        if (err || !user) {
            return res.redirect(`/profile/${req.session.user.id}`);
        }
        const token = req.csrfToken();
        res.render('editProfile', { user, csrfToken: token });
    });
});

//Обновление профиля
router.post('/:id/edit', ensureAuth,
    upload.fields([{ name: 'avatar' }, { name: 'cover' }]),
    (req, res) => {

    const { name, bio, github, telegram, linkedin } = req.body;
    let avatar = req.session.user.avatar;
    let cover = req.session.user.cover;

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

// Маршрут для отправки комментария
router.post('/comment/:studentId', ensureAuth, (req, res) => {
    const { studentId } = req.params;
    const content = req.body.content.trimStart();
    const teacherId = req.session.user.id;
    const role = req.session.user.role;

    if (![2, 3].includes(role)) return res.status(403).send('Недостаточно прав');

    if (!content || content.trim().length === 0) {
        return res.redirect(`/profile/${studentId}`);
    }

    db.run(`
        INSERT INTO comments (student_id, teacher_id, content)
        VALUES (?, ?, ?)
    `, [studentId, teacherId, content.trim()], err => {
        if (err) return res.status(500).send('Ошибка при добавлении комментария');
        res.redirect(`/profile/${studentId}`);
    });
});

// Обновление комментария + пометка "изменено"
router.post('/comment/edit/:id', ensureAuth, express.json(), (req, res) => {
    const { id } = req.params;
    const content = req.body.content.trimStart();
    const userId = req.session.user.id;

    db.get('SELECT * FROM comments WHERE id = ?', [id], (err, comment) => {
        if (err || !comment) return res.sendStatus(404);
        if (comment.teacher_id !== userId) return res.sendStatus(403);

        db.run('UPDATE comments SET content = ?, edited = 1 WHERE id = ?', [content, id], err2 => {
            if (err2) return res.sendStatus(500);
            res.sendStatus(200);
        });
    });
});

// Удаление комментария
router.post('/comment/delete/:commentId', ensureAuth, (req, res) => {
    const commentId = parseInt(req.params.commentId);
    const currentUser = req.session.user;

    db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, comment) => {
        if (err || !comment) return res.status(404).send('Комментарий не найден');

        if (currentUser.role === 2 || currentUser.role === 3) {
            // Админ может удалить любой, преподаватель — только свой
            if (currentUser.role === 3 && comment.teacher_id !== currentUser.id) {
                return res.status(403).send('Нет прав на удаление');
            }

            db.run('DELETE FROM comments WHERE id = ?', [commentId], err => {
                if (err) return res.status(500).send('Ошибка при удалении');
                res.redirect(`/profile/${comment.project_id || comment.student_id}`);
            });
        } else {
            res.status(403).send('Недостаточно прав');
        }
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;