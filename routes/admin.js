const express = require('express');
const router = express.Router();
const db = require('../models/db'); // подключение к sqlite
const checkAdmin = require('../models/checkAdmin');
const { deleteFileIfExists} = require('../public/deleteFile');
const { promisify } = require('util');
const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));

// Панель
router.get('/', checkAdmin, async (req, res) => {
    const users = await dbAll('SELECT * FROM users');
    const projects = await dbAll('SELECT * FROM projects');
    const token = req.csrfToken();
    res.render('admin', { users, projects, csrfToken: token });
});

// Обновление пользователя
router.post('/user/update/:id', checkAdmin, async (req, res) => {
    const { name, role } = req.body;
    await dbRun('UPDATE users SET name = ?, role = ? WHERE id = ?', [name, role, req.params.id]);
    res.redirect('/admin');
});

// Удаление пользователя + его проектов + картинки
router.post('/user/delete/:id', checkAdmin, async (req, res) => {
    const userId = req.params.id;
    const projectId = req.params.id;

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return res.redirect('/admin');

        // Удаление аватарки и обложки
        if (user.avatar) deleteFileIfExists(user.avatar);
        if (user.cover) deleteFileIfExists(user.cover);

        // Найти все проекты пользователя
        db.all('SELECT * FROM projects WHERE user_id = ?', [userId], (err, projects) => {
            if (!err && projects) {
                projects.forEach(project => {
                    // Удаление обложки
                    if (project.cover) deleteFileIfExists(project.cover);

                    // Удаление изображений из layout
                    let parsedLayout;

                    try {
                        let layoutRaw = project.layout;

                        if (typeof layoutRaw === 'string') {
                            parsedLayout = JSON.parse(layoutRaw); // первый парсинг

                            if (typeof parsedLayout === 'string') {
                                parsedLayout = JSON.parse(parsedLayout); // второй парсинг
                            }
                        } else {
                            parsedLayout = layoutRaw;
                        }

                        if (parsedLayout?.elements && Array.isArray(parsedLayout.elements)) {
                            parsedLayout.elements.forEach(el => {
                                if (el.tag === 'img' && typeof el.src === 'string' && el.src.includes('/uploads/')) {
                                    const match = el.src.match(/\/uploads\/[^"' ]+/);
                                    if (match && match[0]) {
                                        deleteFileIfExists(match[0]);
                                    }
                                }
                            });
                        } else {
                            console.log('layout.elements отсутствует или не массив');
                        }

                    } catch (e) {
                        console.error(`Ошибка при парсинге layout проекта ${projectId}:`, e.message);
                    }
                });
            }

            // Удаляем проекты
            db.run('DELETE FROM projects WHERE user_id = ?', [userId], () => {
                // Удаляем пользователя
                db.run('DELETE FROM users WHERE id = ?', [userId], () => {
                    res.redirect('/admin');
                });
            });
        });
    });
});

// Обновление проекта
router.post('/project/update/:id', checkAdmin, async (req, res) => {
    const { title, description } = req.body;
    await dbRun('UPDATE projects SET title = ?, description = ? WHERE id = ?', [title, description, req.params.id]);
    res.redirect('/admin');
});

// Удаление проекта + очистка файлов
router.post('/project/delete/:id', checkAdmin, async (req, res) => {
    const projectId = req.params.id;

    db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
        if (err || !project) return res.redirect('/admin');

        // Удаление обложки
        if (project.cover) deleteFileIfExists(project.cover);

        // Удаление изображений из layout
        let parsedLayout;

        try {
            let layoutRaw = project.layout;

            if (typeof layoutRaw === 'string') {
                parsedLayout = JSON.parse(layoutRaw); // первый парсинг

                if (typeof parsedLayout === 'string') {
                    parsedLayout = JSON.parse(parsedLayout); // второй парсинг
                }
            } else {
                parsedLayout = layoutRaw;
            }

            if (parsedLayout?.elements && Array.isArray(parsedLayout.elements)) {
                parsedLayout.elements.forEach(el => {
                    if (el.tag === 'img' && typeof el.src === 'string' && el.src.includes('/uploads/')) {
                        const match = el.src.match(/\/uploads\/[^"' ]+/);
                        if (match && match[0]) {
                            deleteFileIfExists(match[0]);
                        }
                    }
                });
            } else {
                console.log('layout.elements отсутствует или не массив');
            }

        } catch (e) {
            console.error(`Ошибка при парсинге layout проекта ${projectId}:`, e.message);
        }

        db.run('DELETE FROM projects WHERE id = ?', [projectId], () => {
            res.redirect('/admin');
        });
    });
});

module.exports = router;