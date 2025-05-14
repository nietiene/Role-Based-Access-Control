const mysql = require('mysql2');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const app = express();
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'factorise@123', // your password
  database: 'node_role'
});

conn.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected...');
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'crudsecret',
  resave: false,
  saveUninitialized: true
}));

// Middleware for role check
function isAdmin(req, res, next) {
  if (req.session.role === 'admin') return next();
  return res.send('Access Denied. Admins only.');
}

function isAuth(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/login');
}

// Login route
app.get('/login', (req, res) => {
  res.render('login');
});
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  conn.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) throw err;
    if (results.length && bcrypt.compareSync(password, results[0].password)) {
      req.session.userId = results[0].id;
      req.session.role = results[0].role;
      res.redirect('/');
    } else {
      res.render("login");
    }
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Show all users
app.get('/', isAuth, (req, res) => {
  conn.query('SELECT * FROM users', (err, results) => {
    if (err) throw err;
    res.render('index', { users: results, session: req.session });
  });
});

// Create new user
app.post('/add', (req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  conn.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

// Edit form
app.get('/edit/:id', isAuth, (req, res) => {
  conn.query('SELECT * FROM users WHERE id = ?', [req.params.id], (err, results) => {
    if (err) throw err;
    res.render('edit', { user: results[0] });
  });
});

// Update
app.post('/update/:id', (req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  conn.query('UPDATE users SET username=?, password=? WHERE id=?', [username, hashed, req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

// Delete
app.get('/delete/:id', isAdmin, (req, res) => {
  conn.query('DELETE FROM users WHERE id=?', [req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
