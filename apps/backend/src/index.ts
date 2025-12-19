import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import accessibilityRoutes from './routes/accessibility';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());

// CORS configuration - allow frontend from environment variable
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000', // For local development
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test API endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Accessibility Analyzer Backend API is running!',
    timestamp: new Date().toISOString(),
    status: 'success',
  });
});

// Accessibility routes
app.use('/api/v1', accessibilityRoutes);

// Export for Vercel serverless functions
export default app;

// Start server only if not in serverless environment
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(
      `🔍 Accessibility API available at http://localhost:${PORT}/api/v1/health`
    );
  });
}
