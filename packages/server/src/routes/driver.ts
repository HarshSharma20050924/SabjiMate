import { Router, Request, Response } from 'express';
import prisma from '../db';
import { protect, driverOrAdmin } from '../middleware/auth';
// @ts-ignore: This will be resolved by running `npx prisma generate`
import { Prisma as PrismaTypes, PaymentStatus } from '@prisma/client';
import { UserWishlist } from '../../../common/types';
import logger from '../logger';
import { broadcast } from '../websocket';
import IORedis from 'ioredis';
import { sendOTP } from '../services/otp';

const router = Router();
const redisClient = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

router.use(protect, driverOrAdmin);

// --- NEW OTP-BASED CUSTOMER ACCESS ---
router.post('/request-customer-access', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Driver not authenticated.' });

    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Customer ID is required.' });

    const driverId = req.user.phone;
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
    const redisKey = `customer_access_otp:${driverId}:${customerId}`;

    try {
        await redisClient.set(redisKey, otp, 'EX', 120); // OTP expires in 2 minutes
        const messageTemplate = `Your SabziMATE verification code to allow driver access is: {{otp}}. Do not share this with anyone else.`;
        await sendOTP(customerId, otp, messageTemplate);
        res.status(200).json({ message: 'OTP sent to customer.' });
    } catch (error: any) {
        logger.error(error, `Failed to send access OTP to customer ${customerId}`);
        res.status(500).json({ error: error.message || 'Could not send access code.' });
    }
});

router.post('/verify-customer-access', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Driver not authenticated.' });

    const { customerId, otp } = req.body;
    if (!customerId || !otp) return res.status(400).json({ error: 'Customer ID and OTP are required.' });

    const driverId = req.user.phone;
    const redisKey = `customer_access_otp:${driverId}:${customerId}`;

    const storedOtp = await redisClient.get(redisKey);
    if (storedOtp && storedOtp === otp) {
        await redisClient.del(redisKey); // OTP is single-use
        res.status(200).json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid or expired access code.' });
    }
});


// GET today's wishlist summary
router.get('/wishlist/today', async (req: Request, res: Response) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const wishlistItems = await prisma.wishlistItem.findMany({
        where: { wishlist: { date: today } },
        include: { vegetable: true }
    });
    
    const summary: { [key: string]: { totalQuantity: number; unit: any } } = {};
    wishlistItems.forEach(item => {
        const name = (item.vegetable.name as PrismaTypes.JsonObject).EN as string;
        const qtyString = item.quantity;
        let qtyInKg = 0;
        if (qtyString.includes('kg')) {
            qtyInKg = parseFloat(qtyString);
        } else if (qtyString.includes('g')) {
            qtyInKg = parseFloat(qtyString) / 1000;
        }

        if (!summary[name]) {
            summary[name] = { totalQuantity: 0, unit: 'kg' };
        }
        summary[name].totalQuantity += qtyInKg;
    });

    const aggregated = Object.entries(summary).map(([name, data]) => ({ name, ...data }));
    res.json(aggregated);
});

// New endpoint to get wishlist broken down by user
router.get('/wishlist/by-user', async (req: Request, res: Response) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    try {
        const confirmedDeliveries = await prisma.deliveryConfirmation.findMany({
            where: { date: today, choice: 'YES' },
            include: { user: true }
        });

        const userIds = confirmedDeliveries.map(d => d.userId);

        const userWishlists = await prisma.wishlist.findMany({
            where: {
                date: today,
                userId: { in: userIds }
            },
            include: {
                items: {
                    include: {
                        vegetable: true
                    }
                }
            }
        });

        const result: UserWishlist[] = confirmedDeliveries.map(delivery => {
            const wishlist = userWishlists.find(w => w.userId === delivery.userId);
            return {
                user: delivery.user,
                items: wishlist ? wishlist.items.map(item => ({
                    vegetableName: (item.vegetable.name as PrismaTypes.JsonObject).EN as string,
                    quantity: item.quantity
                })) : []
            };
        });

        res.json(result);

    } catch (error) {
        logger.error(error, "Failed to fetch wishlist by user for driver");
        res.status(500).json({ error: 'Could not fetch wishlist details.' });
    }
});

// GET a user's sales history
router.get('/users/:phone/sales', async (req: Request, res: Response) => {
    const { phone } = req.params;
    try {
        const sales = await prisma.sale.findMany({
            where: { userId: phone },
            include: { items: true },
            orderBy: { date: 'desc' }
        });
        res.json(sales);
    } catch (error) {
        logger.error(error, `Failed to fetch sales for user ${phone}`);
        res.status(500).json({ error: 'Could not fetch sales data.' });
    }
});

// POST to mark a sale as paid by cash
router.post('/sales/:id/mark-paid-cash', async (req: Request, res: Response) => {
    const { id } = req.params;
    const driver = req.user;

    if (!driver) {
        return res.status(401).json({ error: 'Driver not authenticated.' });
    }

    try {
        const saleToUpdate = await prisma.sale.findUnique({ 
            where: { id: parseInt(id) },
            include: { items: true }
        });
        if (!saleToUpdate) {
            return res.status(404).json({ error: 'Sale not found.' });
        }
        if (saleToUpdate.paymentStatus !== 'UNPAID') {
            return res.status(400).json({ error: 'Sale is not marked as UNPAID.' });
        }

        const updatedSale = await prisma.sale.update({
            where: { id: parseInt(id) },
            data: { paymentStatus: PaymentStatus.PAID_CASH },
            include: { items: true } // Include items for the broadcast payload
        });

        const customer = await prisma.user.findUnique({ where: { phone: updatedSale.userId }});

        broadcast({
            type: 'payment_received_cash',
            payload: {
                sale: updatedSale,
                driverName: driver.name,
                customerName: customer?.name || 'Unknown User'
            }
        });

        res.status(200).json(updatedSale);
    } catch (error) {
        logger.error(error, `Driver failed to mark sale ${id} as paid`);
        res.status(500).json({ error: 'Could not update sale status.' });
    }
});

// --- New Driver Map Features ---

// Get customers within a certain radius of the driver
router.get('/nearby-customers', async (req: Request, res: Response) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const radiusInKm = 0.5; // 500 meters

    try {
        // This is a simplified radius search. For production, a database with geospatial queries (like PostGIS) is recommended.
        const allUsers = await prisma.user.findMany({
            where: {
                role: 'USER',
                latitude: { not: null },
                longitude: { not: null },
            }
        });
        
        // Haversine formula to calculate distance
        const R = 6371; // Earth radius in km
        const nearby = allUsers.filter(user => {
            const dLat = (user.latitude! - latitude) * Math.PI / 180;
            const dLon = (user.longitude! - longitude) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(latitude * Math.PI / 180) * Math.cos(user.latitude! * Math.PI / 180) * 
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            return distance <= radiusInKm;
        });
        
        res.json(nearby);
    } catch (error) {
        logger.error(error, "Failed to get nearby customers");
        res.status(500).json({ error: 'Could not fetch nearby customers.' });
    }
});

export default router;