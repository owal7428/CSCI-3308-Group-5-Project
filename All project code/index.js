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

// Handles user login from a /login POST request.
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

app.get("/profile", (req, res) => {

    let month;
    let day;
    let year;
    let today = new Date();

    if(req.query.month) {
        month = parseInt(req.query.month);
    }
    else {
        month = today.getMonth();
    }

    if(req.query.day) {
        day = parseInt(req.query.day);
    }
    else {
        day = today.getDate();
    }

    if(req.query.year) {
        year = parseInt(req.query.year);
    }
    else {
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

// Weather API access: using meteomatics.com
app.get('/search', (req, res) => {
    // Request parameters passed in as queries

    // TODO take these values from the user/context
    let validdatetime = ``; // the time we want the data for. Can be a single in time, or a range of time, with specified intervals.
    let location = ``; // the location we want the data for. 1 location per query (in basic package)
    let parameters = ``; // the data parameters we want back. 10 parameters per query, each separated with commas.

    const format = `json` // currently intending to only use JSON formatting, but left as a constant here in case that changes.

    // make axios API call
    axios({
        // URL Format: api.meteomatics.com/validdatetime/parameters/locations/format?optionals
        url: `api.meteomatics.com/${validdatetime}/${parameters}/${location}/${format}`,
        method: 'GET',
        dataType: 'json',
        params: {
            "apikey": req.session.user.api_key
            // additional parameters to send to meteomatics.com go here
        }
    })
        .then(results => {
            // Send some parameters
            res.render('pages/visit.ejs', {
                // Parameters to send to the user on the webpage go here
                // message: `Axios API call succeeded! Events: ${results.data._embedded.events}`,
            });
        })
        .catch(error => {
            // Handle errors (API call may have failed!)
            console.log(error);
            res.render('pages/visit.ejs', {
                message: `Axios API call failed! Error: ${error}`,
                error: true
            });
        });

});

app.listen(3000);
console.log('Server is listening on port 3000');
