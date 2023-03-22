const app = require('./server.js');
const supertest = require('supertest');
const http = require('http');
const server = http.createServer(app.app);
let request = supertest(server);
const { testdbname, testdbhost } = require('./config.js');
const { Pool } = require('pg')
const fs = require('fs');
const { globSync, Glob } = require('glob');


beforeEach(
   async() => {
      //app.pool = new Pool({database: testdbname, host: testdbhost});
      const upfiles = new globSync('migrations/**/up.sql');
      for (const file of upfiles) {
        const sql = fs.readFileSync(file).toString();
        await app.pool.query(sql);
      }
      const seedfiles = new globSync('seeds/tests/*.sql');
      for (const file of seedfiles) {
        const sql = fs.readFileSync(file).toString();
        await app.pool.query(sql);
      }
   }
);

afterEach(
   async() => {
      //await app.pool.end();
      const downfiles = new globSync('migrations/**/down.sql');
      for (const file of downfiles) {
        const sql = fs.readFileSync(file).toString();
        await app.pool.query(sql);
      }
   }
);

describe('Fetch images', () => {
   it('GET /rate/fetch', async () => {
      const res = await request.get('/rate/fetch');
      expect(res.status).toEqual(200);
      expect(res.body.impressions).toHaveLength(3);
      expect(res.body.impressions[0].url).toMatch(/jpg/);
      expect(res.body.main_image.url).toMatch(/jpg/);
   });
});

describe('New person', () => {
  const person1_survey = {
         age: '25',
         monthly_gross_income: '0-1500',
         education: 'Bachelors',
         gender: 'Woman',
         postcode: '3000',
         consent: true
      };
  it('POST /rate/newperson - invalid age', async () => {
    const res = await request.post('/rate/newperson').send({...person1_survey, age: '25a' });
    expect(res.status).toEqual(400);
  });
  it('POST /rate/newperson - invalid consent', async () => {
    const res = await request.post('/rate/newperson').send({...person1_survey, consent: '' });
    expect(res.status).toEqual(400);
  });

  it('POST /rate/newperson', async () => {
    const res = await request.post('/rate/newperson').send(person1_survey);
    expect(res.status).toEqual(200);
    expect(res.body.session_id).toEqual(1);
    expect(res.body.cookie_hash).toHaveLength(40);
    const res2 = await request.post('/rate/getsession').send({
      cookie_hash: res.body.cookie_hash
    });
    expect(res2.status).toEqual(200);
    expect(res2.body.session_id).toEqual(1);
  });
});

