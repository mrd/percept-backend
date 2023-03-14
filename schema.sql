-- CREATE EXTENSION postgis;

CREATE TABLE survey (
    survey_id SERIAL PRIMARY KEY,
    age SMALLINT,
    monthly_gross_income VARCHAR(16),
    education VARCHAR(64),
    gender TEXT,
    postalcode VARCHAR(12),
    consent BOOLEAN
);

CREATE TABLE person (
    person_id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES survey
);

CREATE TABLE session (
    session_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person
);

CREATE TABLE cookie (
    cookie_hash BYTEA,
    session_id INTEGER REFERENCES session,
    expiration TIMESTAMPTZ
);

CREATE TABLE image (
    image_id SERIAL PRIMARY KEY,
    system_path TEXT,
    url TEXT,
    cityname VARCHAR(24)
   -- ,geo GEOMETRY(4326)
);
-- CREATE INDEX image_geo ON image USING gist(geo);

CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    shortname VARCHAR(24)
);

CREATE TABLE rating (
    ts TIMESTAMPTZ DEFAULT now(),
    session_id INTEGER REFERENCES session,
    image_id INTEGER REFERENCES image,
    category_id INTEGER REFERENCES category,
    rating SMALLINT
);

INSERT INTO category (shortname) VALUES ('walkability');
INSERT INTO category (shortname) VALUES ('bikeability');
INSERT INTO category (shortname) VALUES ('safety');
INSERT INTO category (shortname) VALUES ('pleasantness');
INSERT INTO category (shortname) VALUES ('greenness');
