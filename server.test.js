const app = require('./server.js');
const supertest = require('supertest');
const http = require('http');
const server = http.createServer(app.app);
let request = supertest(server);
const { testdbname, testdbhost } = require('./config.js');
const { Pool } = require('pg')

beforeEach(
   async() => {
      app.pool = new Pool({database: testdbname, host: testdbhost});
   }
);

afterEach(
   async() => {
      await app.pool.end(); 
   }
);

describe('Fetch images', () => {
   it('GET /rate/fetch', async () => {
      const res = await request.get('/rate/fetch');
      expect(res.status).toEqual(200);
      expect(res.body.impressions.length).toEqual(3);
   });
});

describe('New person', () => {
   it('POST /newperson - invalid age', async () => {
      const res = await request.post('/rate/newperson').send({
         age: '25a',
         monthly_gross_income: '0-1500',
         education: 'Bachelors',
         gender: 'Woman',
         postcode: '3000',
         consent: true
      });
      expect(res.status).toEqual(400);
   });

   it('POST /newperson', async () => {
      const res = await request.post('/rate/newperson').send({
         age: '25',
         monthly_gross_income: '0-1500',
         education: 'Bachelors',
         gender: 'Woman',
         postcode: '3000',
         consent: true
      });
      expect(res.status).toEqual(200);
      //expect(res.body.session_id).toBeInstanceOf(Number);
   });
});