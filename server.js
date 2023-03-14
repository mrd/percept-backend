const express = require('express');
const cors = require('cors');
const { Pool } = require('pg')
const Router = require('express-promise-router')



const app = express();

const pool = new Pool();

const router = new Router()


app.use(cors());
app.use(express.json());

app.get('/message', (req, res) => {
    res.json({ message: "Hello from server!" });
});

// sample url
// /rate/new?category_id=1&image_id=2&rating=3&session_id=4&age=5&mgi=0-1500&education=Postgraduate&gender=Nonbinary&postalcode=3333EE&consent=yes
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
      rows: rows,
      main_image: {
        cityname: 'Amsterdam',
        url: '/img/foo.jpg'
      },
      category: {
        shortname: 'walkability'
      },
      impressions: [
        {url: '/img/imp1.jpg'},
        {url: '/img/imp2.jpg'},
        {url: '/img/imp3.jpg'}
      ]
    });
});

app.use('/rate',router);

const port = 8000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});



