import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getAllUsers, getUserById, createUser } from '../dal/users.js';

const router = Router();

// TODO: Student implementation - Part 1: User Routes
// GET /users
router.get('/', async (_req, res, next) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
});

// GET /users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});
// POST /users
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name, email } = req.body ?? {};
    if (typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name is required and must be a string' });
      return;
    }
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      res.status(400).json({ error: 'email is required and must be valid' });
      return;
    }
    const user = await createUser({
      name: name.trim(),
      email: email.trim(),
    });
    res.status(201).json(user);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'A user with that email already exists' });
      return;
    }
    next(err);
  }
});
export default router;
