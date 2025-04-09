const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const projectRoutes = require('./routes/projects');

app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.db', dir: './db' }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 день
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/profile', profileRoutes);
app.use('/projects', projectRoutes);

app.get('/', (req, res) => {
  res.render('index', { title: 'Добро пожаловать!' });
});

app.listen(3000, () => console.log('Сервер запущен на http://localhost:3000'));


app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', authRoutes);
app.use('/', projectRoutes);