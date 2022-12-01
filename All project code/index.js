// JSON file that contains countries to ISO 2 character code
// import countryCodeJSON from './resources/countries.json' assert {type: 'json'};


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

// Handles showing the user feedback on a failed login attempt.
function failedLogin(res) {
    // For security reasons, the user should receieve the same feedback on a login fail, regardless of why the login failed.
    res.render("pages/login", {
        message: "Incorrect username or password.",
        error: true
    });
}

// Handles user login from a /login POST request.
app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const query = "SELECT * FROM users WHERE username = $1";

    // Queries the database for existing users, and then checks if password matches before logging in.
    await db.any(query, [username])
    .then(async (user) => {

        //Checks if an account registered under the given username exists
        if (user[0] == null)
        {
            failedLogin(res);
            // early return to prevent race-conditions due to asynchronous behavior
            return;
        }

        const match = await bcrypt.compare(password, user[0].password);
        
        //Checks if password matches
        // Note: == is not the same as === in javascript. The former does a typecast before checking equality, the latter actually checks equality.
        if (match === true)
        {
            req.session.user = username;
            req.session.user.flight_api_key = process.env.flight_api_key;
            req.session.save();
            res.redirect("/main");

            // early return to prevent race-conditions due to asynchronous behavior
            return;
        }

        failedLogin(res);
        // early return to prevent race-conditions due to asynchronous behavior
        return;
    })
    .catch((err) => {
        console.log(err.message);
        failedLogin(res);
        // early return to prevent race-conditions due to asynchronous behavior
        return;
    });
});

app.get("/landing", (req, res) => {
    res.render("pages/landing")
});

app.get("/aboutUs", (req, res) => {
    res.render("pages/aboutUs")
});

app.get("/contactUs", (req, res) => {
    res.render("pages/contactUs")
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
    res.render("pages/profile", {user: req.session.user}); //Sends the username so it can be displayed at the top of the profile page
});

//using axios Check status for flights that scheduled
//plug lat and long into 
//https://airlabs.co/docs/flights
// database configuration

app.get("/flights", (req, res) => {
    res.render("pages/flights", {
        results: [],
    });
});

app.post("/flights", (req, res) => {
    axios({
        url: "http://api.aviationstack.com/v1/flights",
        method: 'GET',
        dataType:'json',
        params: {
            "access_key": process.env.flight_api_key,
            "limit": 40,
            "flight_status": "scheduled",
            "arr_iata": req.body.city,
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

// imports the countries JSON file that containes the names of all countries as well as their 2 character ISO code
var countryJson = require('./resources/countries.json')

// Adds latitude/longitude coordinates using country and city
async function cityToCoordinates(locationInput, res) {
    // declares the country and city inputs
    var country = locationInput.country;
    var city = locationInput.city;
    // API call requires uppercase 2-digit ISO code
    var countryCode;
    // declares latitude and longitude
    var latitude = 0;
    var longitude = 0;
    // alert messages for error handling
    let alertMessage;
    let error = false;
    // if the user inputs anything greater than 2 characters, we must search the JSON file to convert to the 2-char ISO code
    if(country.length > 2){
        country = country.toLowerCase();
        for(var i = 0; i < countryJson.length; i++){
            if(countryJson[i].name == country){
                countryCode = countryJson[i].code;
            }
        }
    }
    // if the user input is 2 characters, we make it uppercase to pass to api
    else{
        country = country.toUpperCase();
    }
    // axios call to API-Ninja geocoding api to return latitude and longitude from city and country input 
    await axios({
        // url for API-Ninja
        url:'https://api.api-ninjas.com/v1/geocoding',
        method: 'GET',
        dataType: 'json',
        headers: {
            'X-Api-Key': process.env.CITYCOOR_KEY
        },
        params: { 
            'city': city,
            'country': countryCode
        }

    }).then(results => {
        // shows devs if correct call
        console.log("Successful API call to API-Ninja for city to coordinates");
        console.log(JSON.stringify(results.data));
        //sets lat and long for weather and flight API
        latitude = results.data[0].latitude;
        longitude = results.data[0].longitude;
        // verifying that lat and long are as I expect 
        console.log("latitude: ", latitude);
        console.log("longitude: ", longitude);
    }).catch(error=> {
        // Handle errors (API call may have failed!)
        console.log('City to Coordinates API call failed! Error:');
        console.log(error.message);
        return -1;
    })
    // If the API call succeeded, but didn't return anything of value
    if((latitude == 0 && longitude == 0) ||(latitude == undefined && longitude == undefined)){
        console.log('Invalid coordinates');
        return -1;
    }
    // return vals for weather and flight API
    else{
        return {
            country: country,
            city: city,
            latitude: latitude,
            longitude: longitude
        }
    }
}

/*
    Tested with:
    1) Input: London, GB: City, CC - Return: London, GB: City, CC
    2) Input: London, gb: City, cc - Return: London, GB: City, CC
    3) Input: london, gb: city, cc - Return: London, GB: City, CC
    4) Input: london, United Kingdom: city, Country - Return: London, GB: City, CC
    5) Input: london, united kingdom: city, country - Return: London, GB, City, CC

*/
async function cityToIATA(locationInput){
    var city = locationInput.city;
    var country = locationInput.country;
    // ensures that the first letter of the city is capitalized, as thats what API requires
    // var city = tempCity[0].toUpperCase() + tempCity.slice(1);
    // ensures city is what Dev expects
    console.log("city:", city);
    //declares country code
    var countryCode;
    // checks if the code is typed in as JSON or as the code itself
    var flag = 0;
    // declares the result of the API as the iata code
    var iataRes = "";
    // capitalizes the first letter in each word in the country name
    if(country.length > 2){
        country = country.toLowerCase();
        for(var i = 0; i < countryJson.length; i++){
            if(countryJson[i].name == country){
                countryCode = countryJson[i].code;
                flag = 1;
            }
        }
    }
    else{
        country = country.toUpperCase();
        flag = 1;
    }
    console.log("Code:", countryCode);
    await axios({
        // url for API-Ninja
        url:'https://api.api-ninjas.com/v1/airports',
        method: 'GET',
        dataType: 'json',
        headers: {
            'X-Api-Key': process.env.CITYCOOR_KEY
        },
        params: { 
            'city': city,
            'country': countryCode
        }

    }).then(results => {
        // shows devs if correct call
        console.log("Successful API call to API-Ninja for city to Airport API");
        console.log(JSON.stringify(results.data));
        //sets lat and long for weather and flight API
        var i = 0;
        results.data.forEach(result => {
            if (result.iata != "")
            {
                iataRes = results.data[i].iata;
            }
            i++;
        });
        // verifying that lat and long are as I expect 
        console.log("IATA: ", iataRes);
    }).catch(error => {
        // Handle errors (API call may have failed!)
        console.log(`Airport to City API call failed! Error:\n${error}`);
        return -1;
    })
    return iataRes;
}

// Perform API query to weather API
async function searchWeather(weatherQuery) {
    // URL Format: api.meteomatics.com/validdatetime/parameters/locations/format?optionals
    // example call: generateMeteomaticsRequestURL("2022-11-9T15:30:00Z", "2022-11-10T15:30:00Z", "47", "9", ["wind speed", "temperature"], format),
    const url = generateMeteomaticsRequestURL(weatherQuery.time.start, weatherQuery.time.end, weatherQuery.location.latitude, weatherQuery.location.longitude, weatherQuery.requestParameters, weatherQuery.dataFormat, weatherQuery.optionalParameters);

    // Response data from weather API call, assigned from axios result below.
    let responseData;

    // make axios API call, and return the result. -1 if failed
    return await axios({
        url: url,
        method: 'GET',
        dataType: weatherQuery.dataFormat,
        auth: {
            // auth specified from .env file.
            username: process.env.METEO_USER,
            password: process.env.METEO_PASSWORD
        }
    }).then(results => {
        // API call success

        // results has varying structure depending on datatype
        if (weatherQuery.dataFormat === "json") {
            responseData = results.data.data;
        } else if (weatherQuery.dataFormat === "html") {
            responseData = results.data;
        }

        // console.log(`Weather API call succeeded! Response:\n${JSON.stringify(responseData)}`);

        return responseData;
    }).catch(error => {
        // API call failed
        // Handle errors (API call may have failed!)
        console.log(`Weather API call failed! Error:\n${error}`);
        // bad response. Make sure to check for this value in error handling.
        return -1;
    });
}

// Perform API query to flight API
async function searchFlights(flightQuery) {
    const arrIata = flightQuery.arr_iata;
    const depIata = flightQuery.dep_iata;

    console.log("Arrival IATA:", arrIata);
    console.log("Departure IATA:", depIata);
    
    return await axios({
        url: "https://airlabs.co/api/v9/schedules",
        method: 'GET',
        dataType:'json',
        params: {
            "api_key": process.env.flight_api_key,
            "arr_iata": arrIata,
            "dep_iata": depIata,
        }
    })
    .then(results => {
        console.log("Successful flight API call");
        // console.log(JSON.stringify(results.data));
        // console.log(results.data);
        return results.data.response;
    })
    .catch(error => {
        // Handle errors
        console.log("Failed flight API call");
        console.log(error.message);
        return -1;
    });
}

async function searchQuery(locationInput) {
    //Get country and city for arrival and departure
    const departureInput = {
        country: locationInput.departure_country,
        city: locationInput.departure_city,
    }

    const arrivalInput = {
        country: locationInput.arrival_country,
        city: locationInput.arrival_city,
    }

    locationInput = await cityToCoordinates(arrivalInput);

    const dep_iata = await cityToIATA(departureInput);
    const arr_iata = await cityToIATA(arrivalInput);

    if(locationInput === -1 || locationInput == undefined){
        console.log("Invalid Location Input in Search Query!");
    }

    // Input data to weather API
    const weatherQuery = {
        time: {
            // Note: we have access to up to 1 day in the past to 10 days in the future, but time inaccuracies right at that range may put the request out of bounds.
            start: "now-16H", // 16 hours in the past. 'now' and 'H' modifier shortcut specified in API
            end: "now+168H" // 7 days in the future (168 hours).
        },
        location: {
            // TODO take location data from user, and calculate latitude and longitude from that.
            country: locationInput.country,
            city: locationInput.city,
            latitude: locationInput.latitude,
            longitude: locationInput.longitude
        },
        requestParameters: [
            "temperature",
            "precipitation 24 hours"
        ],
        dataFormat: "json",
        // optionalParameters: {}
    };

    // Prepare flight query
    const flightQuery = {
        dep_iata: dep_iata,
        arr_iata: arr_iata,
    }

    // Perform API queries, waiting for their response.
    const weatherData = await searchWeather(weatherQuery);
    const flightData = await searchFlights(flightQuery);


    // Return results from API queries.
    return {
        weather: {
            data: weatherData,
            format: weatherQuery.dataFormat
        },
        flight: {
            data: flightData,
        },
        location: {
            departure: departureInput,
            destination: arrivalInput
        }
    };
}

app.get("/search", async (req, res) => {
    res.render("pages/search");
});

app.post("/search", async (req, res) => {
    const locationInput = {
        departure_country: req.body.departure_country,
        departure_city: req.body.departure_city,
        arrival_country: req.body.arrival_country,
        arrival_city: req.body.arrival_city,
    }

    // TODO perform searchQuery(location) for every location query we want to do on a search.

    // Data receieved back from any APIs.
    const responseData = await searchQuery(locationInput);
    // Data we need in a usable form for frontend.
    const displayData = dataToDisplayData(responseData);

    console.log(`Final Search Response JSON:\n${JSON.stringify(displayData)}`);

    if(displayData.error === true){
        // If there is an error, keep user on the search page and display an error
        res.render("pages/search", displayData);
    }
    else {
        console.log(displayData.data.flight_data);
        res.render("pages/searchResults", displayData);
    }
    // render the searchResults.ejs page with usable displayable data.
});

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

function averageTemperature(weather) {
    const temperatureObject = weather.data.find(i => i.parameter === "t_2m:C"); // searches weather data for object containing temperature data
    const dates = temperatureObject.coordinates[0].dates; // only first coordinate because we only have one weather point to work with

    // Get the average temperature in Celcius
    let sumC = 0;
    dates.forEach(date => {
        sumC += date.value;
    });
    const avgTempC = sumC / dates.length;

    const avgTempF = (avgTempC * 1.8) + 32; // get average fahrenheit 

    // Return both results
    return {
        C: avgTempC,
        F: avgTempF
    };
}

function averagePrecipitation(weather) {
    const precipitationObject = weather.data.find(i => i.parameter === "precip_24h:mm"); // searches weather data for object containing precipitation data
    const dates = precipitationObject.coordinates[0].dates; // only first coordinate because we only have one weather point to work with

    // Get the average precipitation in mm
    let sumMM = 0;
    dates.forEach(date => {
        sumC += date.value;
    });
    const avgPrecipMM = sumMM / dates.length;

    const avgPrecipIn = avgPrecipMM / 25.4; // get average inches

    // return both results
    return {
        mm: avgPrecipMM,
        in: avgPrecipIn
    }
}

// Convert responseData from API responses to the format we use on displaying to the user.
function dataToDisplayData(responseData) {
    // for now, just pass the same data (with added error message).
    // TODO make conversion based on frontend needs.

    // add an error message to frontend if an api request failed.
    let alertMessage;
    let error;
    if (responseData.weather.data === -1 || responseData.flight.data === -1) {
        alertMessage = "Please enter Valid City and Country into Arrival and Departure Fields"
        error = true;
        // early return: don't filter data if API request(s) failed.
        return {
            data: responseData,
            message: alertMessage,
            error: error
        };
    }

    const avgTemp = averageTemperature(weather);
    const avgPrecip = averagePrecipitation(weather);
    
    error = false;
    let displayData = {
        data: {
            weather: {
                avgTemp: avgTemp,
                avgPrecip: avgPrecip
            },
            flights: [
                // build flight list here with only relevant data for the user. 
            ]
        },
        alerts: [
            // (maybe) build alerts here
            {
                message: message,
                error: error
            }
        ]
    };

    return {
        data: responseData,
        message: alertMessage,
        error: error
    };

    // TODO filter data for user display here
}

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


function insertIntoDB(req, res, usernameP, departureP, arrivalP, temperatureAvgP, airlineP, airportP, countryP, cityP)
{
    var query = `INSERT INTO users_trips(username, departure, arrival, temperatureAvg, airline, airport, country, city) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`

    db.any(query, [usernameP, departureP, arrivalP, temperatureAvgP, airlineP, airportP, countryP, cityP])
    .then(() => {
        req.session.save();
        res.render("pages/main", {
            message: "Trip Succesfully Saved!",
            error: false
        });
    })
    .catch(() => {
        res.render("pages/main", {
            message: "Trip Saving Failed!",
            error: true
        });
    });
}

app.post("/addToCalendar", (req, res) =>{
    // TODO fix weather temp input and arrival time?
    insertIntoDB(req, res, req.session.user, req.body.depTime, "2022-09-28 03:00:00", req.body.weatherData[0].coordinates[0].dates[0].value, req.body.airline, req.body.arrAirport, req.body.country, req.body.city);
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
