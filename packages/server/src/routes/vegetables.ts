




// FIXME: This file may show a TypeScript error if the Prisma client has not been generated.
// Run `npx prisma generate` in your terminal to fix this.
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { protect, admin } from '../middleware/auth';
// @ts-ignore: This is a valid import after `prisma generate`
import { Vegetable as PrismaVegetable, LocationPrice as PrismaLocationPrice, DeliveryArea as PrismaDeliveryArea } from '@prisma/client';

import logger from '../logger';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';

const router = Router();

type VegetableWithRelations = PrismaVegetable & {
    locationPrices: (PrismaLocationPrice & { area: PrismaDeliveryArea })[]
};

// This route is public, for clients to see today's vegetable list
router.get('/', cacheMiddleware(600), async (req: Request, res: Response) => {
    const { city } = req.query;

    try {
        const vegetables: VegetableWithRelations[] = await prisma.vegetable.findMany({
            where: { isAvailable: true }, // Only fetch available vegetables
            include: { locationPrices: { include: { area: true } } },
            orderBy: { name: 'asc' }
        });

        const pricedVegetables = vegetables.map(veg => {
            let finalSabzimatePrice = veg.sabzimatePrice;
            let finalMarketPrice = veg.marketPrice;

            if (city && typeof city === 'string') {
                const locationPrice = veg.locationPrices.find(lp => lp.area.city.toLowerCase() === city.toLowerCase());
                if (locationPrice) {
                    finalSabzimatePrice = locationPrice.sabzimatePrice;
                    finalMarketPrice = locationPrice.marketPrice;
                }
            }

            // The client expects 'price' as the selling price.
            return {
                id: veg.id,
                name: veg.name,
                price: finalSabzimatePrice,
                marketPrice: finalMarketPrice,
                unit: veg.unit,
                image: veg.image,
                offerTag: veg.offerTag,
                description: veg.description,
                category: veg.category,
                isAvailable: veg.isAvailable,
            };
        });
        res.json(pricedVegetables);
    } catch (error) {
        logger.error(error, 'Could not fetch vegetables');
        res.status(500).json({ error: 'Could not fetch vegetables' });
    }
});

// All subsequent routes are for admins only
router.use(protect, admin);

router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, marketPrice, sabzimatePrice, unit, image, offerTag, description, category, isAvailable } = req.body;
        const veg = await prisma.vegetable.create({
            data: {
                name,
                marketPrice: parseFloat(marketPrice),
                sabzimatePrice: parseFloat(sabzimatePrice),
                unit,
                image,
                offerTag,
                description,
                category,
                isAvailable,
            }
        });
        await invalidateCache('/api/vegetables');
        res.status(201).json(veg);
    } catch (error: any) {
        logger.error(error, "Failed to create vegetable");
        if (error.code === 'P2002') { // Prisma unique constraint violation
            return res.status(409).json({ error: 'A vegetable with this name already exists.' });
        }
        res.status(500).json({ error: error.message || 'Could not create vegetable.' });
    }
});

router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, marketPrice, sabzimatePrice, unit, image, offerTag, description, category, isAvailable } = req.body;
        const veg = await prisma.vegetable.update({
            where: { id: parseInt(id) },
            data: {
                name,
                marketPrice: parseFloat(marketPrice),
                sabzimatePrice: parseFloat(sabzimatePrice),
                unit,
                image,
                offerTag,
                description,
                category,
                isAvailable,
            }
        });
        await invalidateCache('/api/vegetables');
        res.json(veg);
    } catch (error: any) {
        logger.error(error, "Failed to update vegetable");
        if (error.code === 'P2002') { // Prisma unique constraint violation
            return res.status(409).json({ error: 'A vegetable with this name already exists.' });
        }
        res.status(500).json({ error: error.message || 'Could not update vegetable.' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.vegetable.delete({ where: { id: parseInt(id) } });
        await invalidateCache('/api/vegetables');
        res.status(204).send();
    } catch (error: any) {
        logger.error(error, "Failed to delete vegetable");
        res.status(500).json({ error: error.message || 'Could not delete vegetable.' });
    }
});

router.get('/:vegId/prices', async (req: Request, res: Response) => {
    try {
        const { vegId } = req.params;
        const prices = await prisma.locationPrice.findMany({
            where: { vegetableId: parseInt(vegId) }
        });
        res.json(prices);
    } catch (error: any) {
        logger.error(error, "Failed to fetch location prices");
        res.status(500).json({ error: error.message || 'Could not fetch location prices.' });
    }
});

router.post('/:vegId/prices', async (req: Request, res: Response) => {
    const { vegId } = req.params;
    const { areaId, marketPrice, sabzimatePrice } = req.body;
    if (marketPrice < 0 || sabzimatePrice < 0) return res.status(400).json({ error: 'Price cannot be negative.' });
    try {
        const newOrUpdatedPrice = await prisma.locationPrice.upsert({
            where: { vegetableId_areaId: { vegetableId: parseInt(vegId), areaId: areaId } },
            update: { marketPrice, sabzimatePrice },
            create: { vegetableId: parseInt(vegId), areaId: areaId, marketPrice, sabzimatePrice }
        });
        await invalidateCache('/api/vegetables');
        res.status(201).json(newOrUpdatedPrice);
    } catch (e: any) {
        logger.error(e, "Failed to set location price");
        res.status(500).json({ error: e.message || 'Could not set the price for this location.' });
    }
});

export default router;