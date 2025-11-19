import { Router } from 'express';
import { protect } from '../middleware/auth';
import prisma from '../db';
import logger from '../logger';

const router = Router();

// This route is protected and requires a user to be logged in.
router.use(protect);

// Route for the client to get the VAPID public key
router.get('/vapidPublicKey', (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
        logger.error('VAPID_PUBLIC_KEY is not set on the server.');
        return res.status(500).json({ error: 'Notification service is not configured.' });
    }
    res.send(publicKey);
});

// Route to subscribe a user to push notifications
router.post('/subscribe', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription object provided.' });
    }

    try {
        logger.info(`Received push subscription for user ${req.user.phone}`);

        // Upsert ensures we don't store duplicate endpoints for the same user
        await prisma.pushSubscription.upsert({
            where: {
                endpoint: subscription.endpoint,
            },
            update: {
                keys: subscription.keys,
                userId: req.user.phone,
            },
            create: {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                userId: req.user.phone,
            },
        });

        logger.info({ userId: req.user.phone, endpoint: subscription.endpoint.slice(0, 20) + '...' }, 'User successfully subscribed to push notifications.');
        res.status(201).json({ success: true });
    } catch (error) {
        logger.error(error, 'Failed to save push subscription.');
        res.status(500).json({ error: 'Could not save subscription.' });
    }
});

// Route to unsubscribe a user from push notifications
router.post('/unsubscribe', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    const { endpoint } = req.body;

    if (!endpoint) {
        return res.status(400).json({ error: 'Subscription endpoint is required to unsubscribe.' });
    }

    try {
        await prisma.pushSubscription.deleteMany({
            where: {
                userId: req.user.phone,
                endpoint: endpoint,
            },
        });

        logger.info({ userId: req.user.phone }, 'User unsubscribed from push notifications.');
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error(error, 'Failed to delete push subscription.');
        res.status(500).json({ error: 'Could not remove subscription.' });
    }
});

export default router;