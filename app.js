const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const projectRoutes = require('./routes/projects');
const indexRoutes = require('./routes/index');
const searchRoutes = require('./routes/search');
const verifyRoutes = require('./routes/emailHandle');
const db = require("./models/db");
const adminRoutes = require('./routes/admin')
const validateInput = require('./models/validateInput');
const { promisify } = require('util');
const dbGet = promisify(db.get.bind(db));
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });
require('dotenv').config();

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.db', dir: './db' }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    secure: false, //Потом поменять на true
    sameSite: 'strict',
  }
}));

app.use(async (req, res, next) => {
  if (req.session.user) {
    res.locals.user = await dbGet(`SELECT *
                                   FROM users
                                   WHERE id = ?`, req.session.user.id);
  } else {
    res.locals.user = null;
  }
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(validateInput);

app.use(csrfProtection);

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.warn('Нарушение CSRF-защиты:', req.ip, new Date().toISOString());
    res.status(403).send('Форма устарела или недействительна. Перезагрузите страницу и попробуйте снова.');
  } else {
    next(err);
  }
});


app.set('view engine', 'ejs');
app.use('/', authRoutes);
app.use('/', indexRoutes);
app.use('/', searchRoutes);
app.use('/', projectRoutes);
app.use('/profile', profileRoutes);
app.use('/projects', projectRoutes);
app.use('/admin', adminRoutes);
app.use('/verify', verifyRoutes);

app.listen(3000, () => console.log('Сервер запущен на http://localhost:3000'));