CREATE OR REPLACE VIEW rrating AS
SELECT rating_id, ts, session_id, image_id, category_id, rating, postalcode, country, age, monthly_gross_income, education, gender
FROM rating
JOIN session USING (session_id)
JOIN person USING (person_id)
JOIN survey USING (survey_id)
WHERE age >= 18;

