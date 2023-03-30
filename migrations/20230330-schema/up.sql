CREATE TABLE survey (
    survey_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    age SMALLINT,
    monthly_gross_income TEXT,
    education TEXT,
    gender TEXT,
    postalcode TEXT,
    consent BOOLEAN
);

CREATE TABLE person (
    person_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    survey_id INT REFERENCES survey
);

CREATE TABLE session (
    session_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    person_id INT REFERENCES person,
    session_start TIMESTAMPTZ DEFAULT now(),
    session_active TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cookie (
    cookie_hash BYTEA,
    person_id INT REFERENCES person,
    cookie_creation TIMESTAMPTZ DEFAULT now(),
    expiration TIMESTAMPTZ
);

CREATE TABLE image (
    image_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    system_path TEXT,
    url TEXT,
    cityname TEXT
);

CREATE TABLE category (
    category_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    shortname TEXT
);

CREATE TABLE rating (
    rating_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    ts TIMESTAMPTZ DEFAULT now(),
    session_id INT REFERENCES session,
    image_id INT REFERENCES image,
    category_id INT REFERENCES category,
    rating SMALLINT
);

CREATE TABLE language (
    langabbr VARCHAR(2) PRIMARY KEY,
    fullname TEXT
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

