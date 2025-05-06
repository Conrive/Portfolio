const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { createUser, findUserByEmail, findUserByUsername } = require('../models/userModel');
const rateLimit = require('express-rate-limit');

router.get('/login', (req, res) => {
    const token = req.csrfToken();
    res.render('login', { error: null, csrfToken: token });
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const ip = req.ip;
        const time = new Date().toISOString();
        console.warn(`[LOGIN RATE LIMIT] ${ip} превысил лимит входа — ${time}`);

        res.status(429);
        res.render('login', { error: 'Слишком много попыток входа. Попробуйте снова через 15 минут.' });
    }
});

router.post('/login', loginLimiter, async (req, res) => {
    const { identifier, password } = req.body;

    // Проверка reCAPTCHA
    //const secretKey = ''; // Вставить после поставления на хост
    //try {
    //    const captchaVerify = await axios.post(
    //        `https://www.google.com/recaptcha/api/siteverify`,
    //        null,
    //        {
    //            params: {
    //                secret: secretKey,
    //                response: token
    //            }
    //        }
    //    );
    //
    //    if (!captchaVerify.data.success) {
    //        return res.render('login', { error: 'Подтвердите, что вы не робот' });
    //    }
    //} catch (err) {
    //    console.error('Ошибка проверки reCAPTCHA:', err);
    //    return res.render('login', { error: 'Ошибка проверки reCAPTCHA' });
    //}

    let user;

    if (identifier.includes('@')) {
        user = await findUserByEmail(identifier);
    } else {
        user = await findUserByUsername(identifier);
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
        await bcrypt.compare('dummy', '$2b$10$abcdefghijklmnopqrstuv');
        return res.status(401).render('login', {
            error: 'Неверный email или пароль',
            csrfToken: req.csrfToken()
        });
    }

    req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        cover: user.cover,
        bio: user.bio,
        github: user.github,
        telegram: user.telegram,
        linkedin: user.linkedin,
        role: user.role };
    res.redirect('/');
});

router.get('/register', (req, res) => {
    const token = req.csrfToken();
    res.render('register', { error: null, csrfToken: token });
});

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (await findUserByEmail(email)) {
        return res.render('register', { error: 'Email уже используется' });
    }

    try {
        await createUser(name, email, password);
        res.redirect('/login');
    } catch (err) {
        console.log(err);
        res.render('/register', { error: 'Ошибка регистрации' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;
