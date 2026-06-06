import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { seedAdmin } from './seed/admin.js';
import { seedHostelAdmin } from './seed/hostelAdmin.js';
import { migrateUsers } from './seed/migrateUsers.js';
import { verifyGmailConnection } from './services/mailer.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import imposterRoutes from './routes/imposter.js';
import hostelRouter from './hostel/router.js';
import { startHostelAttendanceScheduler } from './hostel/lib/scheduler.js';

const app = express();
const PORT = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    gmail: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/imposter', imposterRoutes);
app.use('/hostel-api', hostelRouter);

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is required');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/advaitam';
  await connectDB(uri);
  await migrateUsers();
  await seedAdmin();
  await seedHostelAdmin();
  await verifyGmailConnection();
  startHostelAttendanceScheduler();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
