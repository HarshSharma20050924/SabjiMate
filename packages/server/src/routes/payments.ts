import { Router, Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { protect } from '../middleware/auth';
import prisma from '../db';
import logger from '../logger';
import { broadcast } from '../websocket';
// FIX: Import PaymentStatus enum from prisma client.
import { PaymentStatus } from '@prisma/client';

const router = Router();

// --- Hardcoded Test Keys for Local Development ---
const RAZORPAY_KEY_ID = "rzp_test_RVRsuEUd9LNZIM";
const RAZORPAY_KEY_SECRET = "XnNMfcXkY0WhHvojoEGyM5GQ";

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    logger.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set. Payment routes will not work.');
}

const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

// Create Order
router.post('/create-order', protect, async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'A valid amount is required.' });
    }

    const options = {
        amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_order_${new Date().getTime()}`,
    };

    try {
        const order = await razorpayInstance.orders.create(options);
        // Send the public key_id back to the client
        res.json({ ...order, keyId: RAZORPAY_KEY_ID });
    } catch (error) {
        logger.error(error, "Failed to create Razorpay order");
        res.status(500).json({ error: "Could not create payment order." });
    }
});

// Verify Payment
router.post('/verify', protect, async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, saleId } = req.body;
    const userId = req.user.phone;

    const shasum = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
        return res.status(400).json({ error: 'Transaction not legit!' });
    }

    try {
        if (saleId) {
            // New logic for single urgent order payment
            const sale = await prisma.sale.update({
                where: { id: saleId },
                data: { paymentStatus: PaymentStatus.PAID_ONLINE },
                include: { items: true }
            });

            broadcast({
                type: 'payment_received_online',
                payload: {
                    customerName: req.user.name,
                    amount: sale.total,
                }
            });
            
            // Also broadcast that a new urgent order has been finalized
            if (sale.isUrgent) {
                broadcast({ type: 'new_urgent_order', payload: sale });
            }

        } else {
            // Old logic for paying all outstanding bills from the Bills screen
            const unpaidSales = await prisma.sale.findMany({
                where: {
                    userId: userId,
                    paymentStatus: 'UNPAID',
                }
            });
            const totalPaid = unpaidSales.reduce((acc, sale) => acc + sale.total, 0);

            await prisma.sale.updateMany({
                where: {
                    id: { in: unpaidSales.map(sale => sale.id) }
                },
                data: {
                    paymentStatus: PaymentStatus.PAID_ONLINE,
                },
            });
            
            broadcast({
                type: 'payment_received_online',
                payload: {
                    customerName: req.user.name,
                    amount: totalPaid,
                }
            });
        }

        res.json({ status: 'ok', message: 'Payment verified successfully.' });

    } catch (error) {
        logger.error(error, "Failed to verify payment and update database");
        res.status(500).json({ error: "Could not update payment status." });
    }
});

export default router;
