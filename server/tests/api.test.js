'use strict';

const request = require('supertest');
const app     = require('../src/app');

describe('GET /api/health', () => {
  it('returns 200 with correct shape', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('cache');
    expect(res.body.cache).toHaveProperty('hitRate');
  });
});

describe('GET /api/stock/:symbol – validation', () => {
  it('rejects symbol with special chars → 400', async () => {
    const res = await request(app).get('/api/stock/!!!BAD/quote');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('rejects invalid range param → 400', async () => {
    const res = await request(app).get('/api/stock/AAPL/history?range=INVALID');
    expect(res.status).toBe(400);
  });

  it('rejects invalid interval param → 400', async () => {
    const res = await request(app).get('/api/stock/AAPL/history?interval=99h');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/compare – validation', () => {
  it('rejects missing body → 400', async () => {
    const res = await request(app).post('/api/compare').send({});
    expect(res.status).toBe(400);
  });

  it('rejects single symbol (min 2) → 400', async () => {
    const res = await request(app).post('/api/compare').send({ symbols: ['AAPL'] });
    expect(res.status).toBe(400);
  });

  it('rejects more than 10 symbols → 400', async () => {
    const symbols = Array.from({ length: 11 }, (_, i) => `SYM${i}`);
    const res = await request(app).post('/api/compare').send({ symbols });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/indices/:name – validation', () => {
  it('rejects unknown index name → 400', async () => {
    const res = await request(app).get('/api/indices/DOW30');
    expect(res.status).toBe(400);
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown/route/xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});