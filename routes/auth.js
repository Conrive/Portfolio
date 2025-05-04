const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { createUser, findUserByEmail, findUserByUsername } = require('../models/userModel');

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;

    let user;

    if (identifier.includes('@')) {
        user = await findUserByEmail(identifier);
    } else {
        user = await findUserByUsername(identifier);
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.render('login', { error: 'Неверный email или пароль' });
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
    res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (await findUserByEmail(email)) {
        return res.render('register', { error: 'Email уже используется' });
    }

    await createUser(name, email, password);
    res.redirect('/login');
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;
