// Скрипт маршрутов страницы панели администрирования

const express = require('express');
const router = express.Router();
const db = require('../models/db'); // подключение к sqlite
const checkAdmin = require('../models/checkAdmin');
const { deleteFileIfExists} = require('../public/fileHandling');
const { createUser, findUserByEmail } = require('../models/userModel');
const { promisify } = require('util');
const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));

// Отображение админ-панели с данными пользователей, проектов, логов и статистикой
router.get('/', checkAdmin, async (req, res) => {
    const { user_id, action_type, date_from, date_to } = req.query;
    const token = req.csrfToken();

    const users = await dbAll('SELECT * FROM users');
    const admins = await dbAll("SELECT id, name FROM users WHERE role = '2'");
    const projects = await dbAll('SELECT * FROM projects');
    const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users');
    const totalProjects = await dbGet('SELECT COUNT(*) as count FROM projects');
    const recentUsers = await dbAll('SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 5');

    let query = `
        SELECT logs.*, users.name as username 
        FROM logs 
        LEFT JOIN users ON logs.user_id = users.id 
        WHERE 1=1
    `;
    const params = [];

    if (user_id) {
        query += ' AND logs.user_id = ?';
        params.push(user_id);
    }

    if (action_type) {
        query += ' AND logs.action LIKE ?';
        params.push(`%${action_type}%`);
    }

    if (date_from) {
        query += ' AND DATE(logs.timestamp) >= DATE(?)';
        params.push(date_from);
    }

    if (date_to) {
        query += ' AND DATE(logs.timestamp) <= DATE(?)';
        params.push(date_to);
    }

    query += ' ORDER BY logs.timestamp DESC LIMIT 100';

    const logs = await dbAll(query, params);

    res.render('admin', {
        users,
        admins,
        projects,
        csrfToken: token,
        stats: {
            totalUsers: totalUsers.count,
            totalProjects: totalProjects.count,
            recentUsers
        },
        logs,
        query: req.query,
        created: req.query.created === 'true'
    });
});

async function logAction(userId, action) {
    await dbRun('INSERT INTO logs (user_id, action) VALUES (?, ?)', [userId, action]);
}

// Обновление информации пользователя
router.post('/user/update/:id', checkAdmin, async (req, res) => {
    const { name, bio, role } = req.body;
    const userId = req.params.id;
    const oldUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

    await dbRun('UPDATE users SET name = ?, bio = ?, role = ? WHERE id = ?', [name, bio, role, userId]);

    await logAction(req.session.user.id, `Updated user: ${oldUser.name} (ID: ${userId}) → name: ${oldUser.name} → ${name}, role: ${oldUser.role} → ${role}`);
    res.redirect('/admin');
});

// Создание нового пользователя админом
router.post('/user/create', checkAdmin, async (req, res) => {
    const { name, email, password } = req.body;

    try {
        if (await findUserByEmail(email)) {
            await logAction(req.session.user.id, `Attempted to create user with existing email: ${email}`);
            return res.redirect('/admin?created=false');
        }

        await createUser(name, email, password);
        await logAction(req.session.user.id, `Created user: ${name}, ${email}`);
        res.redirect('/admin?created=true');
    } catch (err) {
        console.error('Ошибка при создании пользователя:', err);
        await logAction(req.session.user.id, `Failed to create user ${name}, ${email} — ${err.message}`);
        res.redirect('/admin?created=false');
    }
});

// Удаление пользователя + его проектов + картинки из Uploads
router.post('/user/delete/:id', checkAdmin, async (req, res) => {
    const userId = req.params.id;

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
                        }

                    } catch (e) {
                        console.error(`Ошибка при парсинге layout проекта ${project.id}:`, e.message);
                    }
                });
            }

            db.run('DELETE FROM projects WHERE user_id = ?', [userId], async () => {
                await logAction(req.session.user.id, `Deleted user: ${user.name}, ${user.email} (ID: ${userId}) with ${projects?.length || 0} projects`);
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
    const projectId = req.params.id;

    const oldProject = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);

    await dbRun('UPDATE projects SET title = ?, description = ? WHERE id = ?', [title, description, projectId]);

    await logAction(req.session.user.id, `Updated project: ${oldProject.title} (ID: ${projectId}) → title: ${oldProject.title} → ${title}`);
    res.redirect('/admin');
});

// Удаление проекта + очистка файлов (разбор и удаление изображения из layout и Uploads)
router.post('/project/delete/:id', checkAdmin, async (req, res) => {
    const projectId = req.params.id;

    db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
        if (err || !project) return res.redirect('/admin');

        if (project.cover) deleteFileIfExists(project.cover);

        try {
            let parsedLayout = typeof project.layout === 'string'
                ? JSON.parse(JSON.parse(project.layout))
                : project.layout;

            if (parsedLayout?.elements && Array.isArray(parsedLayout.elements)) {
                parsedLayout.elements.forEach(el => {
                    if (el.tag === 'img' && typeof el.src === 'string' && el.src.includes('/uploads/')) {
                        const match = el.src.match(/\/uploads\/[^"' ]+/);
                        if (match && match[0]) {
                            deleteFileIfExists(match[0]);
                        }
                    }
                });
            }
        } catch (e) {
            console.error(`Ошибка при парсинге layout проекта ${projectId}:`, e.message);
        }

        db.run('DELETE FROM projects WHERE id = ?', [projectId], async () => {
            await logAction(req.session.user.id, `Deleted project: ${project.title} (ID: ${projectId})`);
            res.redirect('/admin');
        });
    });
});

module.exports = router;