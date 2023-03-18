const express = require('express');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
const { Pool } = require('pg')
const Router = require('express-promise-router')
const { dbname, dbhost, testdbname, testdbhost } = require('./config.js');
const DOMPurify = require('isomorphic-dompurify');

const app = express();

let pool;
if (process.env.NODE_ENV === 'test') {
  pool = new Pool({database: testdbname, host: testdbhost});
} else {
  pool = new Pool({database: dbname, host: dbhost});
}

const router = new Router()

const clean = DOMPurify.sanitize;

function debuglog(str) {
  console.log(str);
}

const s = JSON.stringify;

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
    debuglog(`ERROR ${e}`);
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

async function get_cookie_hash(person_id) {
  const c = await pool.connect();
  try {
    const { rows } = await c.query("SELECT encode(cookie_hash, 'base64') FROM cookie WHERE person_id=$1 AND (expiration IS NULL OR expiration > now())", [person_id]);
    if (rows.length > 0) return rows[0]['cookie_hash'];

    await c.query('BEGIN');

    const { rows: [{cookie_hash}] } = await c.query("INSERT INTO cookie (cookie_hash, person_id) VALUES (sha224($1),$2) RETURNING encode(cookie_hash,'base64') AS cookie_hash", [person_id, person_id]);

    await c.query('COMMIT');
    return cookie_hash;
  } catch (e) {
    await c.query('ROLLBACK');
    console.log(e);
    throw e;
  } finally {
    c.release();
  }
}


async function get_person_from_session(session_id, cookie_hash=null) {
  while(session_id) {
    const { rows } = await pool.query('SELECT person_id FROM session WHERE session_id=$1',[session_id]);
    if (rows.length === 0) break;
    const [ {person_id} ] = rows;

    return person_id;
  }

  if(cookie_hash) {
    const { rows } = await pool.query("SELECT person_id FROM cookie WHERE cookie_hash=decode($1,'base64')",[cookie_hash]);
    if (rows.length === 0) return null;
    const [ {person_id} ] = rows;
    console.log('cookie '+cookie_hash + ' person '+person_id)

    return person_id;
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

router.post(
  '/newperson',
  body('age').isNumeric({no_symbols: true}).withMessage('Age must be a number'),
  body('consent').isBoolean(),
async (req, res) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const args = {
    age: req.body.age,
    monthly_gross_income: clean(req.body.monthly_gross_income || ''),
    education: clean(req.body.education || ''),
    gender: clean(req.body.gender || ''),
    postcode: clean(req.body.postcode || ''),
    consent: req.body.consent
  };

  const person_id = await create_new_person(args);
  const session_id = await create_new_session(person_id);
  const cookie_hash = await get_cookie_hash(person_id);
  const ret = {
    session_id: session_id,
    cookie_hash: cookie_hash,
    cookie_hash_urlencoded: encodeURIComponent(cookie_hash)
  };
  debuglog(`newperson(${s(args)}) => ${s(ret)} (${s({person_id: person_id})})`);
  res.json(ret);
});

router.post('/getsession',
  body('session_id').optional({ checkFalsy: true }).isNumeric({no_symbols: true}).withMessage('session_id must be a number'),
async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const cookie_hash = req.body.cookie_hash ? clean(req.body.cookie_hash) : null;
  let session_id = req.body.session_id;
  const person_id = await get_person_from_session(session_id, cookie_hash);
  if (person_id && !session_id) session_id = await create_new_session(person_id);
  const ret = {
    cookie_hash: cookie_hash,
    session_id: session_id
  };
  console.log(`getsession(${s({session_id: session_id, cookie_hash: cookie_hash})}) => ${s(ret)}`);
  res.json(ret);
});

router.get('/test', async (req, res) => {
  console.log('test');
  //const person_id = await create_new_person({age: 41, monthly_gross_income: '3000-4500', education: 'Postdoctoral', gender: 'Man', postcode: '3582', consent: 'yes'});
  const person_id = 6;
  const session_id = await create_new_session(person_id);
  const cookie_hash = await get_cookie_hash(person_id);
  res.json({
    person_id: person_id,
    session_id: session_id,
    cookie_hash: cookie_hash,
    cookie_hash_urlencoded: encodeURIComponent(cookie_hash)
  });
});

//app.use(express.json());
app.use('/rate',router);

const port = 8000;

if (process.env.NODE_ENV !== 'test') {
  module.exports = app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
  });
} else {
  module.exports = { app, pool };
}
