//Скрипт использующийся для загрузки и удаления файлов.
//Загрузка файлов производится в папку Uploads.
//При загрузке файлу присваивается уникальное имя.

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

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
    limits: { fileSize: 5 * 1024 * 1024 }
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

module.exports = { deleteFileIfExists, upload, storage };