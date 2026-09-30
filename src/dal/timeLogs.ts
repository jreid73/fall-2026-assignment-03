import { db, TimeLog } from '../db/database.js';
// TODO: Student implementation - Part 2: DAL for time logs

export async function insertTimeLog(
  ticketId: number,
  userId: number,
  hours: number,
): Promise<TimeLog> {
  // TODO: Student implementation
  return await db
    .insertInto('time_logs')
    .values({ ticket_id: ticketId, user_id: userId, hours })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getTotalHoursForTicket(
  ticketId: number,
): Promise<number> {
  // TODO: Student implementation
  const row = await db
    .selectFrom('time_logs')
    .select((eb) => eb.fn.sum<string | null>('hours').as('total_hours'))
    .where('ticket_id', '=', ticketId)
    .executeTakeFirst();

  return Number(row?.total_hours ?? 0);
}
