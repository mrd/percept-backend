const express = require('express');
const cors = require('cors');
const { Pool } = require('pg')
const Router = require('express-promise-router')
const { dbname, dbhost } = require('./config.js');

const app = express();

const pool = new Pool({database: dbname, host: dbhost});

const router = new Router()


app.use(cors());
app.use(express.json());

app.get('/message', (req, res) => {
    res.json({ message: "Hello from server!" });
});


async function create_new_person({age, monthly_gross_income, education, gender, postcode, consent}) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    // insert survey entry
    const qtxt1 = 'INSERT INTO survey (age, monthly_gross_income, education, gender, postalcode, consent) VALUES ($1,$2,$3,$4,$5,$6) RETURNING survey_id';
    const { rows: [{ survey_id }] } = await c.query(qtxt1, [age, monthly_gross_income, education, gender, postcode, consent]);

    // insert person entry
    const { rows: [{ person_id }] } = await c.query('INSERT INTO person (survey_id) VALUES ($1) RETURNING person_id', [survey_id]);

    await c.query('COMMIT');
    return person_id;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

async function create_new_session(person_id) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    const { rows: [{session_id}] } = await c.query('INSERT INTO session (person_id) VALUES ($1) RETURNING session_id', [person_id]);

    await c.query('COMMIT');
    return session_id;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

async function create_new_cookie(session_id) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    const { rows: [{cookie_hash}] } = await c.query("INSERT INTO cookie (cookie_hash, session_id) VALUES (sha224($1),$2) RETURNING encode(cookie_hash,'base64') AS cookie_hash", [session_id, session_id]);

    await c.query('COMMIT');
    return cookie_hash;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}


async function get_user_from_session(session_id, cookie_hash=null) {
  while(session_id) {
    const { rows } = await pool.query('SELECT user_id FROM session WHERE session_id=$1',[session_id]);
    if (rows.length === 0) break;
    return rows[0];
  }

  if(cookie_hash) {
    const { rows } = await pool.query('SELECT user_id FROM cookie WHERE cookie_hash=$1',[cookie_hash]);
    if (rows.length === 0) return null;
    user_id = rows[0];

    return user_id;
  }

  return null;
}

// sample url
// /rate/new?category_id=1&image_id=2&rating=3&session_id=4&age=5&mgi=0-1500&education=Postgraduate&gender=Nonbinary&postalcode=3333EE&consent=yes
// returns:
//   { session_id: int, error: boolean, errordesc: string }
router.all('/new', async (req, res) => {
    const qparams = JSON.stringify(req.query);
    const pparams = JSON.stringify(req.body);
    res.json({
      qparams: qparams,
      pparams: pparams
    });
});

router.get('/fetch', async (req, res) => {
    const { rows } = await pool.query('SELECT cityname,url FROM image ORDER BY random() LIMIT 4');
    res.json({
      main_image: rows[0],
      category: {
        shortname: 'walkability'
      },
      impressions: rows.slice(1)
    });
});

router.get('/getsession', async (req, res) => {
  const cookie_hash = req.query.cookie_hash;
  const session_id = req.query.session_id;
  const user_id = get_user_from_session(session_id, cookie_hash);
  res.json({
    cookie_hash: cookie_hash,
    session_id: session_id, 
    user_id: user_id
  });

});

router.get('/test', async (req, res) => {
  console.log('test');
  const person_id = await create_new_person({age: 41, monthly_gross_income: '3000-4500', education: 'Postdoctoral', gender: 'Man', postcode: '3582', consent: 'yes'});
  const session_id = await create_new_session(person_id);
  const cookie_hash = await create_new_cookie(session_id);
  res.json({
    person_id: person_id,
    session_id: session_id,
    cookie_hash: cookie_hash
  });
});

app.use('/rate',router);

const port = 8000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});



