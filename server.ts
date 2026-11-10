import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sheetsHandler from './api/sheets.ts';
import { authHandler } from './api/auth.ts';
import aiHandler from './api/ai-analyst.ts';
import { telemetryHandler } from './api/telemetry.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;

app.disable('x-powered-by');

// Trust proxy if running behind Nginx / Cloudflare / Docker
app.set('trust proxy', 1);

// Security Headers with Helmet & Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "blob:", "https:"],
      connectSrc: [
        "'self'",
        "https://coinlover.ru",
        "https://*.reloto.ru",
        "https://*.tucano.cc",
        "https://open.er-api.com",
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://openrouter.ai",
        "https://*.googleapis.com",
        "capacitor://localhost"
      ],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', code: 'rate_limit_exceeded', message: 'Слишком много запросов к API. Подождите минуту.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', code: 'rate_limit_exceeded', message: 'Слишком много попыток входа. Подождите минуту.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', code: 'rate_limit_exceeded', message: 'Слишком много запросов к AI-аналитику. Подождите минуту.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/ai-analyst', aiLimiter);

app.use(express.json({ limit: '1mb' }));

// CORS middleware
const isAllowedOrigin = (orig?: string): boolean => {
  if (!orig) return false;
  if (orig === 'capacitor://localhost') return true;
  try {
    const url = new URL(orig);
    const host = url.hostname;
    return (
      host === 'coinlover.ru' || host.endsWith('.coinlover.ru') ||
      host === 'reloto.ru' || host.endsWith('.reloto.ru') ||
      host === 'tucano.cc' || host.endsWith('.tucano.cc') ||
      host === 'localhost' || host === '127.0.0.1'
    );
  } catch {
    return false;
  }
};

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization,X-Admin-Token');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// API Routes
app.all('/api/auth/*', async (req, res) => {
  try {
    await authHandler(req, res);
  } catch (err: any) {
    console.error('Auth API Error:', err);
    res.status(500).json({ status: 'error', message: process.env.NODE_ENV === 'production' ? 'Authentication error' : err.message });
  }
});

app.all('/api/sheets', async (req, res) => {
  try {
    await sheetsHandler(req, res);
  } catch (err: any) {
    console.error('API Error:', err);
    res.status(500).json({ status: 'error', message: process.env.NODE_ENV === 'production' ? 'Sheets API error' : err.message });
  }
});

app.all('/api/ai-analyst', async (req, res) => {
  try {
    await aiHandler(req, res);
  } catch (err: any) {
    console.error('AI API Error:', err);
    res.status(500).json({ status: 'error', message: process.env.NODE_ENV === 'production' ? 'AI processing error' : err.message });
  }
});

app.all('/api/telemetry*', async (req, res) => {
  try {
    await telemetryHandler(req, res);
  } catch (err: any) {
    console.error('Telemetry API Error:', err);
    res.status(500).json({ status: 'error', message: process.env.NODE_ENV === 'production' ? 'Telemetry error' : err.message });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
