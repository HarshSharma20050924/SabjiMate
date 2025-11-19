
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
        const end = new Date(endDate);
        const start = new Date(startDate);
        const daysInPeriod = (end.getTime() - start.getTime()) / (1000 * 3600 * 24) + 1;

        // --- Core Metrics ---
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
        
        // --- Churn Calculation ---
        const churnPeriodEnd = new Date(endDate);
        const churnPeriodStart = new Date(churnPeriodEnd);
        churnPeriodStart.setDate(churnPeriodStart.getDate() - 30);
        const previousPeriodStart = new Date(churnPeriodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);

        const [usersInCurrentPeriod, usersInPreviousPeriod] = await Promise.all([
            prisma.sale.findMany({ where: { date: { gte: churnPeriodStart, lte: churnPeriodEnd } }, distinct: ['userId'] }),
            prisma.sale.findMany({ where: { date: { gte: previousPeriodStart, lt: churnPeriodStart } }, distinct: ['userId'] })
        ]);
        
        const currentPeriodUserIds = new Set(usersInCurrentPeriod.map(s => s.userId));
        const previousPeriodUserIds = new Set(usersInPreviousPeriod.map(s => s.userId));
        
        const churnedCustomers = [...previousPeriodUserIds].filter(id => !currentPeriodUserIds.has(id)).length;
        const newCustomers = [...currentPeriodUserIds].filter(id => !previousPeriodUserIds.has(id)).length;
        const churnRate = previousPeriodUserIds.size > 0 ? (churnedCustomers / previousPeriodUserIds.size) * 100 : 0;
        
        // --- Data Shaping ---
        const historicalRevenue = historicalRevenueRaw.map(d => ({ date: d.date.toISOString().split('T')[0], revenue: d._sum.total || 0, }));
        const topVegetables = topVegetablesRaw.map(v => ({ name: v.vegetableName, count: v._count.vegetableName, }));
        const topCustomerUsers = await prisma.user.findMany({ where: { phone: { in: topCustomersRaw.map(c => c.userId) } } });
        const topCustomers = topCustomersRaw.map(c => ({ name: topCustomerUsers.find(u => u.phone === c.userId)?.name || c.userId, phone: c.userId, totalSpent: c._sum.total || 0 }));
        
        // --- AI-Powered Insights ---
        let salesForecast: any[] = [];
        let smartInsights: any[] = [];
        let inventoryForecast: any[] = [];

        if (process.env.API_KEY) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const historicalDataString = historicalRevenue.map(d => `${d.date}: ${d.revenue.toFixed(2)}`).join('\n');
                const topVegSalesString = JSON.stringify(topVegetables);
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dayOfWeek = tomorrow.toLocaleString('en-US', { weekday: 'long' });

                const prompt = `You are a predictive supply chain and business analyst for 'Sabzi MATE'. Analyze the provided data for a vegetable delivery business.
                
                Data:
                1. Historical daily sales revenue for the last ${daysInPeriod} days:
                ${historicalDataString}
                
                2. Top 5 selling vegetables by count in the same period:
                ${topVegSalesString}

                Tomorrow is a ${dayOfWeek}.
                
                Based on this data, provide a JSON object with three keys: "salesForecast", "smartInsights", and "inventoryForecast".
                1. "salesForecast": A realistic sales revenue forecast for the next 7 days. Array of 7 objects with "date" ('YYYY-MM-DD') and "revenue" (number).
                2. "smartInsights": Up to 2 actionable insights. Array of objects with "type" ('overstock' or 'lapsing_customer'), "title", "description", "action", and a "data" object as a JSON string.
                3. "inventoryForecast": A predictive inventory order suggestion for tomorrow for the top 5 vegetables. Array of objects with "vegetable", "suggestedOrder" (string, e.g., "55 kg"), and "reasoning" (a brief, data-driven explanation).`;

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash", contents: prompt,
                    config: { responseMimeType: "application/json", responseSchema: {
                        type: Type.OBJECT, properties: {
                            salesForecast: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, revenue: { type: Type.NUMBER } } } },
                            smartInsights: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING }, action: { type: Type.STRING }, data: { type: Type.STRING, description: 'A JSON string containing any relevant data, like a user ID or vegetable name.' } } } },
                            inventoryForecast: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { vegetable: { type: Type.STRING }, suggestedOrder: { type: Type.STRING }, reasoning: { type: Type.STRING } } } }
                        }
                    }}
                });
                
                if (response.text) {
                    const aiResult = JSON.parse(response.text.trim());
                    salesForecast = aiResult.salesForecast || [];
                    smartInsights = aiResult.smartInsights || [];
                    inventoryForecast = aiResult.inventoryForecast || [];
                }
            } catch (aiError) { logger.error(aiError, "Gemini API call failed for analytics summary."); }
        }
        
        res.json({
            totalRevenue: totalRevenueResult._sum.total || 0,
            totalUsers, totalOrders, historicalRevenue, topVegetables, topCustomers, salesForecast, smartInsights, inventoryForecast,
            churnRate: { rate: churnRate, newCustomers, churnedCustomers },
            deliveryEfficiency: { avgOrdersPerDay: totalOrders / daysInPeriod, onTimePercentage: 96.5 } // Mocked efficiency
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

        // Send all notifications concurrently and count results
        const results = await Promise.all(subscriptions.map(sub => sendNotification(sub, payload)));
        const successCount = results.filter(r => r === true).length;
        const failureCount = results.length - successCount;

        res.json({ success: true, count: successCount, failed: failureCount, total: subscriptions.length });

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

// --- Reviews ---
router.get('/reviews/batch', async (req, res) => {
    try {
        const reviews = await prisma.batchReview.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true } },
                sale: { include: { items: { select: { vegetableName: true, quantity: true } } } }
            }
        });
        res.json(reviews);
    } catch (error) {
        logger.error(error, "Failed to fetch batch reviews for admin.");
        res.status(500).json({ error: 'Could not fetch reviews.' });
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
