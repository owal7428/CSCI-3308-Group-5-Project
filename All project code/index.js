const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');

// database configuration
const dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
};
  
const db = pgp(dbConfig);
  
// test the database
db.connect()
    .then(obj => {
        console.log('Database connection successful'); // you can view this message in the docker compose logs
        obj.done(); // success, release the connection;
    })
    .catch(error => {
        console.log('ERROR:', error.message || error);
});

app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.use( session({
    secret: "THISISATEST",
    saveUninitialized: false,
    resave: false,
})
);
    
app.use(bodyParser.urlencoded({
    extended: true,
})
);

// set access for static files in the /resources folder
// for example, in ejs: href="/css/style.css" would reference the file "/resources/css/style.css"
app.use(express.static(__dirname + '/resources'));

// Sets "/" location to redirect to /login page. We may want to change this to /home (or have /home located here at /)
app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/register", (req, res) => {
    res.render("pages/register");
});

// Handles user registration from a /register POST request
app.post("/register", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    // encrypt password before storing it in database
    const hash = await bcrypt.hash(password, 10);
    
    // Inserts user into database, registering them.
    const query = "INSERT INTO users (username, password) VALUES ($1, $2)";
    
    await db.any(query, [username, hash])
    .then(() => {
        // TODO send the user a success message on the login page stating that the user successfully registered.
        res.redirect("/login");
    })
    .catch(() => {
        const registration_failed_feedback = 'Registration failed! Try a different username.';
        console.log(registration_failed_feedback)
        res.render(`pages/register`, {
            message: registration_failed_feedback,
            error: true
        });
    });
});

app.get("/login", (req, res) => {
    res.render("pages/login");
});

// Handles user login from a /login POST request.
app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const query = "SELECT * FROM users WHERE username = $1";

    let user; // The user found (or not found) in the database

    // Queries database to find matching user for the inputted username.
    await db.any(query, [username])
    .then((foundUser) => {
        user = foundUser[0];
    })
    .catch((err) => {
        // Something went wrong, refresh the page for the user to try again.
        res.redirect("/login");
        return console.log(err.message);
    });

    const incorrect_login_feedback = "Incorrect username or password."

    if (user == null) {
        // User not found in database, so username does not exist.
        console.log(incorrect_login_feedback);
        res.render("pages/login", {
            message: incorrect_login_feedback,
            error: true
        });

        // early return so a password (that doesn't exist) isn't checked, and user isn't authenticated.
        return; 
    }

    // Check if (encrypted) passwords match
    const password_match = await bcrypt.compare(password, user.password);

    if (password_match !== true) {
        // Password is incorrect.
        console.log(incorrect_login_feedback);
        res.render("pages/login", {
            message: incorrect_login_feedback,
            error: true
        });
        // early return, so user isn't authenticated.
        return;
    }

    // Authenticate user
    req.session.user = "TEST";
    req.session.save();

    // Send to the logged-in homepage.
    res.redirect("/main");
});

app.get("/profile", (req, res) => {

    let month;
    let day;
    let year;

    if(req.query.month && req.query.day && req.query.year) {
        month = parseInt(req.query.month);
        day = parseInt(req.query.day);
        year = parseInt(req.query.year);
    }
    else {
        let today = new Date();
        today.setDate(today.getDate() - today.getDay());
        month = today.getMonth() + 1;
        day = today.getDate();
        year = today.getFullYear();
    }

    res.render("pages/profile", {date: {
        weekday: 'Sunday',
        month: month,
        day: day,
        year: year
    }});
});

// Authentication Middleware.
const auth = (req, res, next) => {
    if (!req.session.user) {
      // Default to register page.
      return res.redirect('/login');
    }
    next();
};
  
// Authentication Required
app.use(auth);

app.get("/main", (req, res) => {
    res.render("pages/main");
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.render("pages/logout");
});

app.listen(3000);
console.log('Server is listening on port 3000');
