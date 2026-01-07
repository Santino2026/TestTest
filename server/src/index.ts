import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db/pool';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());

// Parse JSON for all routes except Stripe webhook (which needs raw body)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: dbResult.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mount all API routes
app.use('/api', routes);


// Start server
app.listen(PORT, () => {
  console.log(`🏀 Sports League Office API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
