import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import rateLimit from 'express-rate-limit';
import IORedis from 'ioredis';
import { randomBytes } from 'crypto';
import prisma from '../db';
// @ts-ignore: This will be resolved by running `npx prisma generate`
import { User as PrismaUser } from '@prisma/client';
import logger from '../logger';
import { sendOTP } from '../services/otp';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { protect, admin } from '../middleware/auth';

const router = Router();

// --- Configuration ---
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const ACCESS_TOKEN_LIFETIME = '15m';
const REFRESH_TOKEN_LIFETIME = '7d';
const OTP_EXPIRATION_SECONDS = 300; // 5 minutes

// --- Stores & Clients ---
const redisClient = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// --- Helper Functions ---
const generateTokens = (user: PrismaUser) => {
    const jti = randomBytes(16).toString('hex');
    const accessToken = jwt.sign({ userId: user.phone, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_LIFETIME });
    const refreshToken = jwt.sign({ userId: user.phone, role: user.role, jti }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_LIFETIME });
    return { accessToken, refreshToken, jti };
};

// --- Types ---
declare global {
    namespace Express {
        interface Request { user?: PrismaUser; }
        interface User extends PrismaUser {}
    }
}
interface DecodedRefreshToken extends jwt.JwtPayload {
    userId: string;
    role: string;
    jti: string;
    exp?: number;
}

// --- Rate Limiters ---
const otpLimiter = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 10, // Increased for demo purposes
	message: { error: 'Too many OTP requests. Please try again in 5 minutes.' },
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Increased for demo purposes
    message: { error: 'Too many login attempts. Please try again in 15 minutes.'}
});


// --- Passport Google Strategy ---
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email found from Google profile"));
        
        let user = await prisma.user.findUnique({ where: { phone: email } });
        if (!user) {
            user = await prisma.user.create({ data: { phone: email, name: profile.displayName || 'New User', role: 'USER' } });
        }
        return done(null, user);
    } catch (err) { return done(err as Error); }
  }
));

// --- Routes ---

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), (req: Request, res: Response) => {
    const user = req.user as PrismaUser;
    // Note: For full consistency, this should also generate access/refresh tokens.
    // Kept as-is to minimize changes to the Google flow unless specified.
    const token = jwt.sign({ userId: user.phone, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
    const userParam = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${APP_URL}#token=${token}&user=${userParam}`);
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
    const { phone, password } = req.body;
    if (!phone || typeof phone !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Phone and password must be provided.' });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid phone number or password' });
    }
    if (user.role !== 'ADMIN' && user.role !== 'DRIVER') {
        return res.status(403).json({ error: 'Access denied. This login is for staff only.' });
    }
    
    // New 2FA check
    if (user.isTwoFactorEnabled) {
        // Generate a temporary token for the 2FA verification step
        const tempToken = jwt.sign({ userId: user.phone, action: '2fa_verify' }, ACCESS_TOKEN_SECRET, { expiresIn: '5m' });
        return res.json({ twoFactorRequired: true, tempToken });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    res.json({ accessToken, refreshToken, user });
});

router.post('/send-otp', otpLimiter, async (req: Request, res: Response) => {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // The magic number gets a fixed OTP for testing purposes
    const otp = (phone === '9876543210') ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis with an expiration
    await redisClient.set(`otp:${phone}`, otp, 'EX', OTP_EXPIRATION_SECONDS);
    
    const isDemoMode = process.env.ENABLE_DEMO_LOGIN === 'true';

    try {
        await sendOTP(phone, otp); // Uses default message template
        
        const response: any = { message: 'OTP sent successfully.' };
        if (isDemoMode) {
            response.debugOtp = otp;
        }
        res.json(response);

    } catch (error: any) {
        // If we are in demo mode, swallow the Twilio error (e.g. unverified number) and return the OTP anyway
        if (isDemoMode) {
            logger.warn({ phone, error: error.message }, 'Twilio failed but Demo Mode enabled. Returning OTP to client.');
            return res.json({ 
                message: 'OTP generated (Demo Mode - Twilio Skipped).', 
                debugOtp: otp 
            });
        }

        // The service now throws a user-friendly error
        res.status(500).json({ error: error.message });
    }
});


router.post('/verify-otp', loginLimiter, async (req: Request, res: Response) => {
    const { phone, otp } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ error: 'A valid 10-digit phone number is required.' });
    }
    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
        return res.status(400).json({ error: 'A valid 6-digit OTP is required.' });
    }

    const storedOtp = await redisClient.get(`otp:${phone}`);
    if (!storedOtp || storedOtp !== otp) {
        return res.status(401).json({ error: 'Invalid or expired OTP.' });
    }
    
    // OTP is valid, delete it from Redis to prevent reuse
    await redisClient.del(`otp:${phone}`);

    try {
        let user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
            user = await prisma.user.create({ data: { phone, name: `User ${phone.slice(-4)}`, role: 'USER' } });
        }

        const { accessToken, refreshToken } = generateTokens(user);
        res.json({ accessToken, refreshToken, user });

    } catch (error) {
        logger.error(error, "OTP verification error");
        res.status(500).json({ error: 'An internal error occurred.' });
    }
});

router.post('/refresh', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required.' });

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as DecodedRefreshToken;
        
        const isBlocked = await redisClient.get(`blocklist:${decoded.jti}`);
        if (isBlocked) {
            return res.status(401).json({ error: 'Token has been invalidated.' });
        }

        const user = await prisma.user.findUnique({ where: { phone: decoded.userId }});
        if (!user) return res.status(401).json({ error: 'User not found.' });

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        logger.warn(error, "Refresh token failed validation");
        return res.status(403).json({ error: 'Invalid or expired refresh token.' });
    }
});

router.post('/logout', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as DecodedRefreshToken;
        // FIX: Add a check to ensure 'exp' exists before using it
        if (decoded.exp) {
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
            if (expiresIn > 0) {
                await redisClient.set(`blocklist:${decoded.jti}`, 'true', 'EX', expiresIn);
            }
        }
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
        // Even if token is invalid, we can just say it was successful.
        res.status(200).json({ message: 'Logged out.' });
    }
});

// --- 2FA Routes ---

router.post('/2fa/setup', protect, admin, async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });

    try {
        const secret = speakeasy.generateSecret({
            name: `SabziMATE Admin (${req.user.phone})`,
        });

        await prisma.user.update({
            where: { phone: req.user.phone },
            data: { twoFactorSecret: secret.base32 },
        });

        qrcode.toDataURL(secret.otpauth_url!, (err, data_url) => {
            if (err) {
                logger.error(err, "QR code generation failed");
                return res.status(500).json({ error: 'Could not generate QR code.' });
            }
            res.json({ qrCodeUrl: data_url });
        });
    } catch (error) {
        logger.error(error, "2FA setup failed");
        res.status(500).json({ error: 'Could not set up 2FA.' });
    }
});

router.post('/2fa/enable', protect, admin, async (req: Request, res: Response) => {
    if (!req.user || !req.user.twoFactorSecret) return res.status(400).json({ error: '2FA setup not initiated.' });
    const { token } = req.body;

    const verified = speakeasy.totp.verify({
        secret: req.user.twoFactorSecret,
        encoding: 'base32',
        token,
    });

    if (verified) {
        await prisma.user.update({
            where: { phone: req.user.phone },
            data: { isTwoFactorEnabled: true },
        });
        res.status(200).json({ message: '2FA enabled successfully.' });
    } else {
        res.status(400).json({ error: 'Invalid token. Verification failed.' });
    }
});

router.post('/2fa/verify', async (req: Request, res: Response) => {
    const { tempToken, token } = req.body;
    if (!tempToken || !token) return res.status(400).json({ error: 'Tokens are required.' });

    try {
        const decoded = jwt.verify(tempToken, ACCESS_TOKEN_SECRET) as { userId: string; action: string };
        if (decoded.action !== '2fa_verify') {
            return res.status(401).json({ error: 'Invalid temporary token.' });
        }

        const user = await prisma.user.findUnique({ where: { phone: decoded.userId } });
        if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
            return res.status(401).json({ error: 'User not found or 2FA not enabled.' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
        });

        if (verified) {
            const { accessToken, refreshToken } = generateTokens(user);
            res.json({ accessToken, refreshToken, user });
        } else {
            res.status(401).json({ error: 'Invalid 2FA code.' });
        }
    } catch (error) {
        logger.error(error, "2FA verification failed");
        res.status(401).json({ error: 'Invalid or expired temporary token.' });
    }
});

router.post('/2fa/disable', protect, admin, async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });

    await prisma.user.update({
        where: { phone: req.user.phone },
        data: {
            isTwoFactorEnabled: false,
            twoFactorSecret: null,
        },
    });

    res.status(200).json({ message: '2FA disabled successfully.' });
});

export default router;