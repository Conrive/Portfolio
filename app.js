const express = require('express');
const app = express();
const path = require('path');

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { title: 'Добро пожаловать!' });
});

app.listen(3000, () => console.log('Сервер запущен на http://localhost:3000'));
