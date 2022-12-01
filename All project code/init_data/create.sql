DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users(
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(32) NOT NULL, 
    password VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_trips(
    trip_id SERIAL PRIMARY KEY,
    departure TIMESTAMP,
    arrival TIMESTAMP,
    airline VARCHAR(60),
    airport VARCHAR(60),
    country VARCHAR(60),
    city VARCHAR(60)
);


CREATE TABLE user_trips_to_users(
    user_id INTEGER,
    trip_id INTEGER
);
