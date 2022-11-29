DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users(
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(32), 
    password VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_trips(
    trip_id SERIAL PRIMARY Key,
    username VARCHAR(32),
    departure DATETIME,
    arrival DATETIME,
    temperatureAvg FLOAT,
    windSpeedAvg FLOAT,
    airline VARCHAR(60),
    airport VARCHAR(60),
    country VARCHAR(60),
    city VARCHAR(60)
);


CREATE TABLE user_trips_to_users(
    user_id INT,
    trip_id INT
);
