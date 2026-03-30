# Mini Event Management System

A RESTful API built with **Node.js (Express)** and **MySQL** for browsing events, booking tickets, and tracking attendance.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Database Setup](#database-setup)
4. [Running the Server](#running-the-server)
5. [Docker (One-Click Deployment)](#docker-one-click-deployment)
6. [API Endpoints](#api-endpoints)
7. [Race Condition Handling](#race-condition-handling)
8. [API Documentation](#api-documentation)

---

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Runtime   | Node.js 20+                 |
| Framework | Express.js 4                |
| Database  | MySQL 8                     |
| DB Driver | mysql2 (promise-based)      |
| Validation| express-validator           |
| Docs      | Swagger UI / OpenAPI 3.0    |
| Unique ID | uuid (v4)                   |

---

## Project Structure

```
event-booking-system/
├── src/
│   ├── app.js                    # Express entry point
│   ├── config/
│   │   └── db.js                 # MySQL connection pool
│   ├── controllers/
│   │   ├── eventController.js    # Events & attendance logic
│   │   └── bookingController.js  # Booking logic (transactions)
│   ├── routes/
│   │   ├── eventRoutes.js        # /events routes + validation
│   │   └── bookingRoutes.js      # /bookings + /users/:id/bookings
│   └── middleware/
│       └── errorHandler.js       # Validation runner & global error handler
├── docs/
│   ├── swagger.yaml              # OpenAPI 3.0 spec
│   └── postman_collection.json   # Postman collection
├── schema.sql                    # Database schema + seed data
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Database Setup

### Prerequisites
- MySQL 8.0+ running locally

### Steps

**1. Create the database and tables**

```bash
mysql -u root -p < schema.sql
```

Or run the SQL manually in MySQL Workbench / DBeaver.

**2. Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=event_booking_db
PORT=3000
```

### Schema Overview

| Table              | Description                                              |
|--------------------|----------------------------------------------------------|
| `users`            | System users (id, name, email)                          |
| `events`           | Events with capacity tracking                           |
| `bookings`         | Ticket bookings with unique UUID booking codes          |
| `event_attendance` | Check-in log per booking (one entry per booking)        |

**Key constraints:**
- `bookings.booking_code` → `UNIQUE` (UUID v4, issued post-booking)
- `bookings(user_id, event_id)` → `UNIQUE` (no duplicate bookings)
- `event_attendance.booking_id` → `UNIQUE` (one check-in per booking)
- Foreign keys with `ON DELETE CASCADE` for referential integrity

---

## Running the Server

### Prerequisites
- Node.js 18+ (20 recommended)
- npm 9+

### Install & Start

```bash
# Install dependencies
npm install

# Development (auto-reload)
npm run dev

# Production
npm start
```

Server starts at **http://localhost:3000**

---

## Docker (One-Click Deployment)

No local MySQL required — Docker Compose spins up both the database and the API.

```bash
docker compose up --build
```

This will:
1. Start a MySQL 8 container and auto-import `schema.sql`
2. Wait for the database to be healthy
3. Start the API server on port 3000

**Stop everything:**
```bash
docker compose down
```

**Stop and remove data volumes:**
```bash
docker compose down -v
```

---

## API Endpoints

| Method | Endpoint                    | Description                                      |
|--------|-----------------------------|--------------------------------------------------|
| GET    | `/health`                   | Server health check                              |
| GET    | `/events`                   | List all upcoming events                         |
| POST   | `/events`                   | Create a new event                               |
| POST   | `/bookings`                 | Book a ticket (transactional, race-safe)         |
| GET    | `/users/:id/bookings`       | Get all bookings for a specific user             |
| POST   | `/events/:id/attendance`    | Check in using booking_code, returns ticket count|

### Example Requests

**Create an event**
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Node.js Workshop",
    "description": "Hands-on beginner workshop",
    "date": "2025-10-01T10:00:00",
    "capacity": 50
  }'
```

**Book a ticket**
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "event_id": 1,
    "tickets_count": 2
  }'
```

**Check in (attendance)**
```bash
curl -X POST http://localhost:3000/events/1/attendance \
  -H "Content-Type: application/json" \
  -d '{ "booking_code": "<uuid-from-booking-response>" }'
```

**Get user bookings**
```bash
curl http://localhost:3000/users/1/bookings
```

---

## Race Condition Handling

The `POST /bookings` endpoint prevents overbooking under concurrent load by:

1. **Starting a MySQL transaction**
2. **Acquiring a row-level lock** on the event row with `SELECT ... FOR UPDATE`  
   — any other concurrent transaction trying to book the same event is blocked until this one completes
3. **Validating ticket availability** inside the locked transaction
4. **Decrementing `remaining_tickets`** and inserting the booking atomically
5. **Committing or rolling back** cleanly on any error

This guarantees that even if 100 users simultaneously try to book the last ticket, only one will succeed and the rest will receive a clear `409 Conflict` response.

---

## API Documentation

Interactive Swagger UI is available at:

```
http://localhost:3000/api-docs
```

The raw OpenAPI spec is at `docs/swagger.yaml`.

To import into Postman:
1. Open Postman → Import
2. Select `docs/postman_collection.json`
3. The `bookingCode` variable is automatically saved when you run "Book a Ticket", and reused in the "Record Attendance" request.
