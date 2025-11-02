// FIXME: This file may show a TypeScript error if the Prisma client has not been generated.
// Run `npx prisma generate` in your terminal to fix this.
import { RequestHandler } from 'express';
import * as jwt from 'jsonwebtoken';
import prisma from '../db';
// @ts-ignore: This is a valid import after `prisma generate`
import { User as PrismaUser } from '@prisma/client';
import logger from '../logger';

// Use the correct secret for verifying the ACCESS token, matching what's used for signing in auth.ts.
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-secret';

// Augment Express's Request interface
declare global {
    namespace Express {
        interface Request {
            user?: PrismaUser;
        }
    }
}

export const protect: RequestHandler = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            // Verify the token with the correct access token secret.
            const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as { userId: string };
            
            const user = await prisma.user.findUnique({
                where: { phone: decoded.userId }
            });

            if (!user) {
                return res.status(401).json({ error: 'Not authorized, user not found' });
            }
            req.user = user;
            next();
        } catch (error) {
            logger.error(error, 'Not authorized, token failed');
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }
};

export const admin: RequestHandler = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Not authorized as an admin' });
    }
};

export const driverOrAdmin: RequestHandler = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'DRIVER')) {
        next();
    } else {
        res.status(403).json({ error: 'Not authorized for this resource' });
    }
};