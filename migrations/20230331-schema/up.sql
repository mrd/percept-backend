CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE image_geo (
  image_id INT REFERENCES image,
  angle_deg FLOAT,
  geo geometry(POINT, 4326)
);
