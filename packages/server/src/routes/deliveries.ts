




import { Router, Request, Response } from 'express';
import prisma from '../db';
import { protect, driverOrAdmin } from '../middleware/auth';

const router = Router();

// User confirms or denies delivery for the day
router.post('/confirm', protect, async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    const { choice } = req.body;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await prisma.deliveryConfirmation.upsert({
        where: { userId_date: { userId: req.user.phone, date: today } },
        update: { choice },
        create: { userId: req.user.phone, date: today, choice }
    });
    res.status(200).send();
});

// Admin and Driver get today's delivery list
router.get('/today', protect, driverOrAdmin, async (req: Request, res: Response) => {
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


export default router;