import { Router, Request, Response } from 'express';
import prisma from '../db';
import { protect } from '../middleware/auth';
import { broadcast } from '../websocket';
// @ts-ignore: This will be resolved by running `npx prisma generate`
import { Vegetable as PrismaVegetable, LocationPrice as PrismaLocationPrice, DeliveryArea as PrismaDeliveryArea, Prisma as PrismaTypes, PaymentStatus } from '@prisma/client';
import logger from '../logger';
import { forwardGeocode } from '../services/geocoding';
import Razorpay from 'razorpay';
import IORedis from 'ioredis';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const redisClient = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');


// Define a more specific type for vegetables with their relations
type VegetableWithRelations = PrismaVegetable & {
    locationPrices: (PrismaLocationPrice & { area: PrismaDeliveryArea })[]
};

// --- PUBLIC ROUTES ---
router.get('/delivery-areas', async (req: Request, res: Response) => {
    try {
        const areas = await prisma.deliveryArea.findMany({
            orderBy: { state: 'asc' }
        });
        res.json(areas);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch delivery areas' });
    }
});

router.get('/settings/wishlist-lock', async (req, res) => {
    try {
        const isLocked = await redisClient.get('setting:isWishlistLocked') === 'true';
        res.json({ isLocked });
    } catch (error) {
        logger.error(error, "Failed to get public wishlist lock status");
        res.status(500).json({ error: 'Could not retrieve lock status.' });
    }
});


// --- PROTECTED ROUTES (USER-ONLY) ---

// New Coupon Validation Route
router.get('/promotions/validate/:code', protect, async (req: Request, res: Response) => {
    const { code } = req.params;
    try {
        const coupon = await prisma.coupon.findFirst({
            where: {
                code: code.toUpperCase(),
                isActive: true,
            }
        });

        if (!coupon) return res.status(404).json({ error: 'Coupon not found or is inactive.' });
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'This coupon has expired.' });
        if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) return res.status(400).json({ error: 'This coupon has reached its usage limit.' });

        res.json(coupon);
    } catch (error) {
        logger.error(error, "Failed to validate coupon");
        res.status(500).json({ error: 'Could not validate coupon.' });
    }
});


router.use(protect);

router.post('/recipe-suggestion', async (req: Request, res: Response) => {
    const { prompt, wishlist } = req.body;

    if (!process.env.API_KEY) {
        return res.status(500).json({ error: 'AI service is not configured.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let fullPrompt = prompt;
        if (wishlist && wishlist.length > 0) {
            const itemList = wishlist.map((item: {name: string, quantity: string}) => `${item.name} (${item.quantity})`).join(', ');
            fullPrompt += `\n\nI have these vegetables in my list: ${itemList}. Can you suggest a recipe using them?`;
        }
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                systemInstruction: "You are a friendly and helpful kitchen assistant for Indian home cooks (often called 'aunties'). Your tone should be warm, encouraging, and conversational. Respond primarily in Hinglish or simple Hindi. When asked for a recipe, provide it in a clear, step-by-step format. You can also ask clarifying questions. If a user provides a list of their vegetables, you can suggest recipes using those.",
            },
        });

        res.json({ suggestion: response.text });

    } catch (error) {
        logger.error(error, "Error getting recipe from Gemini");
        res.status(500).json({ error: 'Could not get a recipe right now.' });
    }
});


// --- New Urgent Order Endpoint ---
const RAZORPAY_KEY_ID = "rzp_test_RVRsuEUd9LNZIM";
const RAZORPAY_KEY_SECRET = "XnNMfcXkY0WhHvojoEGyM5GQ";

const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

router.post('/orders/urgent', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });

    const { items, total, paymentMethod, couponCode } = req.body;

    if (!items || !paymentMethod) {
        return res.status(400).json({ error: 'Missing order details.' });
    }

    try {
        const subtotal = items.reduce((acc: number, item: any) => acc + item.price, 0);
        let finalTotal = 0;
        let calculatedDiscount = 0;
        let validCoupon = null;
        const deliveryCharge = 20;
        const gstRate = 0.05;

        if (couponCode) {
            validCoupon = await prisma.coupon.findFirst({
                where: { code: couponCode, isActive: true }
            });
            if (!validCoupon) throw new Error("Invalid or inactive coupon code.");
            if (validCoupon.expiresAt && new Date(validCoupon.expiresAt) < new Date()) throw new Error("Coupon has expired.");
            if (validCoupon.usageLimit != null && validCoupon.usageCount >= validCoupon.usageLimit) throw new Error("Coupon usage limit reached.");
            if (validCoupon.minOrderValue != null && subtotal < validCoupon.minOrderValue) throw new Error(`A minimum order value of ₹${validCoupon.minOrderValue} is required.`);

            if (validCoupon.discountType === 'PERCENTAGE') {
                calculatedDiscount = subtotal * (validCoupon.discountValue / 100);
            } else {
                calculatedDiscount = validCoupon.discountValue;
            }
            calculatedDiscount = Math.min(calculatedDiscount, subtotal);
        }

        const totalAfterDiscount = subtotal - calculatedDiscount;
        const gst = (totalAfterDiscount + deliveryCharge) * gstRate;
        finalTotal = totalAfterDiscount + deliveryCharge + gst;
        
        // Security check: Compare client total with server-calculated total
        if (Math.abs(finalTotal - total) > 0.01) { // allow for small floating point differences
            logger.warn({ clientTotal: total, serverTotal: finalTotal, userId: req.user.phone }, "Client and server total mismatch during order placement.");
            return res.status(400).json({ error: "Price calculation mismatch. Please try again." });
        }
        
        let sale: any;
        await prisma.$transaction(async (tx) => {
             const saleData = {
                userId: req.user!.phone,
                date: new Date(),
                total: finalTotal,
                isUrgent: true,
                paymentStatus: PaymentStatus.UNPAID,
                couponCode: validCoupon ? validCoupon.code : null,
                items: {
                    create: items.map((item: any) => ({
                        vegetableId: item.vegetableId,
                        vegetableName: item.vegetableName,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            };
            sale = await tx.sale.create({ data: saleData, include: { items: true } });

            if (validCoupon) {
                await tx.coupon.update({
                    where: { id: validCoupon.id },
                    data: { usageCount: { increment: 1 } }
                });
            }
        });


        if (paymentMethod === 'COD') {
            broadcast({ type: 'new_urgent_order', payload: sale });
            res.status(201).json({ sale, message: 'COD order placed successfully' });
        } else if (paymentMethod === 'ONLINE') {
            const razorpayOptions = {
                amount: Math.round(finalTotal * 100),
                currency: "INR",
                receipt: `receipt_sale_${sale.id}`,
            };
            const razorpayOrder = await razorpayInstance.orders.create(razorpayOptions);
            res.json({ sale, razorpayOrder, keyId: RAZORPAY_KEY_ID });
        } else {
            res.status(400).json({ error: 'Invalid payment method' });
        }
    } catch (error: any) {
        logger.error(error, "Failed to create urgent order");
        res.status(500).json({ error: error.message || 'Could not create urgent order' });
    }
});


router.put('/users/me', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });

    const { name, address, paymentPreference, city, state, image, latitude, longitude } = req.body;
    let newCoords = { lat: latitude, lon: longitude };

    try {
        // If address details change but no coords are provided, geocode the address
        const hasAddressChanged = address !== req.user.address || city !== req.user.city || state !== req.user.state;
        if (hasAddressChanged && !latitude && !longitude && address && city && state) {
            const geocodedCoords = await forwardGeocode(address, city, state);
            if (geocodedCoords) {
                newCoords = geocodedCoords;
            } else {
                logger.warn({ user: req.user.phone, address: `${address}, ${city}, ${state}` }, 'Geocoding failed for user address update');
            }
        }
        
        const updatedUser = await prisma.user.update({
            where: { phone: req.user.phone },
            data: {
                name,
                address,
                paymentPreference,
                city,
                state,
                image,
                latitude: newCoords.lat,
                longitude: newCoords.lon,
            }
        });
        res.json(updatedUser);
    } catch (error) {
        logger.error(error, "Failed to update user profile");
        res.status(500).json({ error: 'Could not update user profile' });
    }
});

router.route('/wishlist')
    .get(async (req: Request, res: Response) => {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const wishlist = await prisma.wishlist.findUnique({
            where: { userId_date: { userId: req.user.phone, date: today } },
            select: { items: true }
        });
        res.json(wishlist?.items || []);
    })
    .post(async (req: Request, res: Response) => {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        // Server-side lock check from Redis
        const isLocked = await redisClient.get('setting:isWishlistLocked') === 'true';
        if (isLocked) {
            return res.status(403).json({ error: "Today's wishlist is locked for delivery planning." });
        }

        const { items } = req.body as { items: { vegetableId: number; quantity: string }[] };
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        try {
            await prisma.$transaction(async (tx) => {
                const wishlist = await tx.wishlist.upsert({
                    where: { userId_date: { userId: req.user!.phone, date: today } },
                    update: {},
                    create: { userId: req.user!.phone, date: today }
                });
                await tx.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
                if (items && items.length > 0) {
                    await tx.wishlistItem.createMany({
                        data: items.map(item => ({ vegetableId: item.vegetableId, quantity: item.quantity, wishlistId: wishlist.id }))
                    });
                }
            });
            
            // --- REAL-TIME UPDATE FOR ADMIN DASHBOARD ---
            const allTodaysWishlistItems = await prisma.wishlistItem.findMany({
                where: { wishlist: { date: today } },
                include: { vegetable: true }
            });
            
            const summary: { [key: string]: { totalQuantity: number; unit: any } } = {};
            allTodaysWishlistItems.forEach(item => {
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

            const aggregatedPayload = Object.entries(summary).map(([name, data]) => ({ name, ...data }));
            broadcast({ type: 'wishlist_update', payload: aggregatedPayload });
            // --- END REAL-TIME UPDATE ---

            res.status(200).send();
        } catch (error) {
            logger.error(error, "Error submitting wishlist");
            res.status(500).json({ error: "Failed to submit wishlist." });
        }
    });

router.route('/standing-order')
    .get(async (req: Request, res: Response) => {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });
        const order = await prisma.standingOrder.findMany({
            where: { userId: req.user.phone }
        });
        res.json(order);
    })
    .post(async (req: Request, res: Response) => {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });
        const { items } = req.body as { items: { vegetableId: number; quantity: string }[] };
        
        try {
            await prisma.$transaction(async (tx) => {
                await tx.standingOrder.deleteMany({ where: { userId: req.user!.phone } });
                if (items && items.length > 0) {
                    await tx.standingOrder.createMany({
                        data: items.map(item => ({ ...item, userId: req.user!.phone }))
                    });
                }
            });
            res.status(200).send();
        } catch (error) {
            logger.error(error, "Error updating standing order");
            res.status(500).json({ error: "Failed to update standing order." });
        }
    });

router.get('/bills', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    const sales = await prisma.sale.findMany({
        where: { userId: req.user.phone },
        include: { items: { include: { review: true } } }, // Include review for each item
        orderBy: { date: 'desc' }
    });

    const bills = sales.map(sale => ({
        id: sale.id,
        date: sale.date.toISOString().split('T')[0],
        items: sale.items.map(item => ({
            id: item.id, // This is the SaleItem ID
            name: item.vegetableName,
            quantity: item.quantity,
            price: item.price,
            vegetableId: item.vegetableId,
            rating: item.review?.rating || null, // Pass existing rating
        })),
        total: sale.total,
        paymentStatus: sale.paymentStatus
    }));
    res.json(bills);
});


router.post('/sales/record', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    const { userId, items, total, isUrgent } = req.body;
    try {
        const sale = await prisma.sale.create({
            data: {
                userId,
                date: new Date(),
                total,
                isUrgent: isUrgent || false,
                paymentStatus: PaymentStatus.UNPAID,
                items: {
                    create: items.map((item: any) => ({
                        vegetableId: item.vegetableId,
                        vegetableName: item.vegetableName,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            },
            include: { items: true } // Include items in the response
        });
        
        if (sale.isUrgent) {
            broadcast({ type: 'new_urgent_order', payload: sale });
        }
        
        res.status(201).json(sale);
    } catch (error) {
        logger.error(error, "Failed to record sale");
        res.status(500).json({ error: 'Could not record sale' });
    }
});


router.post('/reviews', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    const { saleItemId, rating, comment } = req.body;
    const userId = req.user.phone;

    if (!saleItemId || !rating) {
        return res.status(400).json({ error: 'Sale item ID and rating are required.' });
    }

    try {
        // 1. Verify that the saleItem belongs to the user who is reviewing it.
        const saleItem = await prisma.saleItem.findUnique({
            where: { id: saleItemId },
            include: { sale: true }
        });

        if (!saleItem || saleItem.sale.userId !== userId) {
            return res.status(403).json({ error: "You can only review items you've purchased." });
        }

        // 2. Create the review
        const review = await prisma.review.create({
            data: {
                rating,
                comment,
                userId,
                vegetableId: saleItem.vegetableId,
                saleItemId: saleItem.id
            }
        });

        res.status(201).json(review);
    } catch (error: any) {
        if (error.code === 'P2002') { // Unique constraint failed on saleItemId
            return res.status(409).json({ error: "This item has already been reviewed." });
        }
        logger.error(error, "Failed to submit review");
        res.status(500).json({ error: 'Could not submit review.' });
    }
});

export default router;