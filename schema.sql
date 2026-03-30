-- ============================================================
-- Mini Event Management System - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS event_booking_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE event_booking_db;

-- ------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150)    NOT NULL,
  email       VARCHAR(255)    NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id                 INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  title              VARCHAR(255)    NOT NULL,
  description        TEXT,
  date               DATETIME        NOT NULL,
  total_capacity     INT UNSIGNED    NOT NULL,
  remaining_tickets  INT UNSIGNED    NOT NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT chk_capacity CHECK (remaining_tickets <= total_capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: bookings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED    NOT NULL,
  event_id        INT UNSIGNED    NOT NULL,
  booking_date    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Unique code issued to the user post-booking (UUID v4, stored as CHAR(36))
  booking_code    CHAR(36)        NOT NULL,
  tickets_count   INT UNSIGNED    NOT NULL DEFAULT 1,

  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_code (booking_code),
  -- A user may book the same event only once (business rule)
  UNIQUE KEY uq_user_event (user_id, event_id),
  CONSTRAINT fk_bookings_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: event_attendance
-- Tracks the physical check-in of a booked attendee using
-- their booking_code at the venue entry point.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_attendance (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  booking_id    INT UNSIGNED    NOT NULL,
  -- Denormalised for quick look-ups by scanning / entering the code
  booking_code  CHAR(36)        NOT NULL,
  entry_time    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- A booking can only be checked-in once
  UNIQUE KEY uq_attendance_booking (booking_id),
  CONSTRAINT fk_attendance_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Seed data (optional – safe to delete in production)
-- ------------------------------------------------------------
INSERT INTO users (name, email) VALUES
  ('Alice Johnson', 'alice@example.com'),
  ('Bob Smith',     'bob@example.com'),
  ('Carol White',   'carol@example.com');

INSERT INTO events (title, description, date, total_capacity, remaining_tickets) VALUES
  ('Tech Summit 2025',       'Annual technology conference covering AI, Cloud & DevOps.',  '2025-09-15 09:00:00', 500, 500),
  ('Node.js Workshop',       'Hands-on workshop for beginner to intermediate Node.js.',     '2025-10-01 10:00:00', 50,  50),
  ('Startup Pitch Night',    'Entrepreneurs pitch to investors in a live demo evening.',    '2025-10-20 18:00:00', 200, 200);
