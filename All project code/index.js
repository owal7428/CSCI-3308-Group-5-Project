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

/**
 * Generates a complete request URL to send to meteomatics with various parameters
 * @param {string} startTime Start time for the time-range of data request.
 * - Format (ISO 8601), in UTC: YYYY-MM-DDThh:mm:ssZ
 * - Up to 24h in the past. 
 * @param {string} endTime End time for the time-range of data request. 
 * - Format(ISO 8601), in UTC: YYYY-MM-DDThh:mm:ssZ
 * - Up to 10 days in the future.
 * @param {string} locationLattitude Latitude of request location.
 * - Example: "47.419708"
 * @param {string} locationLongitude Longitude of request location.
 * - Example: "9.358478"
 * @param {Array.<string>} requestParameters Readable Parameters in an array.
 * - Format: ["wind speed, temperature"]
 * - Options: 
 * - - ["wind speed", "wind direction", "wind gusts 1 hour", "wind gusts 24 hours", "temperature", "max temperature", "min temperature", "mean sea pressure", "precipitation 1 hour", "precipitation 24 hours", "weather symbol 1 hour", "weather symbol 24 hours", "uv index", "sunrise", "sunset"]
 * - Up to 10 parameters can be used at once.
 * @param {string} dataFormat Format of response data
 * - Example: "json"
 * @param {string} optionalParameters Optional parameters to add to the end of the request.
 * @returns {string} Complete Request URL to send to Meteomatics
 */
function generateMeteomaticsRequestURL(startTime, endTime, locationLattitude, locationLongitude, requestParameters, dataFormat, optionalParameters) {
    let validdatetime = `${startTime}--${endTime}`;
    let location = `${locationLattitude},${locationLongitude}`;

    // Generate API parameter request from list of readable parameters.
    let parameters = ``;
    let generateParametersFailed = false;
    for (let i = 0; i < requestParameters.length; i++) {
        readableParameter = requestParameters[i].toLowerCase();

        // Switch statement to convert our readableParameter input into the API request's format (with error checking)
        switch (readableParameter) {
            // Valid parameters determined by https://www.meteomatics.com/en/api/available-parameters/#api-basic
            case "wind speed":
                parameters += "wind_speed_10m:ms";
                break;
            case "wind direction":
                parameters += "wind_dir_10m:d";
                break;
            case "wind gusts 1 hour":
                parameters += "wind_gusts_10m_1h:ms";
                break;
            case "wind gusts 24 hours":
                parameters += "wind_gusts_10m_24h:ms";
                break;
            case "temperature":
                parameters += "t_2m:C";
                break;
            case "max temperature":
                parameters += "t_max_2m_24h:C";
                break;
            case "min temperature":
                parameters += "t_min_2m_24h:C";
                break;
            case "mean sea pressure":
                parameters += "msl_pressure:hPa";
                break;
            case "precipitation 1 hour":
                parameters += "precip_1h:mm";
                break;
            case "precipitation 24 hours":
                parameters += "precip_24h:mm";
                break;
            case "weather symbol 1 hour":
                parameters += "weather_symbol_1h:idx";
                break;
            case "weather symbol 24 hours":
                parameters += "weather_symbol_24h:idx";
                break;
            case "uv index":
                parameters += "uv:idx";
                break;
            case "sunrise":
                parameters += "sunrise:sql";
                break;
            case "sunset":
                parameters += "sunset:sql";
                break;
            default:
                console.log(`Unsupported parameter requested!: ${readableParameter}`);
                generateParametersFailed = true;
                break;
        }

        // Check if we (incorrectly) exceeded our max parameters. Cut off parameters that exceed the limit.
        const maxParameters = 10;
        if (i > maxParameters) {
            console.log(`Max parameters (${maxParameters}) exceeded. Cutting off further parameters!`);
            break;
        }

        // Only add comma divisor if there is a parameter that follows.
        if (i < requestParameters.length - 1) {
            parameters += `,`;
        }
    }

    if (generateParametersFailed) {
        console.warn(`Trying to send an invalid request to meteomatics. Please change request parameters.`);
        // return;
    }

    let url = `api.meteomatics.com/${validdatetime}/${parameters}/${location}/${dataFormat}`;

    if (optionalParameters != undefined) {
        url += `/${optionalParameters}`
    }

    console.log(`Generated meteomatics url: ${url}`);

    return url;
}

// Weather API access: using meteomatics.com
app.get('/search', (req, res) => {
    // Request parameters passed in as queries

    // TODO take these values from the user/context

    let currDate = new Date().getUTCDate();
    let validdatetime = ``; // the time we want the data for. Can be a single in time, or a range of time, with specified intervals.

    let location = ``; // the location we want the data for. 1 location per query (in basic package)
    let parameters = ``; // the data parameters we want back. 10 parameters per query, each separated with commas.

    const format = `json` // currently intending to only use JSON formatting, but left as a constant here in case that changes.

    // make axios API call
    axios({
        // URL Format: api.meteomatics.com/validdatetime/parameters/locations/format?optionals
        url: generateMeteomaticsRequestURL("startTime", "endtime", "47", "9", ["wind speed", "temperature"], "json"),
        method: 'GET',
        dataType: format,
        auth: {
            username: process.env.METEO_USER,
            password: process.env.METEO_PASSWORD
        }
    })
        .then(results => {
            // Send some parameters
            console.log(`Axios API call succeeded! Response: ${results}`);
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
