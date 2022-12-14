// JSON file that contains countries to ISO 2 character code
// import countryCodeJSON from './resources/countries.json' assert {type: 'json'};


const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');
var airlineJSON = require('./resources/airlineIata.json');

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
        res.redirect("/profile");
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
        res.redirect('/profile')
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
            res.redirect("/profile");

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

app.get("/profile", async function(req, res) {


    const tripQuery = `SELECT trips.trip_id, TO_CHAR(date_start, 'mm-dd-yyyy') AS date_start, TO_CHAR(date_end, 'mm-dd-yyyy') AS date_end, city, country FROM trips
                        INNER JOIN users_to_trips
                        ON users_to_trips.trip_id = trips.trip_id
                        INNER JOIN users
                        ON users.user_id = users_to_trips.user_id
                        WHERE users.username = $1;`;

    const flightQuery = `SELECT flights.flight_id, TO_CHAR(flight_date, 'mm-dd-yyyy') AS flight_date, TO_CHAR(flight_time, 'HH:MI') AS flight_time, flight_number, airline, airport, country, city FROM flights
                            INNER JOIN users_to_flights
                            ON users_to_flights.flight_id = flights.flight_id
                            INNER JOIN users
                            ON users.user_id = users_to_flights.user_id
                            WHERE users.username = $1;`;
                        


    let trips = [];
    let flights = [];



    await db.any(tripQuery, [req.session.user])
        .then(response => {
            response.forEach(trip => {
                const tripInfo = {
                    tripID: trip.trip_id,
                    departure: trip.date_start,
                    arrival: trip.date_end,
                    city: trip.city,
                    country: trip.country
                }
                trips.push(tripInfo);
            })
        })
        .catch(error => {
            res.render('pages/search', {
                error: true,
                message: error
            })
        })

    await db.any(flightQuery, [req.session.user])
        .then(response => {
            response.forEach(flight => {
                const flightInfo = {
                    flightID: flight.flight_id,
                    flightDate: flight.flight_date,
                    flightTime: flight.flight_time,
                    flightNumber: flight.flight_number,
                    airline: flight.airline,
                    airport: flight.airport,
                    country: flight.country,
                    city: flight.city
                }
                flights.push(flightInfo);
            })
        }).catch(error => {
            res.render('pages/search', {
                error: true,
                message: error
            })
        })
    


    res.render("pages/profile", {
        user: req.session.user,
        trips: JSON.stringify(trips),
        flights: JSON.stringify(flights)
    }); //Sends the username so it can be displayed at the top of the profile page
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
var countryJson = require('./resources/countries.json');
const { response } = require('express');

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
        // console.log(JSON.stringify(results.data));
        //sets lat and long for weather and flight API
        latitude = results.data[0].latitude;
        longitude = results.data[0].longitude;
        // verifying that lat and long are as I expect 
        // console.log("latitude: ", latitude);
        // console.log("longitude: ", longitude);
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
    // console.log("city:", city);
    //declares country code
    var countryCode;
    // checks if the code is typed in as JSON or as the code itself
    // declares the result of the API as the iata code
    var iataRes = "";
    // capitalizes the first letter in each word in the country name
    if(country.length > 2){
        country = country.toLowerCase();
        for(var i = 0; i < countryJson.length; i++){
            if(countryJson[i].name == country){
                countryCode = countryJson[i].code;
                break;
            }
        }
    }
    else{
        country = country.toUpperCase();
    }
    // console.log("Code:", countryCode);
    return await axios({
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
        // console.log(JSON.stringify(results.data));
        return results.data;
    }).catch(error => {
        // Handle errors (API call may have failed!)
        console.log(`Airport to City API call failed! Error:\n${error}`);
        return -1;
    })
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

    // console.log("Arrival IATA:", arrIata);
    // console.log("Departure IATA:", depIata);
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

    const weatherData = await searchWeather(weatherQuery);
    let depIataList = [];
    // let flightListData = [];

    dep_iata.forEach(dep => {
        if(dep.iata != undefined && dep.iata !== ''){
            depIataList.push(dep.iata);
        }
    });

    // console.log("DEPLIST:", JSON.stringify(depIataList));
    let arrIataList = [];

    arr_iata.forEach(arr => {
        if(arr.iata != undefined && arr.iata !== ''){
            arrIataList.push(arr.iata);
        }
    });

    // console.log("ARRLIST:", JSON.stringify(arrIataList));

    let searchFlightResults = [];
    for(var i = 0; i < depIataList.length; i++){
        for(var k = 0; k < arrIataList.length; k++){
            let flightQuery = {
                dep_iata: depIataList[i],
                arr_iata: arrIataList[k]
            }
            searchFlightResults.push(... await searchFlights(flightQuery));
        }
    }
    // console.log("RESULTS: ", JSON.stringify(searchFlightResults));


    // const flightData = await searchFlights(flightQuery);
    // console.log("FLIGHTS LIST DATA:", JSON.stringify(flightListData[0]));
   
    // Return results from API queries.
    return {
        weather: {
            data: weatherData,
            format: weatherQuery.dataFormat
        },
        flight: {
            data: searchFlightResults,
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
    
    // console.log(`Final Search Response JSON:\n${JSON.stringify(displayData)}`);

    if(displayData.error === true){
        // If there is an error, keep user on the search page and display an error
        res.render("pages/search", displayData);
    }
    else {
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
        C: Math.round(avgTempC),
        F: Math.round(avgTempF)
    };
}

function averagePrecipitation(weather) {
    const precipitationObject = weather.data.find(i => i.parameter === "precip_24h:mm"); // searches weather data for object containing precipitation data
    const dates = precipitationObject.coordinates[0].dates; // only first coordinate because we only have one weather point to work with

    // Get the average precipitation in mm
    let sumMM = 0;
    dates.forEach(date => {
        sumMM += date.value;
    });
    const avgPrecipMM = sumMM / dates.length;

    const avgPrecipIn = avgPrecipMM / 25.4; // get average inches

    // return both results
    return {
        mm: Math.round(avgPrecipMM),
        in: Math.round(avgPrecipIn)
    };
}

function parseUTCTime(utcTime) {
    const dateTime = utcTime.split(" ");
    return {
        date: dateTime[0],
        time: dateTime[1]
    };
}

function getFlightList(flightsData) {
    let flights = []; // our list of flights
    // console.log("DATA:", JSON.stringify(flightsData));
    flightsData.forEach(flight => {
        // Loop through flight data and take what we need
        if (flight.status === "scheduled") {
            let airlineObj = airlineJSON.find(i => i.icao === flight.airline_icao); // convert airline icao to airline name.
            if(airlineObj == undefined){
                airlineObj = {name: flight.airline_icao};
            }
    
            const depDateTime = parseUTCTime(flight.dep_time_utc); // parse day/time from UTC time
    
            // Create flight object that we do want
            const flightIns = {
                depAirport: flight.dep_iata,
                arrAirport: flight.arr_iata,
                depUTC: flight.dep_time_utc,
                depDate: depDateTime.date,
                depTime: depDateTime.time,
                airline_icao: flight.airline_icao,
                airline: airlineObj.name,
                flightNumber: flight.flight_iata
            };
    
            // add flight data to flight array
            flights.push(flightIns);
        }
    });
    

    // return resulting list
    // console.log("FLIGHTS:", JSON.stringify(flights));
    return flights;
}

// Convert responseData from API responses to the format we use on displaying to the user.
function dataToDisplayData(responseData) {
    // for now, just pass the same data (with added error message).
    // TODO make conversion based on frontend needs.
    console.log("RESPONSE:", responseData);
    // add an error message to frontend if an api request failed.
    if (responseData.weather == undefined || responseData.flight == undefined || responseData.weather.data === -1 || responseData.flight.data === -1 || responseData.location.destination.country == undefined || responseData.location.destination.country === -1 || responseData.location.destination.city == undefined || responseData.location.destination.city === -1) {
        // early return: don't filter data if API request(s) failed.
        return {
            message: "Please enter Valid City and Country into Arrival and Departure Fields",
            error: true
        };
    }

    let displayData = {
        data: {
            weather: {
                avgTemp: averageTemperature(responseData.weather),
                avgPrecip: averagePrecipitation(responseData.weather)
            },
            flights: getFlightList(responseData.flight.data)
        },
        location: responseData.location,
        error: false
    };

    // console.log(`Display Data object:\n${JSON.stringify(displayData)}`);

    return displayData;
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


app.post('/addFlight', async function(req, res) {

    const usernameQuery = `SELECT user_id FROM users WHERE username = $1;`;
    const tripInsertQuery = `INSERT INTO flights(flight_date, flight_time, flight_number, airline, airport, country, city) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING flight_id;`;
    const linkQuery = `INSERT INTO users_to_flights(user_id, flight_id) VALUES ($1, $2);`

    let userID;
    let flightID;

    await db.any(usernameQuery, [req.session.user])
        .then(async function(response) {
            userID = response[0].user_id;

            await db.any(tripInsertQuery, [req.body.flightDate, req.body.flightTime, req.body.flightNumber, req.body.airline, req.body.airport, req.body.country, req.body.city])
                .then(async function (response) {
                    flightID = response[0].flight_id;

                    await db.any(linkQuery, [userID, flightID])
                        .then(() => {
                            console.log('Successful');
                            res.redirect('/profile');
                        })
                        .catch(error => {
                            console.log(`Unsuccessful ${error}`);
                            res.render('pages/search', {
                                error: true,
                                message: `Problem linking trip to your profile: ${error}`
                            });
                        })

                })
                .catch(error => {
                    console.log(`Unsuccessful ${error}`);
                    res.render('pages/search', {
                        error: true,
                        message: `Problem adding trip to your profile: ${error}`
                    });
                })
        }).catch(error => {
            console.log(`Unsuccessful ${error}`);
            res.render('pages/search', {
                error: true,
                message: `Problem finding your profile: ${error}`
            });
        })
    
});

app.post('/addTrip', async function (req, res) {
    const usernameQuery = `SELECT user_id FROM users WHERE username = $1;`;
    const tripInsertQuery = `INSERT INTO trips(date_start, date_end, city, country) VALUES ($1, $2, $3, $4) RETURNING trip_id;`;
    const linkQuery = `INSERT INTO users_to_trips(user_id, trip_id) VALUES ($1, $2);`;


    let userID;
    let tripID;

    await db.any(usernameQuery, [req.session.user])
    .then(async function(response) {
        userID = response[0].user_id;

        await db.any(tripInsertQuery, [req.body.startDate, req.body.endDate, req.body.city, req.body.country])
            .then(async function (response) {
                tripID = response[0].trip_id;


                await db.any(linkQuery, [userID, tripID])
                    .then(() => {
                        console.log('Successful');
                        res.redirect('/profile');
                    })
                    .catch(error => {
                        console.log(`Unsuccessful ${error}`);
                        res.render('pages/search', {
                            error: true,
                            message: `Problem linking trip to your profile: ${error}`
                        });
                    })

            })
            .catch(error => {
                console.log(`Unsuccessful ${error}`);
                res.render('pages/search', {
                    error: true,
                    message: `Problem adding trip to your profile: ${error}`
                });
            })
    }).catch(error => {
        console.log(`Unsuccessful ${error}`);
        res.render('pages/search', {
            error: true,
            message: `Problem finding your profile: ${error}`
        });
    })

})

app.post('/removeFlight', async function(req, res) {
    const deleteQuery = `DELETE FROM users_to_flights WHERE flight_id = $1;`;
    const deleteQuery2 = `DELETE FROM flights WHERE flight_id = $1;`;

    await db.any(deleteQuery, [parseInt(req.body.flightID)])
        .then(async function() {
            await db.any(deleteQuery2, [parseInt(req.body.flightID)])
                .then(() => {
                    res.redirect('/profile');
                })
                .catch(error => {
                    res.render('pages/search', {
                        error: true,
                        message: `Could not remove flight: ${error}`
                    })
                })
        })
        .catch(error => {
            res.render('pages/search', {
                error: true,
                message: `Could not remove flight: ${error}`
            })
        });
})

app.post('/removeTrip', async function(req, res) {
    const deleteQuery = `DELETE FROM users_to_trips WHERE trip_id = $1;`;
    const deleteQuery2 = `DELETE FROM trips WHERE trip_id = $1;`;

    await db.any(deleteQuery, [parseInt(req.body.tripID)])
        .then(async function() {
            await db.any(deleteQuery2, [parseInt(req.body.tripID)])
                .then(() => {
                    res.redirect('/profile');
                })
                .catch(error => {
                    res.render('pages/search', {
                        error: true,
                        message: `Could not remove trip: ${error}`
                    })
                })
        }).catch(error => {
            res.render('pages/search', {
                error: true,
                message: `Could not remove trip: ${error}`
            })
        })
})





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
