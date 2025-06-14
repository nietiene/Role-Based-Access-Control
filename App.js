const mysql = require('mysql2');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const flash = require("connect-flash");
const multer = require("multer");
const path = require("path");
const app = express();

app.use(express.static('public'))
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // to create unique name at each image
  }
});
const upload = multer({ storage });
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
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});
// Middleware for role check
function isAdmin(req, res, next) {
  if (req.session.role === 'admin') return next();
  return res.send('Access Denied. Admins only.');
}

function isAuth(req, res, next) {
  if (req.session.userId) return next();
  req.flash('error', 'you must logged in to access this page');
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
    if (results.length > 0) {
      const hashedPassword = results[0].password;
       console.log("Entered Passowrd:", password)
       console.log("Entered Passowrd:", hashedPassword);
       console.log("Match passowrd:", bcrypt.compareSync(password, hashedPassword));
      if (bcrypt.compareSync(password, hashedPassword)) {
      req.session.userId = results[0].id;
      req.session.role = results[0].role;
      req.session.profile_pic = results[0].profile_pic;
      req.flash('success', 'Successfully logged in');
      return res.redirect(results[0].role === 'admin' ? '/admin' : '/user');
    } else {
      req.flash('error', 'Invalid password');
      res.redirect('/login');
    }
  }else {
      req.flash('error', 'invalid credentials');
      res.render("login");
    }
  });
  
});

app.get('/admin', isAuth, (req, res) => {
  if (req.session.role !== 'admin') return res.send('Access denied');
  res.render('admin', { session: req.session })
});

app.get('/user' , isAuth, (req, res) => {
  const userId = req.session.userId;
  conn.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) throw err;
    res.render('user', { user: results[0] })
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
app.get('/register', isAuth, isAdmin,(req, res) => {
  res.render("register");
})
app.post('/register', isAdmin, isAuth, upload.single('profile_pic'),(req, res) => {
  const { username, password, role } = req.body;
  const profile_pic = req.file ? req.file.filename : null;
  const hashed = bcrypt.hashSync(password, 10);

  conn.query(
    'INSERT INTO users (username, password, role, profile_pic) VALUES (?, ?, ?, ?)',
    [username, hashed, role || 'user', profile_pic],
    (err) => {
      if (err) throw err;
      res.redirect('/');
    }
  );
});

// Edit form
app.get('/edit/:id', isAuth,(req, res) => {
  conn.query('SELECT * FROM users WHERE id = ?', [req.params.id], (err, results) => {
    if (err) throw err;
    res.render('edit', { user: results[0] });
  });
});

// Update
app.post('/edit/:id',  upload.single('profile_pic'),(req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  const profile_pic = req.file ? req.file.filename : null;
  
  const query = profile_pic 
    ? 'UPDATE users SET username = ?, passowrd = ?, profile_pic = ? WHERE id = ?'
    : 'UPDATE users SET username = ?, password = ? WHERE id = ? ';

    const params = profile_pic
      ? [username, hashed, profile_pic, req.params.id]
      : [username, hashed, req.params.id];

   conn.query(query, params, (err) => {
    if (err) throw err;
    res.redirect('/');
   })   
});

// Delete
app.get('/delete/:id', isAdmin, (req, res) => {
  conn.query('DELETE FROM users WHERE id=?', [req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

// get account for user
app.get('/add', (req, res) => {
  res.render('add');
});

// handle insert logic
app.post('/add', upload.single('profile_pic'), (req ,res) => {
   const { username, password,  } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  const profile_pic = req.file ? req.file.filename : null;
  conn.query(
    'INSERT INTO users (username, password, profile_pic) VALUES (?, ?, ?)',
    [username, hashed, profile_pic],
    (err) => {
      if (err) throw err;
      res.redirect('/user');
    }
  );
});


app.listen(3000, () => console.log('Server running on http://localhost:3000'));
