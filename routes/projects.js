const express = require('express');
const router = express.Router();
const db = require('../models/db');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

// Показ формы добавления проекта
router.get('/add', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    res.render('addProject');
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
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
})

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

// Обработка формы добавления проекта
router.post('/add', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    const { title, description, link } = req.body;
    const userId = req.session.user.id;
    const cover = req.file ? `/uploads/${req.file.filename}` : null;

    if (!title.trim()) {
        return res.render('addProject', { error: "Название проекта обязательно" });
    }

    db.run(
        'INSERT INTO projects (user_id, title, description, link, cover) VALUES (?, ?, ?, ?, ?)',
        [userId, title, description, link, cover],
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
router.post('/edit/:id', upload.single('cover'), (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    const { title, description, link } = req.body;
    const projectId = req.params.id;
    const userId = req.session.user.id;

    db.get('SELECT cover FROM projects WHERE id = ? AND user_id = ?', [projectId, userId], (err, project) => {
        if (err || !project) {
            return res.redirect('/profile');
        }

        const newCover = req.file ? `/uploads/${req.file.filename}` : project.cover;

        if (req.file && project.cover && project.cover !== newCover) {
            deleteFileIfExists(project.cover);
        }

        db.run(
            'UPDATE projects SET title = ?, description = ?, link = ?, cover = ? WHERE id = ? AND user_id = ?',
            [title, description, link, newCover, projectId, userId],
            function (err) {
                if (err) {
                    return res.render('editProject', {
                        project: { id: projectId, title, description, link, cover: newCover },
                        error: "Ошибка при обновлении"
                    });
                }
                res.redirect('/profile');
            }
        );
    });
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

router.get('/project/:id/view', (req, res) => {
    const projectId = req.params.id;

    db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
        if (err || !project) {
            console.log("Проект:", project);

            return res.status(404).send("Проект не найден");
        }

        res.render('viewProject', { project });
    });
});

router.get('/project/:id/edit-page', (req, res) => {
    const projectId = req.params.id;

    db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
        if (err || !project) {
            return res.status(404).send("Проект не найден");
        }

        res.render('editProjectPage', {
            project,
            layout: project.layout ? JSON.parse(project.layout) : [] // если проект из БД, и у него есть layout
        });
    });
});

router.post('/project/:id/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

router.post('/delete-upload', (req, res) => {
    const { path } = req.body;
    deleteFileIfExists(path);
    res.json({ success: true });
});

router.post('/project/:id/save', async (req, res) => {
    const { id } = req.params;
    const pageData = req.body;

    try {
        await dbRun('UPDATE projects SET layout = ? WHERE id = ?', [JSON.stringify(pageData), id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Ошибка сохранения' });
    }
});

// Загрузка layout
router.get('/api/project/:id/layout', async (req, res) => {
    const projectId = req.params.id;

    try {
        const project = await dbGet('SELECT layout FROM projects WHERE id = ?', [projectId]);

        if (project) {
            const layout = project.layout ? JSON.parse(project.layout) : []; // Пустой массив если пусто
            res.json({ layout });
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при загрузке проекта' });
    }
});


// Сохранение layout
router.post('/api/project/:id/layout', async (req, res) => {
    const projectId = req.params.id;
    const { layout } = req.body;

    if (!layout) {
        return res.status(400).json({ error: 'Layout is required' });
    }

    try {
        await dbRun('UPDATE projects SET layout = ? WHERE id = ?', [JSON.stringify(layout), projectId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при сохранении проекта' });
    }
});

module.exports = router;