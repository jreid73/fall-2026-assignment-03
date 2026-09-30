import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { createUser } from '../src/dal/users.js';

describe('Part 1: API Integration Tests', () => {
  it('should pass placeholder test', () => {
    // TODO: Student implementation - Part 1: Integration Testing
    // Test user creation (POST /users)
    // Test ticket creation (POST /tickets)
    // Test auth middleware rejection (401 when X-User-Id is missing or invalid)
    // Test 404 responses for non-existent users and tickets
    // Test pagination and filtering on GET /tickets
    expect(true).toBe(true);
  });

  const MISSING_ID = 999999999;
  let userId: number;

  beforeEach(async () => {
    const user = await createUser({
      name: 'Test Bootstrap',
      email: `bootstrap-${Math.random()}@example.com`,
    });
    userId = user.id;
  });
  const uniqueEmail = () => `u-${Date.now()}-${Math.random()}@example.com`;

  describe('auth middleware', () => {
    it('returns 401 on POST /users without X-User-Id', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'A', email: uniqueEmail() });
      expect(res.status).toBe(401);
    });

    it('returns 401 on POST /tickets without X-User-Id', async () => {
      const res = await request(app).post('/tickets').send({ title: 'x' });
      expect(res.status).toBe(401);
    });

    it('returns 401 when X-User-Id is not a valid number', async () => {
      for (const bad of ['abc', '0', '-5', '1.5']) {
        const res = await request(app)
          .post('/tickets')
          .set('X-User-Id', bad)
          .send({ title: 'x' });
        expect(res.status).toBe(401);
      }
    });
    it('returns 401 on PATCH without X-User-Id', async () => {
      const res = await request(app)
        .patch('/tickets/1/status')
        .send({ status: 'DONE' });
      expect(res.status).toBe(401);
    });
  });

  describe('users', () => {
    it('creates a user (201)', async () => {
      const email = uniqueEmail();
      const res = await request(app)
        .post('/users')
        .set('X-User-Id', String(userId))
        .send({ name: 'Ada', email });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Ada', email });
      expect(typeof res.body.id).toBe('number');
    });

    it('rejects an invalid email (400)', async () => {
      const res = await request(app)
        .post('/users')
        .set('X-User-Id', String(userId))
        .send({ name: 'Ada', email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('rejects a duplicate email (409)', async () => {
      const email = uniqueEmail();
      const body = { name: 'Dup', email };
      await request(app)
        .post('/users')
        .set('X-User-Id', String(userId))
        .send(body);
      const res = await request(app)
        .post('/users')
        .set('X-User-Id', String(userId))
        .send(body);
      expect(res.status).toBe(409);
    });

    it('GET /users returns an array', async () => {
      const res = await request(app).get('/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /users/:id returns the user', async () => {
      const res = await request(app).get(`/users/${userId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
    });

    it('returns 404 for a non-existent user', async () => {
      const res = await request(app).get(`/users/${MISSING_ID}`);
      expect(res.status).toBe(404);
    });
  });

  describe('tickets', () => {
    const createTicketViaApi = (title: string) =>
      request(app)
        .post('/tickets')
        .set('X-User-Id', String(userId))
        .send({ title, description: 'desc' });

    it('creates a ticket (201) using the X-User-Id as creator', async () => {
      const res = await createTicketViaApi('First ticket');
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'First ticket',
        status: 'TODO',
        creator_id: userId,
      });
    });

    it('rejects a ticket with no title (400)', async () => {
      const res = await request(app)
        .post('/tickets')
        .set('X-User-Id', String(userId))
        .send({ description: 'no title' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for a non-existent ticket', async () => {
      const res = await request(app).get(`/tickets/${MISSING_ID}`);
      expect(res.status).toBe(404);
    });

    it('GET /tickets/:id returns the ticket', async () => {
      const created = await createTicketViaApi('Fetch me');
      const res = await request(app).get(`/tickets/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Fetch me');
    });

    it('updates ticket status (200)', async () => {
      const created = await createTicketViaApi('Move me');
      const res = await request(app)
        .patch(`/tickets/${created.body.id}/status`)
        .set('X-User-Id', String(userId))
        .send({ status: 'IN_PROGRESS' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('rejects an invalid status on PATCH (400)', async () => {
      const created = await createTicketViaApi('Bad status');
      const res = await request(app)
        .patch(`/tickets/${created.body.id}/status`)
        .set('X-User-Id', String(userId))
        .send({ status: 'NOPE' });
      expect(res.status).toBe(400);
    });

    it('returns 404 on PATCH for a non-existent ticket', async () => {
      const res = await request(app)
        .patch(`/tickets/${MISSING_ID}/status`)
        .set('X-User-Id', String(userId))
        .send({ status: 'DONE' });
      expect(res.status).toBe(404);
    });

    it('paginates with limit and offset', async () => {
      for (let i = 0; i < 4; i++) await createTicketViaApi(`Page ${i}`);

      const all = await request(app).get('/tickets');
      const page1 = await request(app).get('/tickets?limit=2&offset=0');
      const page2 = await request(app).get('/tickets?limit=2&offset=2');

      expect(page1.status).toBe(200);
      expect(page1.body).toHaveLength(2);
      expect(page2.body).toHaveLength(2);

      const ids = (rows: { id: number }[]) => rows.map((r) => r.id);
      expect(ids(page1.body)).toEqual(ids(all.body).slice(0, 2));
      expect(ids(page2.body)).toEqual(ids(all.body).slice(2, 4));
    });

    it('filters by status', async () => {
      const created = await createTicketViaApi('Finish me');
      await request(app)
        .patch(`/tickets/${created.body.id}/status`)
        .set('X-User-Id', String(userId))
        .send({ status: 'DONE' });

      const res = await request(app).get('/tickets?status=DONE');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(
        res.body.every((t: { status: string }) => t.status === 'DONE'),
      ).toBe(true);
      expect(
        res.body.some((t: { id: number }) => t.id === created.body.id),
      ).toBe(true);
    });

    it('rejects invalid query params (400)', async () => {
      expect((await request(app).get('/tickets?limit=abc')).status).toBe(400);
      expect((await request(app).get('/tickets?offset=-1')).status).toBe(400);
      expect((await request(app).get('/tickets?status=NOPE')).status).toBe(400);
    });
  });
});
