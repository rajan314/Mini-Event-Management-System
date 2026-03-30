const db = require('../config/db');

/**
 * GET /events
 * List all upcoming events (date >= NOW()).
 */
const listEvents = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, description, date, total_capacity, remaining_tickets, created_at
       FROM events
       WHERE date >= NOW()
       ORDER BY date ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /events
 * Create a new event.
 * Body: { title, description?, date, capacity }
 */
const createEvent = async (req, res, next) => {
  try {
    const { title, description = null, date, capacity } = req.body;

    const [result] = await db.query(
      `INSERT INTO events (title, description, date, total_capacity, remaining_tickets)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, date, capacity, capacity]
    );

    const [[event]] = await db.query('SELECT * FROM events WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, message: 'Event created successfully', data: event });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /events/:id/attendance
 * Check-in a user using their booking_code.
 * Body: { booking_code }
 * Returns: tickets booked for that booking.
 */
const recordAttendance = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const eventId     = parseInt(req.params.id, 10);
    const { booking_code } = req.body;

    // Verify the booking exists, belongs to this event, and fetch ticket count
    const [[booking]] = await connection.query(
      `SELECT b.id, b.booking_code, b.tickets_count, b.user_id, b.event_id, u.name AS user_name
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.booking_code = ? AND b.event_id = ?`,
      [booking_code, eventId]
    );

    if (!booking) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Invalid booking code for this event.',
      });
    }

    // Check if already checked-in
    const [[existing]] = await connection.query(
      'SELECT id FROM event_attendance WHERE booking_id = ?',
      [booking.id]
    );

    if (existing) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'This booking has already been checked in.',
      });
    }

    // Record attendance
    await connection.query(
      'INSERT INTO event_attendance (booking_id, booking_code) VALUES (?, ?)',
      [booking.id, booking.booking_code]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Attendance recorded successfully.',
      data: {
        booking_code:   booking.booking_code,
        user_name:      booking.user_name,
        tickets_booked: booking.tickets_count,
      },
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = { listEvents, createEvent, recordAttendance };
