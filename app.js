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
const db = require("./models/db");
const { promisify } = require('util');
const dbGet = promisify(db.get.bind(db));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.db', dir: './db' }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 день
}));

app.use(async (req, res, next) => {
  if (req.session.user) {
    const user = await dbGet(`SELECT * FROM users WHERE id = ?`, req.session.user.id);
    res.locals.user = user;
  } else {
    res.locals.user = null;
  }
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.use('/profile', profileRoutes);
app.use('/projects', projectRoutes);
app.use('/', searchRoutes);
app.use('/', authRoutes);
app.use('/', projectRoutes);
app.use('/', indexRoutes);

app.listen(3000, () => console.log('Сервер запущен на http://localhost:3000'));