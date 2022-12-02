DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE IF NOT EXISTS users(
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(32) NOT NULL, 
    password VARCHAR(128) NOT NULL
);

DROP TABLE IF EXISTS user_flights CASCADE;
CREATE TABLE IF NOT EXISTS user_flights(
    flight_id SERIAL PRIMARY KEY,
    flight_date DATE,
    flight_number VARCHAR(6),
    airline VARCHAR(60),
    airport VARCHAR(60),
    country VARCHAR(60),
    city VARCHAR(60)
);

DROP TABLE IF EXISTS users_to_flights CASCADE;
CREATE TABLE IF NOT EXISTS flights_to_users(
    user_id INTEGER,
    flight_id INTEGER,

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_flight FOREIGN KEY (flight_id) REFERENCES user_flights(flight_id)
);

DROP TABLE IF EXISTS trips CASCADE;
CREATE TABLE trips(
    trip_id SERIAL PRIMARY KEY,
    date_start DATE,
    date_end DATE,
    city VARCHAR(60),
    country VARCHAR(60)
);

DROP TABLE IF EXISTS users_to_trips CASCADE;
CREATE TABLE users_to_trips(
    user_id INTEGER,
    trip_id INTEGER,

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_trip FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
);