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
    if(req.session.user) {
        res.redirect("/main");
    }
    else {
        res.redirect("/landing");
    }
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
        req.session.user = username;
        req.session.user.flight_api_key = process.env.flight_api_key;
        req.session.save();
        res.render("pages/main", {
            message: "Your account was sucessfully created! Happy Hunting!",
            error: false
        });
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

// The fields to render on the search page to make the search request.
const weatherFields = [
    // name is the js parameter name to be used in POST requests. Label is what is shown to the user.
    {name: "startTime", label: "Start Time", required: true},
    {name: "endTime", label: "End Time", required: true},
    {name: "locationLatitude", label: "Location Latitude", required: true},
    {name: "locationLongitude", label: "Location Longitude", required: true},
    {name: "requestParameters", label: "Request Parameters", required: true},
    {name: "dataFormat", label: "Data Format", required: true},
    {name: "optionalParameters", label: "Optional Parameters", required: false},
];

// Display weather search page
app.get("/searchWeather", (req, res) => {
    res.render("pages/searchWeather", {
        searchFields: weatherFields
    });
});

/**
 * Generates a complete request URL to send to meteomatics with various parameters
 * @param {string} startTime Start time for the time-range of data request.
 * - Format (ISO 8601), in UTC: YYYY-MM-DDThh:mm:ssZ
 * - Up to 24h in the past. 
 * @param {string} endTime End time for the time-range of data request. 
 * - Format(ISO 8601), in UTC: YYYY-MM-DDThh:mm:ssZ
 * - Up to 10 days in the future.
 * @param {string} locationLatitude Latitude of request location.
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
function generateMeteomaticsRequestURL(startTime, endTime, locationLatitude, locationLongitude, requestParameters, dataFormat, optionalParameters) {
    let validdatetime = `${startTime}--${endTime}`;
    let location = `${locationLatitude},${locationLongitude}`;

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
                console.log(`Unsupported parameter requested!: "${readableParameter}"`);
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
        console.error(`Trying to send an invalid request to meteomatics. Please change request parameters.`);
        return;
    }

    let url = `https://api.meteomatics.com/${validdatetime}/${parameters}/${location}/${dataFormat}`;

    if (optionalParameters != undefined) {
        url += `/${optionalParameters}`
    }

    console.log(`Generated meteomatics url: ${url}`);

    return url;
}

function searchQuery(location) {
    // Prepare weather query

    // Calculate start/end dates for weather API access, ranging from 1 day in the past to 10 days in the future.
    let weatherStartDate = new Date(); // current date
    weatherStartDate.setDate(weatherStartDate.getDate() - 1); // 1 day in the past
    let weatherEndDate = new Date(); // current date
    weatherEndDate.setDate(weatherEndDate.getDate() + 10); // 10 days in the future
    

    // Input data to weather API
    const weatherQuery = {
        time: {
            start: weatherStartDate.toISOString(),
            end: weatherEndDate.toISOString()
        },
        location: {
            // TODO take location data from user, and calculate latitude and longitude from that.
            country: ``,
            state: ``,
            city: ``,
            latitude: 12,
            longitude: 8
        },
        requestParameters: [
            "temperature",
            "precipitation 24 hours"
        ],
        dataFormat: "json",
        optionalParameters: {}
    };

    // Prepare flight query
    const flightQuery = {
        // Flight query request information here.
    }

    // Perform API queries
    const weatherData = searchWeather(weatherQuery);
    const flightData = searchFlights(flightQuery);

    // Return results from API queries.
    return {
        weather: weatherData, 
        flight: flightData
    };
}

// Perform API query to weather API
function searchWeather(weatherQuery) {
    // URL Format: api.meteomatics.com/validdatetime/parameters/locations/format?optionals
    // url: generateMeteomaticsRequestURL("2022-11-9T15:30:00Z", "2022-11-10T15:30:00Z", "47", "9", ["wind speed", "temperature"], format),
    const url = generateMeteomaticsRequestURL(weatherQuery.time.start, weatherQuery.time.end, weatherQuery.location.latitude, weatherQuery.location.longitude, weatherQuery.requestParameters, weatherQuery.dataFormat, weatherQuery.optionalParameters);

    // Response data from weather API call, assigned from axios result below.
    let responseData;

    // make axios API call
    axios({
        url: url,
        method: 'GET',
        dataType: weatherQuery.dataFormat,
        auth: {
            // auth specified from .env file.
            username: process.env.METEO_USER,
            password: process.env.METEO_PASSWORD
        }
    })
    .then(results => {
        // API call success

        // results has varying structure depending on datatype
        if (weatherQuery.dataFormat === "json") {
            responseData = results.data.data;
        } else if (weatherQuery.dataFormat === "html") {
            responseData = results.data;
        }
    })
    .catch(error => {
        // API call failed
        // Handle errors (API call may have failed!)
        console.log(`Weather API call failed! Error:\n${error}`);
        return; // bad response. Make sure to check for this value in error handling.
    });
        
    console.log(`Weather API call succeeded! Response:\n${JSON.stringify(responseData)}`);
    return responseData;
}

// Perform API query to flight API
function searchFlights(flightQuery) {
    return {
        data: "TODO response flight data"
    };
}

// Converts a string separated by divisor into an array, with whitespace trimmed from elements
function stringToArray(str, divisor=",") {
    // Split the string by the divisor into an array
    let array = str.split(divisor);

    // Trim whitespace at beginning and end of each element
    for (let i = 0; i < array.length; i++) {
        array[i] = array[i].trim();
    }

    return array;
}

// Convert responseData from API responses to the format we use on displaying to the user.
function dataToDisplayData(responseData) {
    return responseData; // for now, just pass the same data. TODO make conversion based on frontend needs.
}

app.get("/search", async (req, res) => {
    res.render("pages/search");
});

app.post("/search", async (req, res) => {
    const locationInput = req.body.location;

    console.log(`Recieved location input: ${locationInput}`);

    // Data receieved back from any APIs.
    const responseData = searchQuery(locationInput);

    console.log(`Response API Data:\n${JSON.stringify(responseData)}`);

    // Data we need in a usable form for frontend.
    const displayData = dataToDisplayData(responseData);
    console.log(`Displaying results with this data:\n${JSON.stringify(displayData)}`);

    console.log(JSON.stringify(responseData));
    // render the searchResults.ejs page with usable displayable data.
    res.render("pages/searchResults", displayData);
});

// Weather API access: using meteomatics.com
app.post('/searchWeather', (req, res) => {
    console.log("Running /searchWeather GET request");
    // Request parameters passed in as queries

    // make axios API call
    axios({
        // URL Format: api.meteomatics.com/validdatetime/parameters/locations/format?optionals
        // url: generateMeteomaticsRequestURL("2022-11-9T15:30:00Z", "2022-11-10T15:30:00Z", "47", "9", ["wind speed", "temperature"], format),
        url: generateMeteomaticsRequestURL(req.body.startTime, req.body.endTime, req.body.locationLatitude, req.body.locationLongitude, stringToArray(req.body.requestParameters), req.body.dataFormat, req.body.optionalParameters),
        method: 'GET',
        dataType: req.body.dataFormat,
        auth: {
            // auth specified from .env file.
            username: process.env.METEO_USER,
            password: process.env.METEO_PASSWORD
        }
    })
        .then(results => {
            // Send some parameters
            console.log(`dataFormat: "${req.body.dataFormat}"`);
            let data;

            // results has varying structure depending on datatype
            if (req.body.dataFormat === "json") {
                data = results.data.data;
            } else if (req.body.dataFormat === "html") {
                data = results.data;
            }

            console.log(`Axios API call succeeded! Response: ${JSON.stringify(data)}`);
            res.render('pages/weatherResults.ejs', {
                // Parameters to send to the user on the webpage go here
                data: data, // resulting data is an array of each response parameter's data objects.
                dataFormat: req.body.dataFormat
            });
        })
        .catch(error => {
            // Handle errors (API call may have failed!)
            console.log(error);
            res.render('pages/weatherResults.ejs', {
                message: `Axios API call failed! Error: ${error}`,
                error: true
            });
        });

});


app.get("/main", (req, res) => {
    res.render("pages/main");
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.render("pages/landing", {
        message: "You have been successfully logged out",
        error: false
    });
});



app.listen(3000);
console.log('Server is listening on port 3000');
