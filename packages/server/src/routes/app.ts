
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { protect } from '../middleware/auth';
import { broadcast, driverConnections, userConnections } from '../websocket';
// @ts-ignore: This will be resolved by running `npx prisma generate`
import { Vegetable as PrismaVegetable, LocationPrice as PrismaLocationPrice, DeliveryArea as PrismaDeliveryArea, Prisma as PrismaTypes, PaymentStatus } from '@prisma/client';
import logger from '../logger';
import { forwardGeocode } from '../services/geocoding';
import Razorpay from 'razorpay';
import IORedis from 'ioredis';
import { WebSocket } from 'ws';
import { BillEntry } from '../../../common/types';
import { GoogleGenAI, Type } from '@google/genai';


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

    let sale: any;
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


        // Respond to client first
        if (paymentMethod === 'COD') {
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
        return; // Stop execution if order creation fails
    }

    // --- Post-Response Actions: Notify Admins & Find Drivers ---
    
    // Notify admins immediately that a new order has been created.
    broadcast({ type: 'new_urgent_order', payload: sale });

    // --- NEW DRIVER ASSIGNMENT LOGIC ---
    try {
        const storeLocation = { lat: 23.1793, lon: 75.7849 }; // Hardcoded Ujjain store location

        // 1. Get all drivers who are broadcasting their location.
        const availableDriverIds = await redisClient.smembers('available_drivers');
        if (availableDriverIds.length === 0) {
            logger.warn(`No available drivers online for order ${sale.id}.`);
            return;
        }

        // 2. Find drivers within a 10km radius from the store.
        const nearbyDriverIds: string[] = await redisClient.georadius(
            'drivers_locations',
            storeLocation.lon,
            storeLocation.lat,
            10,
            'km'
        ) as string[];

        // 3. Find drivers who are both available AND nearby.
        const eligibleDriverIds = availableDriverIds.filter(id => nearbyDriverIds.includes(id));
        
        if (eligibleDriverIds.length > 0) {
            logger.info(`Found ${eligibleDriverIds.length} eligible drivers for order ${sale.id}. Broadcasting request...`);
            
            // 4. Broadcast to the closest 3 (or fewer) eligible drivers.
            const driversToNotify = eligibleDriverIds.slice(0, 3);
            driversToNotify.forEach(driverId => {
                const driverWs = driverConnections.get(driverId);
                if (driverWs && driverWs.readyState === WebSocket.OPEN) {
                    driverWs.send(JSON.stringify({ type: 'new_urgent_order_request', payload: sale }));
                    logger.info(`Sent order request to driver ${driverId} for order ${sale.id}.`);
                }
            });
        } else {
            logger.warn(`No eligible drivers found nearby for order ${sale.id}.`);
        }
    } catch (assignmentError) {
        logger.error(assignmentError, `Failed to run driver assignment logic for order ${sale.id}`);
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
        include: { 
            items: true,
            batchReview: {
                select: {
                    rating: true
                }
            }
        },
        orderBy: { date: 'desc' }
    });

    const bills: BillEntry[] = sales.map(sale => ({
        id: sale.id,
        date: sale.date.toISOString().split('T')[0],
        items: sale.items.map(item => ({
            id: item.id,
            name: item.vegetableName,
            quantity: item.quantity,
            price: item.price,
            vegetableId: item.vegetableId,
        })),
        total: sale.total,
        paymentStatus: sale.paymentStatus,
        batchReview: sale.batchReview
    }));
    res.json(bills);
});


router.post('/sales/record', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    const { userId, items, total, isUrgent } = req.body;
    try {
        const sale = await prisma.$transaction(async (tx) => {
            const newSale = await tx.sale.create({
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
                include: { items: true }
            });

            // Clear the user's wishlist for today
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            await tx.wishlist.deleteMany({
                where: { userId: userId, date: today },
            });

            return newSale;
        });

        // Notify admins/drivers of the new sale
        if (sale.isUrgent) {
            broadcast({ type: 'new_urgent_order', payload: sale });
        }
        
        // Notify the specific user's client to clear its local wishlist state
        const userSocket = userConnections.get(userId);
        if (userSocket && userSocket.readyState === WebSocket.OPEN) {
            userSocket.send(JSON.stringify({ type: 'wishlist_cleared' }));
            logger.info(`Sent wishlist_cleared notification to user ${userId}`);
        }
        
        res.status(201).json(sale);

    } catch (error) {
        logger.error(error, "Failed to record sale");
        res.status(500).json({ error: 'Could not record sale' });
    }
});


router.post('/reviews/batch', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    const { saleId, rating, comment } = req.body;
    const userId = req.user.phone;

    if (!saleId || !rating) {
        return res.status(400).json({ error: 'Sale ID and rating are required.' });
    }

    try {
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: { items: true }
        });

        if (!sale || sale.userId !== userId) {
            return res.status(403).json({ error: "You can only review sales you've made." });
        }
        
        // Create the main batch review first
        const batchReview = await prisma.batchReview.create({
            data: { rating, comment, userId, saleId: sale.id },
        });

        let itemRatings = new Map<string, number>();

        // If a comment exists, use AI to parse for specific ratings
        if (comment && process.env.API_KEY) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const itemNames = sale.items.map(i => i.vegetableName).join(', ');
                const prompt = `Analyze user feedback on a vegetable delivery. The user gave an overall rating of ${rating}/5. The feedback is: "${comment}". The items in the order were: ${itemNames}.
                
                Your task is to determine a specific rating (1-5) for each vegetable based on the text.
                Rules:
                1. If a vegetable is praised (e.g. "good", "fresh", "badiya"), give it 5.
                2. If a vegetable is criticized (e.g. "soft", "rotten", "bad", "naram"), give it 1 or 2.
                3. If the review is mixed (e.g. "okay"), give it 3.
                4. If a vegetable is NOT mentioned in the text, imply the Overall Rating (${rating}) for it.
                
                Respond ONLY with a valid JSON array of objects, with keys "vegetableName" (string) and "rating" (number). 
                Example: [{"vegetableName": "Tomato", "rating": 2}, {"vegetableName": "Potato", "rating": 5}]`;

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    vegetableName: { type: Type.STRING },
                                    rating: { type: Type.NUMBER }
                                }
                            }
                        }
                    }
                });
                
                if (response.text) {
                    const specificRatings = JSON.parse(response.text.trim());
                    for (const specific of specificRatings) {
                        if (specific.vegetableName && typeof specific.rating === 'number') {
                            itemRatings.set(specific.vegetableName.toLowerCase(), specific.rating);
                        }
                    }
                    logger.info({ saleId, specificRatings }, "AI extracted specific ratings from comment.");
                }
            } catch (aiError) {
                logger.error(aiError, "Gemini API call failed for batch review analysis.");
                // Continue without specific ratings if AI fails
            }
        }

        // Update each vegetable's aggregate rating
        for (const item of sale.items) {
            // Use specific rating if AI found one, otherwise use the batch rating
            const specificRating = itemRatings.get(item.vegetableName.toLowerCase());
            const ratingToApply = specificRating !== undefined ? specificRating : rating;

            // Using raw query for atomic update to avoid race conditions
            // This updates the running average: NewAvg = ((OldAvg * Count) + NewRating) / (Count + 1)
            await prisma.$executeRaw`UPDATE "Vegetable" SET "averageRating" = (("averageRating" * "ratingCount" + ${ratingToApply}) / ("ratingCount" + 1)), "ratingCount" = "ratingCount" + 1 WHERE id = ${item.vegetableId}`;
        }
        
        res.status(201).json(batchReview);
        
    } catch (error: any) {
        if (error.code === 'P2002') { // Unique constraint failed on saleId
            return res.status(409).json({ error: "This sale has already been reviewed." });
        }
        logger.error(error, "Failed to submit batch review");
        res.status(500).json({ error: 'Could not submit review.' });
    }
});

export default router;
