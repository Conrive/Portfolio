//Скрипт маршрутов страницы панели администрирования

const express = require('express');
const router = express.Router();
const db = require('../models/db'); // подключение к sqlite
const checkAdmin = require('../models/checkAdmin');
const { deleteFileIfExists} = require('../public/fileHandling');
const { promisify } = require('util');
const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));

// Отображение админ-панели с данными пользователей, проектов, логов и статистикой
router.get('/', checkAdmin, async (req, res) => {
    const users = await dbAll('SELECT * FROM users');
    const projects = await dbAll('SELECT * FROM projects');
    const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users');
    const totalProjects = await dbGet('SELECT COUNT(*) as count FROM projects');
    const recentUsers = await dbAll('SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    const logs = await dbAll('SELECT logs.*, users.name as username FROM logs LEFT JOIN users ON logs.user_id = users.id ORDER BY timestamp DESC LIMIT 50');
    const token = req.csrfToken();

    res.render('admin', {
        users,
        projects,
        csrfToken: token,
        stats: {
            totalUsers: totalUsers.count,
            totalProjects: totalProjects.count,
            recentUsers
        },
        logs
    });
});

async function logAction(userId, action) {
    await dbRun('INSERT INTO logs (user_id, action) VALUES (?, ?)', [userId, action]);
}

// Обновление информации пользователя
router.post('/user/update/:id', checkAdmin, async (req, res) => {
    const { name, bio, role } = req.body;
    await dbRun('UPDATE users SET name = ?, bio = ?, role = ? WHERE id = ?', [name, bio, role, req.params.id]);
    await logAction(req.session.user.id, `Updated user #${req.params.id}`);
    res.redirect('/admin');
});

// Удаление пользователя + его проектов + картинки из Uploads
router.post('/user/delete/:id', checkAdmin, async (req, res) => {
    const userId = req.params.id;
    const projectId = req.params.id;

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return res.redirect('/admin');

        if (user.avatar) deleteFileIfExists(user.avatar);
        if (user.cover) deleteFileIfExists(user.cover);

        db.all('SELECT * FROM projects WHERE user_id = ?', [userId], (err, projects) => {
            if (!err && projects) {
                projects.forEach(project => {
                    if (project.cover) deleteFileIfExists(project.cover);

                    let parsedLayout;

                    try {
                        let layoutRaw = project.layout;

                        if (typeof layoutRaw === 'string') {
                            parsedLayout = JSON.parse(layoutRaw);

                            if (typeof parsedLayout === 'string') {
                                parsedLayout = JSON.parse(parsedLayout);
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

            db.run('DELETE FROM projects WHERE user_id = ?', [userId], async () => {
                await logAction(req.session.user.id, `Deleted user #${userId}`);
                db.run('DELETE FROM users WHERE id = ?', [userId], () => {
                    res.redirect('/admin');
                });
            });
        });
    });
});

// Обновление информации того или иного проекта
router.post('/project/update/:id', checkAdmin, async (req, res) => {
    const { title, description } = req.body;
    await dbRun('UPDATE projects SET title = ?, description = ? WHERE id = ?', [title, description, req.params.id]);
    await logAction(req.session.user.id, `Updated project #${req.params.id}`);
    res.redirect('/admin');
});

// Удаление проекта + очистка файлов (разбор и удаление изображения из layout и Uploads)
router.post('/project/delete/:id', checkAdmin, async (req, res) => {
    const projectId = req.params.id;

    db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
        if (err || !project) return res.redirect('/admin');

        if (project.cover) deleteFileIfExists(project.cover);

        let parsedLayout;

        try {
            let layoutRaw = project.layout;

            if (typeof layoutRaw === 'string') {
                parsedLayout = JSON.parse(layoutRaw);

                if (typeof parsedLayout === 'string') {
                    parsedLayout = JSON.parse(parsedLayout);
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

        db.run('DELETE FROM projects WHERE id = ?', [projectId], async () => {
            await logAction(req.session.user.id, `Deleted project #${projectId}`);
            res.redirect('/admin');
        });
    });
});

module.exports = router;