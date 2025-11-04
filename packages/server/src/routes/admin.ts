import { Router, Request, Response } from 'express';
import prisma from '../db';
import * as bcrypt from 'bcryptjs';
import { protect, admin } from '../middleware/auth';
// @ts-ignore: This will be resolved by running `npx prisma generate`
import { Prisma as PrismaTypes, PaymentStatus } from '@prisma/client';
import logger from '../logger';
import { UserWishlist } from '../../../common/types';
import IORedis from 'ioredis';
import { sendNotification } from '../services/notifications';
import { GoogleGenAI, Type } from '@google/genai';

const router = Router();
const redisClient = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// All routes in this file are protected and require admin role
router.use(protect, admin);

// --- Analytics ---
router.get('/analytics/summary', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
        return res.status(400).json({ error: 'startDate and endDate query parameters are required.' });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const totalRevenueResult = await prisma.sale.aggregate({
            _sum: { total: true },
            where: { date: { gte: start, lte: end }, paymentStatus: { not: 'UNPAID' } },
        });

        const [totalUsers, totalOrders, historicalRevenueRaw, topVegetablesRaw, topCustomersRaw] = await Promise.all([
            prisma.user.count({ where: { role: 'USER', createdAt: { lte: end } } }),
            prisma.sale.count({ where: { date: { gte: start, lte: end } } }),
            prisma.sale.groupBy({
                by: ['date'],
                where: { date: { gte: start, lte: end }, paymentStatus: { not: 'UNPAID' } },
                _sum: { total: true },
                orderBy: { date: 'asc' },
            }),
            prisma.saleItem.groupBy({
                by: ['vegetableName'],
                _count: { vegetableName: true },
                where: { sale: { date: { gte: start, lte: end } } },
                orderBy: { _count: { vegetableName: 'desc' } },
                take: 5,
            }),
            prisma.sale.groupBy({
                by: ['userId'],
                _sum: { total: true },
                where: { date: { gte: start, lte: end }, paymentStatus: { not: 'UNPAID' } },
                orderBy: { _sum: { total: 'desc' } },
                take: 5,
            })
        ]);
        
        const userPhones = topCustomersRaw.map(c => c.userId);
        const topCustomerUsers = await prisma.user.findMany({ where: { phone: { in: userPhones } } });

        const historicalRevenue = historicalRevenueRaw.map(d => ({ date: d.date.toISOString().split('T')[0], revenue: d._sum.total || 0, }));
        const topVegetables = topVegetablesRaw.map(v => ({ name: v.vegetableName, count: v._count.vegetableName, }));
        const topCustomers = topCustomersRaw.map(c => {
            const user = topCustomerUsers.find(u => u.phone === c.userId);
            return { name: user?.name || c.userId, phone: c.userId, totalSpent: c._sum.total || 0 };
        });

        // --- AI-Powered Insights ---
let salesForecast: { date: string; revenue: number }[] = [];
let smartInsights: any[] = [];

if (process.env.API_KEY) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const historicalDataString = historicalRevenue
            .map(d => `${d.date}: ${d.revenue.toFixed(2)}`)
            .join('\n');

        const prompt = `Based on the following daily sales data for a vegetable delivery business:\n${historicalDataString}\n\nAnalyze this data and provide a JSON object with two keys: "salesForecast" and "smartInsights".\n1. "salesForecast": Provide a realistic sales revenue forecast for the next 7 days. It should be an array of 7 objects, each with a "date" (in 'YYYY-MM-DD' format, starting from tomorrow) and a predicted "revenue" (as a number).\n2. "smartInsights": Provide up to 2 actionable insights. It should be an array of objects. For each insight, provide "type" ('overstock' or 'lapsing_customer'), "title", "description", a suggested "action", and a "data" object with relevant details like a vegetable name or customer info. For example, identify a vegetable that has low sales count from the top vegetables data provided: ${JSON.stringify(topVegetables)}.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        salesForecast: {
                            type: Type.ARRAY,
                            items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, revenue: { type: Type.NUMBER } } }
                        },
                        smartInsights: {
                            type: Type.ARRAY,
                            items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING }, action: { type: Type.STRING }, data: { type: Type.OBJECT } } }
                        }
                    }
                }
            }
        });

        if (!response.text) {
            logger.warn("Gemini API returned empty text for analytics summary.");
        } else {
            try {
                const aiResult = JSON.parse(response.text.trim());
                salesForecast = aiResult.salesForecast || [];
                smartInsights = aiResult.smartInsights || [];
            } catch (parseError) {
                logger.error(parseError, "Failed to parse Gemini API JSON response.");
            }
        }

    } catch (aiError) {
        logger.error(aiError, "Gemini API call failed for analytics summary.");
        // Fails gracefully, the API call error won't break the response
    }
}

        
        res.json({
            totalRevenue: totalRevenueResult._sum.total || 0,
            totalUsers,
            totalOrders,
            historicalRevenue,
            topVegetables,
            topCustomers,
            salesForecast,
            smartInsights,
        });

    } catch (error) {
        logger.error(error, "Failed to fetch analytics summary.");
        res.status(500).json({ error: 'Could not load analytics summary.' });
    }
});


// --- Notifications ---
router.post('/notifications/broadcast', async (req, res) => {
    const { title, body } = req.body;
    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required for broadcast.' });
    }

    try {
        const subscriptions = await prisma.pushSubscription.findMany();
        if (subscriptions.length === 0) {
            return res.json({ success: true, count: 0, message: 'No subscribers to notify.' });
        }

        const payload = {
            title,
            body,
            icon: '/logo.svg',
            data: { url: '/' } // Open the app's root on click
        };

        logger.info(`Sending broadcast to ${subscriptions.length} subscribers.`);

        // Send all notifications concurrently
        await Promise.all(subscriptions.map(sub => sendNotification(sub, payload)));

        res.json({ success: true, count: subscriptions.length });

    } catch (error) {
        logger.error(error, "Failed to send broadcast notifications.");
        res.status(500).json({ error: 'An error occurred while sending the broadcast.' });
    }
});


// --- Wishlist Lock Setting ---
router.get('/settings/wishlist-lock', async (req, res) => {
    try {
        const isLocked = await redisClient.get('setting:isWishlistLocked') === 'true';
        res.json({ isLocked });
    } catch (error) {
        logger.error(error, "Failed to get wishlist lock status");
        res.status(500).json({ error: 'Could not retrieve lock status.' });
    }
});

router.put('/settings/wishlist-lock', async (req, res) => {
    const { isLocked } = req.body;
    if (typeof isLocked !== 'boolean') {
        return res.status(400).json({ error: 'isLocked must be a boolean.' });
    }
    try {
        await redisClient.set('setting:isWishlistLocked', isLocked ? 'true' : 'false');
        res.json({ success: true, isLocked });
    } catch (error) {
        logger.error(error, "Failed to set wishlist lock status");
        res.status(500).json({ error: 'Could not update lock status.' });
    }
});

// New route to get ALL vegetables for the admin panel
router.get('/vegetables/all', async (req: Request, res: Response) => {
    try {
        const vegetables = await prisma.vegetable.findMany({
            orderBy: { name: 'asc' } // Keep some ordering
        });
        
        // Map fields to match the frontend `Vegetable` type, which expects `price` for the SabziMate price.
        const mappedVegetables = vegetables.map(v => ({
            ...v,
            price: v.sabzimatePrice 
        }));

        res.json(mappedVegetables);
    } catch (error) {
        logger.error(error, "Failed to fetch all vegetables for admin");
        res.status(500).json({ error: 'Could not fetch vegetables' });
    }
});


// --- Delivery Area Management ---
router.post('/delivery-areas', async (req: Request, res: Response) => {
    const { city, state } = req.body;
    if (!city || !state) return res.status(400).json({ error: 'City and state are required.' });
    try {
        const newArea = await prisma.deliveryArea.create({
            data: { city, state, isActive: true }
        });
        res.status(201).json(newArea);
    } catch (e: any) {
        if (e.code === 'P2002') return res.status(409).json({ error: 'This delivery area already exists.' });
        res.status(500).json({ error: 'Could not create delivery area.' });
    }
});

router.put('/delivery-areas/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
        const updatedArea = await prisma.deliveryArea.update({
            where: { id: parseInt(id) },
            data: { isActive }
        });
        res.json(updatedArea);
    } catch (e) {
        res.status(500).json({ error: 'Could not update delivery area.' });
    }
});

// --- Driver Management ---
router.get('/drivers', async (req: Request, res: Response) => {
    const drivers = await prisma.user.findMany({ where: { role: 'DRIVER' } });
    res.json(drivers);
});

router.post('/drivers', async (req: Request, res: Response) => {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'Name, phone, and password are required.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const driver = await prisma.user.create({
            data: { name, phone, password: hashedPassword, role: 'DRIVER', address: 'On Duty' }
        });
        res.status(201).json(driver);
    } catch (e: any) {
        if (e.code === 'P2002') return res.status(409).json({ error: 'A user with this phone number already exists.' });
        res.status(500).json({ error: 'Could not create driver.' });
    }
});


// --- Dashboard Data Routes ---
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
        items: wishlist
          ? wishlist.items.map(item => ({
              vegetableName: (item.vegetable.name as PrismaTypes.JsonObject)
                .EN as string,
              quantity: item.quantity
            }))
          : []
      };
    });

    res.json(result);
  } catch (error) {
    logger.error(error, "Failed to fetch wishlist by user for admin");
    res.status(500).json({ error: "Could not fetch wishlist details." });
  }
});




router.get('/users', async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({ where: { role: 'USER' } });
    res.json(users);
});

router.get('/sales', async (req: Request, res: Response) => {
    const sales = await prisma.sale.findMany({ include: { items: true }, orderBy: { date: 'desc' } });
    res.json(sales);
});

router.post('/sales/:id/mark-paid-cash', async (req: Request, res: Response) => {
    const { id } = req.params;
    await prisma.sale.update({
        where: { id: parseInt(id) },
        data: { paymentStatus: PaymentStatus.PAID_CASH }
    });
    res.status(200).send();
});

router.get('/orders/urgent/all', async (req: Request, res: Response) => {
    const urgentOrders = await prisma.sale.findMany({
        where: { isUrgent: true },
        include: { items: true },
        orderBy: { date: 'desc' }
    });
    res.json(urgentOrders);
});

// This endpoint is now served by the dedicated deliveries router
router.get('/deliveries/today', async (req: Request, res: Response) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const confirmations = await prisma.deliveryConfirmation.findMany({ where: { date: today } });
    if (confirmations.length === 0) {
        return res.json({ confirmed: [], rejected: [] });
    }
    const userPhones = confirmations.map(c => c.userId);
    const users = await prisma.user.findMany({ where: { phone: { in: userPhones } } });
    
    const confirmed = users.filter(u => confirmations.find(c => c.userId === u.phone)?.choice === 'YES');
    const rejected = users.filter(u => confirmations.find(c => c.userId === u.phone)?.choice === 'NO');

    res.json({ confirmed, rejected });
});

// --- Promotions / Coupon Management ---
router.get('/promotions', async (req, res) => {
    const promotions = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(promotions);
});

router.post('/promotions', async (req, res) => {
    const { code, discountType, discountValue, isActive, expiresAt, minOrderValue } = req.body;
    if (!code || !discountType || !discountValue) {
        return res.status(400).json({ error: 'Code, type, and value are required.' });
    }
    try {
        const newPromo = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                discountValue,
                isActive,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                minOrderValue,
            }
        });
        res.status(201).json(newPromo);
    } catch (e: any) {
        if (e.code === 'P2002') return res.status(409).json({ error: 'A coupon with this code already exists.' });
        logger.error(e, 'Failed to create promotion');
        res.status(500).json({ error: 'Could not create promotion.' });
    }
});

router.put('/promotions/:id', async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body; // For now, only allow toggling active status
     if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean.' });
    }
    try {
        const updatedPromo = await prisma.coupon.update({
            where: { id: parseInt(id) },
            data: { isActive }
        });
        res.json(updatedPromo);
    } catch (e) {
        logger.error(e, `Failed to update promotion ${id}`);
        res.status(500).json({ error: 'Could not update promotion.' });
    }
});

export default router;