

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import logger from './logger'; // Import the new logger
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';
import appRoutes from './routes/app'; // User-facing routes
import driverRoutes from './routes/driver';
import vegetableRoutes from './routes/vegetables';
import deliveryRoutes from './routes/deliveries';
import paymentRoutes from './routes/payments'; // New payment routes
import notificationRoutes from './routes/notifications'; // Import new notification routes
import { initializeDefaultAdmin } from './services/user';
import { initializeWebSocket } from './websocket';
import { configurePush } from './services/notifications';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.resolve(__dirname, `../../../${envFile}`);
dotenv.config({ path: envPath });


// --- Startup Environment Logging ---
logger.info('--- SERVER ENVIRONMENT ---');
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`FORCE_DEV_OTP: ${process.env.FORCE_DEV_OTP}`);
logger.info(`Loaded .env from: ${envPath}`);
logger.info('--------------------------');


const app = express();
app.set('trust proxy', 1); // Trust the first proxy (e.g., Render's load balancer)
const server = http.createServer(app);

// Initialize the WebSocket server and attach it to the HTTP server.
initializeWebSocket(server);

// Initialize the Web Push service.
configurePush();

// --- Express Middleware ---
app.use(cors({
    // This allows credentialed requests (like those with auth tokens)
    // from any origin. For enhanced security in production, you might
    // want to restrict this to your specific Vercel domain.
    origin: true,
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Security Headers Middleware
app.use((req, res, next) => {
    // Instructs browsers to prefer HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Prevents browsers from incorrectly guessing content types
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevents the page from being displayed in an iframe (clickjacking protection)
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info({ method: req.method, url: req.originalUrl, ip: req.ip }, 'Incoming request');
    res.on('finish', () => {
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        logger[logLevel]({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            ip: req.ip
        }, 'Request finished');
    });
    next();
});


// --- API Routes (MUST be before static files) ---
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/vegetables', vegetableRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes); // Mount notification routes
app.use('/api', appRoutes);

// --- Serve Static Frontend Files ---
const clientBuildPath = path.resolve(__dirname, '../../../dist');
app.use(express.static(clientBuildPath));

// --- SPA Fallback Routes (MUST be last) ---
app.get(['/admin', '/admin/*'], (req: Request, res: Response) => {
    res.sendFile(path.resolve(clientBuildPath, 'admin.html'));
});

app.get(['/driver', '/driver/*'], (req: Request, res: Response) => {
    res.sendFile(path.resolve(clientBuildPath, 'driver.html'));
});

app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
});


// --- Server Initialization ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
    logger.info(`✅ Server running on http://localhost:${PORT}`);
    await initializeDefaultAdmin();
});