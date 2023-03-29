CREATE TABLE undoable (
  session_id INT REFERENCES session UNIQUE,
  ts TIMESTAMPTZ
);
