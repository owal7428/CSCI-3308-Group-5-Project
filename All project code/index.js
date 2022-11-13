const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');

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
    res.redirect("/landing");
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
        res.redirect("/login?success=true");
    })
    .catch(() => {
        res.render("pages/register", {
            message: "Registration failed! Try a different username.",
            error: true
        });
    });
});

app.get("/login", (req, res) => {
    if (req.query.success == "true")
    {
        res.render("pages/login", {
            message: "You have successfully registered!",
        });
    }
    
    res.render("pages/login");
});

// Handles user login from a /login POST request.
app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const query = "SELECT * FROM users WHERE username = $1";

    db.any(query, [username])
    .then(async (user) => {

        //Checks if an account registered under the given username exists
        if (user[0] == null)
        {
            res.render("pages/login", {
                message: "No account exists with that username.",
                error: true
            });
        }

        const match = await bcrypt.compare(password, user[0].password);
        
        //Checks if password matches
        if (match)
        {
            req.session.user = username;
            req.session.user.flight_api_key = process.env.flight_api_key;
            req.session.save();
            res.redirect("/main");
        }
        else
        {
            res.render("pages/login", {
                message: "Incorrect password for given username.",
                error: true,
            });
        }
    })
    .catch((err) => {
        console.log(err.message);
        res.render("pages/login", {
            message: err.message,
            error: true,
        });
    });
});

app.get("/landing", (req, res) => {
    res.render("pages/landing")
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

/*Code for pages not including login and register go in after here*/

app.get("/profile", (req, res) => {

    let month; //Stores the month to be displayed
    let displayDay; //Stores the day to be displayed. For purposes of the ejs logic this will always be set to the Sunday at the beginning of the week that includes the day to be viewed
    let year; //Stores the year to be displayed
    let week; //Stores the offset week from the current day. Used to keep track of the dates shown in relation to the current day
    let today = new Date();
    const currDay = today.getDate();  //Stores the actual current day, used specifically for highlighting the current day

    if(req.query.month && req.query.displayDay && req.query.year && req.query.week) { //If a full request is sent in, all values are forwarded to the frontent as-is
        month = parseInt(req.query.month);
        displayDay = parseInt(req.query.displayDay);
        year = parseInt(req.query.year);
        week = parseInt(req.query.week);
    }
    else { //Default. If anything is missing from the request it will just reset to the current actual day
        today.setDate(today.getDate() - today.getDay()); //This normalizes the date being sent so that the frontend is always sent a Sunday
        month = today.getMonth() + 1; //getMonth returns 0-11 so +1 is used to transform it to a calendar-readable format
        displayDay = today.getDate();
        year = today.getFullYear();
        week = 0; //Default has a week offset of 0
    }

    res.render("pages/profile", {date: {
        month: month,
        displayDay: displayDay,
        year: year,
        week: week,
        currDay: currDay
    }});
});

//using axios Check status for flights that scheduled
//plug lat and long into 
//https://airlabs.co/docs/flights
// database configuration

app.get("/flights", (req, res) => {
    axios({
        url: "http://api.aviationstack.com/v1/flights",
        method: 'GET',
        dataType:'json',
        params: {
            "access_key": process.env.flight_api_key,
            "limit": 40,
            "flight_status": "scheduled",
            "dep_icao": "KDEN",
        }
    })
    .then(results => {
        console.log("Successful API call");
        console.log(results.data);
        res.render("pages/flights", {
            results: results.data,
        });
    })
    .catch(error => {
        // Handle errors
        console.log("Failed API call");
        console.log(process.env.flight_api_key);
        console.log(error.message);
        res.render("pages/flights", {
            results: [],
            error: true,
            message: error.message,
        });
    });
});

app.get("/main", (req, res) => {
    console.log("flight key:");
    console.log(process.env.flight_api_key);
    res.render("pages/main");
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.render("pages/logout");
});

app.listen(3000);
console.log('Server is listening on port 3000');
