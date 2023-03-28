CREATE TABLE language (
    langabbr VARCHAR(2) PRIMARY KEY,
    fullname VARCHAR(16)
);

CREATE TABLE category_description (
    category_id INT REFERENCES category,
    description TEXT,
    langabbr VARCHAR(2) REFERENCES language
);

