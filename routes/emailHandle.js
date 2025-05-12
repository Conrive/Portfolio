//Скрипт маршрутов подтверждения почты пользователя

const express = require('express');
const router = express.Router();
const db = require('../models/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

router.get('/', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    const csrfToken = req.csrfToken();
    res.render('verify', { csrfToken: csrfToken });
});

router.post('/', (req, res) => {
    const { code } = req.body;
    const userId = req.session.user.id;

    db.get('SELECT verification_code FROM users WHERE id = ?', [userId], (err, row) => {
        if (row && row.verification_code === code) {
            db.run('UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?', [userId]);
            req.session.user.email_verified = 1;
            return res.redirect('/profile');
        } else {
            res.render('verify', { error: 'Неверный код' });
        }
    });
});

router.post('/send', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login');

    const code = crypto.randomInt(100000, 999999).toString();
    const userId = req.session.user.id;

    db.run('UPDATE users SET verification_code = ? WHERE id = ?', [code, userId]);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'portfol.io.ivpeksites@gmail.com',
            pass: 'pwos qkbd xeto hsqr'
        }
    });

    const mailOptions = {
        from: 'portfol.io.ivpeksites@gmail.com',
        to: req.session.user.email,
        subject: 'Код подтверждения Email',
        text: `Ваш код подтверждения: ${code}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Ошибка отправки:', error);
            return res.send('Ошибка при отправке письма');
        }
        res.redirect('/verify');
    });
});

module.exports = router;