const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

/**
 * POST /bookings
 * Book a ticket for a user.
 * Body: { user_id, event_id, tickets_count? }
 *
 * Uses SELECT … FOR UPDATE inside a transaction to prevent
 * race conditions (overbooking) when many requests arrive simultaneously.
 */
const createBooking = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { user_id, event_id, tickets_count = 1 } = req.body;

    // ── 1. Verify user exists ──────────────────────────────────────────────
    const [[user]] = await connection.query(
      'SELECT id, name, email FROM users WHERE id = ?',
      [user_id]
    );
    if (!user) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // ── 2. Lock the event row to prevent race conditions ───────────────────
    //    FOR UPDATE acquires a row-level lock for the duration of the tx.
    const [[event]] = await connection.query(
      'SELECT id, title, date, remaining_tickets FROM events WHERE id = ? FOR UPDATE',
      [event_id]
    );
    if (!event) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // ── 3. Check event hasn't passed ───────────────────────────────────────
    if (new Date(event.date) < new Date()) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cannot book tickets for a past event.' });
    }

    // ── 4. Check ticket availability ───────────────────────────────────────
    if (event.remaining_tickets < tickets_count) {
      await connection.rollback();
      return res.status(409).json({
        success:  false,
        message: `Only ${event.remaining_tickets} ticket(s) remaining for this event.`,
      });
    }

    // ── 5. Prevent duplicate booking ──────────────────────────────────────
    const [[duplicate]] = await connection.query(
      'SELECT id FROM bookings WHERE user_id = ? AND event_id = ?',
      [user_id, event_id]
    );
    if (duplicate) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'User has already booked a ticket for this event.',
      });
    }

    // ── 6. Deduct tickets ─────────────────────────────────────────────────
    await connection.query(
      'UPDATE events SET remaining_tickets = remaining_tickets - ? WHERE id = ?',
      [tickets_count, event_id]
    );

    // ── 7. Create booking with unique code ────────────────────────────────
    const bookingCode = uuidv4();
    const [result] = await connection.query(
      `INSERT INTO bookings (user_id, event_id, booking_code, tickets_count)
       VALUES (?, ?, ?, ?)`,
      [user_id, event_id, bookingCode, tickets_count]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      data: {
        booking_id:    result.insertId,
        booking_code:  bookingCode,
        user:          { id: user.id, name: user.name, email: user.email },
        event:         { id: event.id, title: event.title, date: event.date },
        tickets_count,
        booking_date:  new Date().toISOString(),
      },
    });
  } catch (err) {
    await connection.rollback();
    // MySQL duplicate-entry error (should be caught above, but just in case)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'User has already booked a ticket for this event.',
      });
    }
    next(err);
  } finally {
    connection.release();
  }
};

/**
 * GET /users/:id/bookings
 * Retrieve all bookings made by a specific user.
 */
const getUserBookings = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);

    const [[user]] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const [bookings] = await db.query(
      `SELECT
         b.id              AS booking_id,
         b.booking_code,
         b.tickets_count,
         b.booking_date,
         e.id              AS event_id,
         e.title           AS event_title,
         e.description     AS event_description,
         e.date            AS event_date,
         e.total_capacity,
         e.remaining_tickets,
         ea.entry_time     AS checked_in_at
       FROM bookings b
       JOIN events e ON e.id = b.event_id
       LEFT JOIN event_attendance ea ON ea.booking_id = b.id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        user,
        total_bookings: bookings.length,
        bookings,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBooking, getUserBookings };
