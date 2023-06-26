CREATE TABLE useragent (
  useragent_id UUID PRIMARY KEY,
  useragent_str TEXT
);
ALTER TABLE rating ADD COLUMN IF NOT EXISTS ipaddr inet;
ALTER TABLE rating ADD COLUMN IF NOT EXISTS useragent_id UUID REFERENCES useragent;
ALTER TABLE cookie ADD COLUMN IF NOT EXISTS ipaddr inet;
ALTER TABLE cookie ADD COLUMN IF NOT EXISTS useragent_id UUID REFERENCES useragent;
