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
  
// test your database
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

app.use(express.static(__dirname + '/resources'));

app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/register", (req, res) => {
    res.render("pages/register");
});

app.post("/register", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const hash = await bcrypt.hash(password, 10);

    const query = "INSERT INTO users (username, password) VALUES ($1, $2)";

    db.any(query, [username, hash])
    .then(() => {
        res.redirect("/login");
    })
    .catch(() => {
        res.redirect("/register");
    });
});

app.get("/login", (req, res) => {
    res.render("pages/login");
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const query = "SELECT * FROM users WHERE username = $1";

    db.any(query, [username])
    .then(async (user) => {
        const match = await bcrypt.compare(password, user[0].password);

        if (match)
        {
            req.session.user = "TEST";
            req.session.save();
            res.redirect("/main");
        }
        else
        {
            console.log("Incorrect username or password.");
            res.redirect("/login");
        }
    })
    .catch((err) => {
        console.log(err.message);
        res.redirect("/login");
    });
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

app.listen(3000);
console.log('Server is listening on port 3000');
