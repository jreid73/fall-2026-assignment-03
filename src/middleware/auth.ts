import { Request, Response, NextFunction } from 'express';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // TODO: Student implementation - Part 1: Authentication Middleware
  // Store the authenticated userId on res.locals.userId
  const header = req.header('X-User-Id')?.trim();

  if (!header || !/^\d+$/.test(header)) {
    res
      .status(401)
      .json({ error: 'Unauthorized: missing or invalid X-User-Id header' });
    return;
  }

  const userId = Number(header);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    res
      .status(401)
      .json({ error: 'Unauthorized: missing or invalid X-User-Id header' });
    return;
  }

  res.locals.userId = userId;
  next();
}

export default authMiddleware;
