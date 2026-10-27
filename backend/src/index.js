const express = require('express');
const cors = require('cors');
require('dotenv').config();

const adminRoutes = require('./routes/adminRoutes');
const pmRoutes = require('./routes/pmRoutes');
const atmRoutes = require('./routes/atmRoutes');
const authRoutes = require('./routes/authRoutes');
const { authenticate, requireRole } = require('./middleware/authMiddleware');
const ensureAuthSchema = require('./config/ensureAuthSchema');
const db = require('./config/db');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api', authenticate);
app.use('/api/admin', requireRole('ADMIN'), adminRoutes);
app.use('/api/pm', pmRoutes);
app.use('/api/atms', atmRoutes);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status === 400 ? 'Invalid request body' : 'Internal server error' });
});

async function start() {
  await ensureAuthSchema();
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Backend startup failed:', err);
  db.pool.end().finally(() => { process.exitCode = 1; });
});
