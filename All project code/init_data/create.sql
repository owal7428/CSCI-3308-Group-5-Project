DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users(
    username VARCHAR(32) PRIMARY KEY, 
    password VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_trips(
    trip_id SERIAL PRIMARY Key,
    temperature FLOAT,
    windSpeed FLOAT,
    flightNumber INT,
    yearOut INT,
    monthOut INT,
    weekOut INT,
    dayOut INT,
    hourOut INT,
    minuteOut INT,
    yearIn INT,
    monthIn INT,
    weekIn INT,
    dayIn INT,
    hourIn INT,
    minuteIn INT,
    country VARCHAR(60),
    city VARCHAR(60)
);

CREATE TABLE user_trips_to_users(
    user_id INT,
    trip_id INT
);
