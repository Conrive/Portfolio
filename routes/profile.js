const express = require('express');
const router = express.Router();
const { getUserProjects } = require('../models/projectModel');
const db = require('../models/db');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

router.get('/', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); // Если не авторизован, перенаправляем на вход
    }

    const user = req.session.user;
    const projects = await getUserProjects(user.id); // Получаем проекты пользователя

    res.render('profile', { user, projects });
});

// Настройка хранения загруженных файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // .jpg, .png
        const uniqueName = crypto.randomUUID() + ext;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowedTypes.includes(file.mimetype));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

//Удаление старого файла
function deleteFileIfExists(filePath) {
    if (!filePath || !filePath.startsWith('/uploads/')) return;

    const absolutePath = path.join(__dirname, '../public', filePath);

    fs.access(absolutePath, fs.constants.F_OK, (err) => {
        if (!err) {
            fs.unlink(absolutePath, (err) => {
                if (err) {
                    console.error('Ошибка при удалении:', err.message);
                } else {
                    console.log('Удалён файл:', absolutePath);
                }
            });
        } else {
            console.warn('Файл не найден для удаления:', absolutePath);
        }
    });
}


// Форма редактирования профиля
router.get('/edit', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, user) => {
        if (err || !user) {
            return res.redirect('/profile');
        }
        res.render('editProfile', { user });
    });
});

// Обновление профиля
router.post('/edit', upload.fields([{ name: 'avatar' }, { name: 'cover' }]), (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

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

            res.redirect('/profile');
        }
    );
});

module.exports = router;