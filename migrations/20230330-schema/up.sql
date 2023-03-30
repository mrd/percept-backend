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
    person_id INTEGER REFERENCES person,
    session_start TIMESTAMPTZ DEFAULT now(),
    session_active TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cookie (
    cookie_hash BYTEA,
    person_id INTEGER REFERENCES person,
    cookie_creation TIMESTAMPTZ DEFAULT now(),
    expiration TIMESTAMPTZ
);

CREATE TABLE image (
    image_id SERIAL PRIMARY KEY,
    system_path TEXT,
    url TEXT,
    cityname VARCHAR(24)
);

CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    shortname VARCHAR(24)
);

CREATE TABLE rating (
    rating_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    ts TIMESTAMPTZ DEFAULT now(),
    session_id INTEGER REFERENCES session,
    image_id INTEGER REFERENCES image,
    category_id INTEGER REFERENCES category,
    rating SMALLINT
);

CREATE TABLE language (
    langabbr VARCHAR(2) PRIMARY KEY,
    fullname VARCHAR(16)
);

CREATE TABLE category_description (
    category_id INT REFERENCES category,
    description TEXT,
    langabbr VARCHAR(2) REFERENCES language
);

CREATE TABLE undoable (
  session_id INT REFERENCES session UNIQUE,
  ts TIMESTAMPTZ
);
