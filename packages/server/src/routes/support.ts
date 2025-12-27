
import { Router } from 'express';
import { protect } from '../middleware/auth';
import prisma from '../db';
import logger from '../logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createTicketSchema = z.object({
    subject: z.string().min(3, 'Subject must be at least 3 characters'),
    message: z.string().min(5, 'Message must be at least 5 characters'),
});

router.use(protect);

// Create a new support ticket
router.post('/', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    try {
        const { subject, message } = createTicketSchema.parse(req.body);

        const ticket = await prisma.supportTicket.create({
            data: {
                userId: req.user.phone,
                subject,
                message,
            },
        });

        logger.info({ userId: req.user.phone, ticketId: ticket.id }, 'Support ticket created');
        res.status(201).json(ticket);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        logger.error(error, 'Failed to create support ticket');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all tickets for the logged-in user
router.get('/', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    try {
        const tickets = await prisma.supportTicket.findMany({
            where: { userId: req.user.phone },
            orderBy: { createdAt: 'desc' },
        });
        res.json(tickets);
    } catch (error) {
        logger.error(error, 'Failed to fetch support tickets');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a specific ticket details
router.get('/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authorized' });
    try {
        const ticketId = parseInt(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket || ticket.userId !== req.user.phone) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json(ticket);
    } catch (error) {
        logger.error(error, 'Failed to fetch ticket details');
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
