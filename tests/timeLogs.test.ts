import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { createUser } from '../src/dal/users.js';
import { createTicket } from '../src/dal/tickets.js';

describe('Part 2: Time Logs Tests', () => {
  it('should pass placeholder test', () => {
    // TODO: Student implementation - Part 2: Time Logging Tests
    // Log hours for a ticket (POST /tickets/:id/time)
    // Fetch total hours for a ticket (GET /tickets/:id/time)
    // Verify aggregation math
    expect(true).toBe(true);
  });

  const MISSING_ID = 999999999;
  let userId: number;
  let ticketId: number;

  beforeEach(async () => {
    const user = await createUser({
      name: 'Time Tester',
      email: `timer-${Date.now()}-${Math.random()}@example.com`,
    });
    userId = user.id;

    const ticket = await createTicket({
      title: 'Ticket for time logs',
      description: null,
      creator_id: userId,
    });
    ticketId = ticket.id;
  });
  const logHours = (id: number, hours: unknown) =>
    request(app)
      .post(`/tickets/${id}/time`)
      .set('X-User-Id', String(userId))
      .send({ hours });

  it('logs hours and returns 201 with the log', async () => {
    const res = await logHours(ticketId, 3);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ticket_id: ticketId,
      user_id: userId,
      hours: 3,
    });
  });
  it('returns 0 total hours when nothing is logged', async () => {
    const res = await request(app).get(`/tickets/${ticketId}/time`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ticket_id: ticketId, total_hours: 0 });
  });

  it('sums multiple time logs correctly', async () => {
    await logHours(ticketId, 2);
    await logHours(ticketId, 3);
    await logHours(ticketId, 5);

    const res = await request(app).get(`/tickets/${ticketId}/time`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ticket_id: ticketId, total_hours: 10 });
    expect(typeof res.body.total_hours).toBe('number');
  });
  it('only sums hours for the requested ticket', async () => {
    const other = await createTicket({
      title: 'Other ticket',
      description: null,
      creator_id: userId,
    });

    await logHours(ticketId, 4);
    await logHours(other.id, 7);

    const res = await request(app).get(`/tickets/${ticketId}/time`);
    expect(res.body.total_hours).toBe(4);
  });

  it('returns 401 when X-User-Id is missing on POST', async () => {
    const res = await request(app)
      .post(`/tickets/${ticketId}/time`)
      .send({ hours: 2 });
    expect(res.status).toBe(401);
  });

  it('rejects invalid hours (400)', async () => {
    for (const bad of [0, -1, 1.5, 'abc', null]) {
      const res = await logHours(ticketId, bad);
      expect(res.status).toBe(400);
    }
  });

  it('returns 404 for a non-existent ticket', async () => {
    const post = await logHours(MISSING_ID, 2);
    expect(post.status).toBe(404);

    const get = await request(app).get(`/tickets/${MISSING_ID}/time`);
    expect(get.status).toBe(404);
  });
});
