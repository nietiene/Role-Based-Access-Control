const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
const { connect } = require("http2");
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

// Checking if user is authorised or not
function IsLoggedIn (req, res, next) {
    if (!req.session.IsLoggedIn) {
        res.render("login");
    } else {
        next();
    }
}
const connection = mysql.createConnection({
    host: process.env.HOST_NAME,
    user: process.env.USER_NAME,
    password: process.env.PASSWORD,
    database: process.env.DB_NAME,
});

// Get form for Login
App.get('/login', (req, res) => {
    res.render("login");
});

// handle Login logic
connection.connect((err) => {
    if (err) {
        console.log("ERROR:", err);
    } else { 
      console.log("Connected successfully");
    }
});

// Insert endpoint 
App.get('/addNew', (req, res) => {
     res.render("addNew");
});

// Handle insert operation
App.post('/addNew', (req, res) => {
    const { name, password } = req.body;
    const handleInsert = "INSERT INTO mysql(name, password) VALUES(?, ?)";
    connection.query(handleInsert, [name, password], (err) => {
        if (err) throw err;
        res.redirect("/user");
    });
});

App.get('/user', (req, res) => {
    const sqlSelect = "SELECT * FROM mysql";
    connection.query(sqlSelect, (err, result) => {
        if (err) {
            throw err;
        } else {
            res.render("user", {user: result});
        }
    })
})

// get uppdate form
App.get("/update/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const updateForm = "SELECT * FROM mysql WHERE id = ?";
    connection.query(updateForm, id ,(err, result) => {
        if (err) throw err;
        res.render("updateForm", {user: result[0]});
    });
});

// Handle Update Operation
App.post("/update/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const { name, password } = req.body;
    const handleUpdate = "UPDATE mysql SET name = ?, password = ? WHERE id = ?";
    connection.query(handleUpdate, [name, password, id], (err) => {
        if (err) throw err;
        res.redirect("/user");
    })
})

// handle delete operation
App.get("/delete/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const sqlDelete = "DELETE FROM mysql WHERE id = ?";
    connection.query(sqlDelete, id, (err) => {
        if (err) {
            throw err;
        } else {
            res.redirect("/user");
        }
    })
})
const PORT = process.env.PORT;
App.listen(PORT, () => console.log(`http://localhost:${PORT}`));