const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const App = express();
App.use(bodyParser.urlencoded({extended: true}));
App.set("view engine", "ejs");
App.use(cors());
App.set("views", path.join(__dirname, "views"));
App.use(session({
    secret: 'factorise@123',
    resave: false,
    saveUninitialized: false,
}));

const connection = mysql.createConnection({
    host: process.env.HOST_NAME,
    user: process.env.USER_NAME,
    password: process.env.PASSWORD,
    database: process.env.DB_NAME,
});

// check if it is admin logged in 
function IsAdmin(req, res, next) {
    if (req.session.role !== "admin") {
        return res.redirect("/user");
    }
    next();
}

// Checking if user is authorised or not
function IsLoggedIn (req, res, next) {
    if (!req.session.IsLoggedIn) {
        res.redirect("login");
    }
        next();
}

// Get form for Login
App.get('/login', (req, res) => {
    res.render("login", {error: null});
});

// handle Login logic
App.post("/login", (req, res) => {
    const { name, password } = req.body;
       if (!name && !password) {
            res.render("login", {error: "Both name and password are required"});
        }
     const sql = "SELECT * FROM mysql WHERE name = ? AND password = ?";
     connection.query(sql, [name, password], (error, result) => {
        if (error){
        res.render("login", {error: "Database error"});
      }
      if (result.length > 0) {
        req.session.IsLoggedIn = true;
        req.session.name = result[0].name;
        req.session.role = result[0].role;
        res.redirect("/user");
      } else {
        res.render('login', {error: "Invalid credentials"});
      }
      
    });
});

// disable eccess system after logging out
App.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
    next();
})
// Peform logout operation
App.get('/logout', (req, res) => {
    req.session.destroy(error => {
        if (error) throw error;
        res.redirect("/login");
    });
});

// Insert endpoint 
App.get('/addNew', IsLoggedIn, IsAdmin ,(req, res) => {
     res.render("addNew");
});

// Handle insert operation
App.post('/addNew', IsLoggedIn, IsAdmin, (req, res) => {
    const { name, password, role } = req.body;
    const handleInsert = "INSERT INTO mysql(name, password, role) VALUES(?, ?, ?)";
    connection.query(handleInsert, [name, password, role], (error) => {
        if (error) throw error;
        res.redirect("/user");
    });
});

App.get('/user', IsLoggedIn, (req, res) => {
    const sqlSelect = "SELECT * FROM mysql";
    connection.query(sqlSelect, (error, result) => {
        if (error) throw error;
        res.render("user", {
            user: result,
            nam:req.session.name,
            role: req.session.role
        });

    })
})

// get uppdate form
App.get("/update/:id", IsLoggedIn ,(req, res) => {
    const id = parseInt(req.params.id);
    const updateForm = "SELECT * FROM mysql WHERE id = ?";
    connection.query(updateForm, id ,(error, result) => {
        if (error) throw error;
        res.render("updateForm", {
             user: result[0],
             name: req.session.name, 
             role: req.session.role
        });
    });
});

// Handle Update Operation
App.post("/update/:id", IsLoggedIn,(req, res) => {
    const id = parseInt(req.params.id);
    const { name, password } = req.body;
    const handleUpdate = "UPDATE mysql SET name = ?, password = ? WHERE id = ?";
    connection.query(handleUpdate, [name, password, id], (error) => {
        if (error) throw error;
        res.redirect("/user");
    })
})

// handle delete operation
App.get("/delete/:id", IsLoggedIn, IsAdmin,(req, res) => {
    const id = parseInt(req.params.id);
    const sqlDelete = "DELETE FROM mysql WHERE id = ?";
    connection.query(sqlDelete, id, (err) => {
        if (err) throw err;
        res.redirect("/user");
    });
});
connection.connect((error) => {
    if (error) {
        console.log("ERROR:", error);
    } else { 
      console.log("Connected successfully");
    }
});
const PORT = process.env.PORT;
App.listen(PORT, () => console.log(`http://localhost:${PORT}`));