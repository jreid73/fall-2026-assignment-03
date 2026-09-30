import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
} from '../dal/tickets.js';

const router = Router();

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id >= 1 ? id : null;
}

function isPgError(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === code
  );
}

// TODO: Student implementation - Part 1: Ticket Routes
// GET /tickets
router.get('/', async (req, res, next) => {
  try {
    const { limit, offset, status } = req.query;
    const options: { limit?: number; offset?: number; status?: string } = {};

    if (limit !== undefined) {
      const n = Number(limit);
      if (typeof limit !== 'string' || !Number.isInteger(n) || n < 1) {
        res.status(400).json({ error: 'limit must be a positive integer' });
        return;
      }
      options.limit = n;
    }
    if (offset !== undefined) {
      const n = Number(offset);
      if (typeof offset !== 'string' || !Number.isInteger(n) || n < 0) {
        res
          .status(400)
          .json({ error: 'offset must be a non-negative integer' });
        return;
      }
      options.offset = n;
    }

    if (status !== undefined) {
      if (typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
        res.status(400).json({
          error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
        return;
      }
      options.status = status;
    }

    const tickets = await getAllTickets(options);
    res.status(200).json(tickets);
  } catch (err) {
    next(err);
  }
});
// GET /tickets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    const ticket = await getTicketById(id);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.status(200).json(ticket);
  } catch (err) {
    next(err);
  }
});
// POST /tickets
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { title, description } = req.body ?? {};

    if (typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'title is required and must be a string' });
      return;
    }
    if (description !== undefined && typeof description !== 'string') {
      res.status(400).json({ error: 'description must be a string' });
      return;
    }
    const ticket = await createTicket({
      title: title.trim(),
      description: description ?? null,
      creator_id: res.locals.userId,
    });
    res.status(201).json(ticket);
  } catch (err: any) {
    if (isPgError(err, '23503')) {
      res.status(400).json({ error: 'X-User-Id does not match a valid user' });
      return;
    }
    next(err);
  }
});
// PATCH /tickets/:id/status
router.patch('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const { status } = req.body ?? {};
    if (typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
      res.status(400).json({
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
      return;
    }

    const ticket = await updateTicketStatus(id, status);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    res.status(200).json(ticket);
  } catch (err) {
    next(err);
  }
});
// TODO: Student implementation - Part 2: Time Log Routes
// POST /tickets/:id/time
// GET /tickets/:id/time

export default router;
