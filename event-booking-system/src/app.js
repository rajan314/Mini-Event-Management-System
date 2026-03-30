require('dotenv').config();
const express   = require('express');
const path      = require('path');
const yaml      = require('js-yaml');
const fs        = require('fs');
const swaggerUi = require('swagger-ui-express');

const eventRoutes   = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes    = require('./routes/userRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Swagger / OpenAPI docs ────────────────────────────────────────────────────
const swaggerDocument = yaml.load(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'swagger.yaml'), 'utf8')
);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/events',   eventRoutes);   // GET /events  |  POST /events  |  POST /events/:id/attendance
app.use('/bookings', bookingRoutes); // POST /bookings
app.use('/users',    userRoutes);    // GET /users/:id/bookings

// ── 404 & Error handlers ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 API Docs available at http://localhost:${PORT}/api-docs`);
});

module.exports = app;
