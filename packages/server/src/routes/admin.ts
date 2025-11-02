import { Router, Request, Response } from 'express';
import prisma from '../db';
import * as bcrypt from 'bcryptjs';
import { protect, admin } from '../middleware/auth';
// @ts-ignore: This will be resolved by running `npx prisma generate`
import { Prisma as PrismaTypes, PaymentStatus } from '@prisma/client';
import logger from '../logger';
import { UserWishlist } from '../../../common/types';
import IORedis from 'ioredis';

const router = Router();
const redisClient = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// All routes in this file are protected and require admin role
router.use(protect, admin);

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