import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import accessibilityRoutes from './routes/accessibility';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Try to ensure Chrome is available (non-blocking)
if (process.env.NODE_ENV === 'production') {
  // In production, try to install Chrome if missing (non-blocking)
  const { exec } = require('child_process');
  const puppeteer = require('puppeteer');
  
  // Check if Chrome exists, if not, try to install it in background
  try {
    const chromePath = puppeteer.executablePath();
    const fs = require('fs');
    if (!fs.existsSync(chromePath)) {
      console.log('⚠️ Chrome not found, attempting to install in background...');
      exec('npx puppeteer browsers install chrome', (error: any) => {
        if (error) {
          console.warn('⚠️ Could not install Chrome automatically:', error.message);
          console.warn('⚠️ Chrome will be downloaded on first use (may be slow)');
        } else {
          console.log('✅ Chrome installed successfully');
        }
      });
    }
  } catch (error) {
    console.warn('⚠️ Could not check Chrome installation:', error);
  }
}

// Middleware
app.use(helmet());

// CORS configuration - allow frontend from environment variable
const allowedOrigins: string[] = [
  process.env.FRONTEND_URL,
  'http://localhost:3000', // For local development
  'https://accessbility-analyzer-frontend.vercel.app', // Fallback for common deployment
].filter((origin): origin is string => Boolean(origin));

// Normalize all origins (remove trailing slashes) for comparison
const normalizedAllowedOrigins = allowedOrigins.map(o => o.replace(/\/+$/, '').toLowerCase());

// Log allowed origins for debugging
console.log('Allowed CORS origins:', allowedOrigins);
console.log('Normalized allowed origins:', normalizedAllowedOrigins);
console.log('FRONTEND_URL env var:', process.env.FRONTEND_URL);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    // Normalize origin (remove trailing slash and convert to lowercase for comparison)
    const normalizedOrigin = origin.replace(/\/+$/, '').toLowerCase();
    
    // Check if origin matches (case-insensitive, ignoring trailing slashes)
    const isAllowed = normalizedAllowedOrigins.includes(normalizedOrigin) || 
                      allowedOrigins.some(allowed => 
                        allowed.replace(/\/+$/, '').toLowerCase() === normalizedOrigin
                      );
    
    if (isAllowed) {
      console.log(`CORS: ✅ Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`CORS: ❌ Blocked origin: ${origin}`);
      console.log(`CORS: Allowed origins are: ${allowedOrigins.join(', ')}`);
      console.log(`CORS: Normalized blocked origin: ${normalizedOrigin}`);
      callback(new Error(`Not allowed by CORS. Origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`));
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
