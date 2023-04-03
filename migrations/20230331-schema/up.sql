CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE image_geo (
  image_id INT UNIQUE REFERENCES image,
  angle_deg FLOAT,
  geo geometry(POINT, 4326),
  geo97415 geometry(POINT, 97415)
);
