
// FIXME: This file may show a TypeScript error if the Prisma client has not been generated.
// Run `npx prisma generate` in your terminal to fix this.
// @ts-ignore: This will be resolved by running `npx prisma generate`
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const sampleVegetables = [
    {
        name: { EN: 'Tomato', HI: 'टमाटर' },
        marketPrice: 45.0,
        sabzimatePrice: 40.0,
        unit: { EN: 'kg', HI: 'किलो' },
        image: 'https://images.unsplash.com/photo-1561155634-425b768a4d7a?q=80&w=1740&auto=format&fit=crop',
    },
    {
        name: { EN: 'Potato', HI: 'आलू' },
        marketPrice: 35.0,
        sabzimatePrice: 30.0,
        unit: { EN: 'kg', HI: 'किलो' },
        image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba657?q=80&w=1740&auto=format&fit=crop',
    },
    {
        name: { EN: 'Onion', HI: 'प्याज' },
        marketPrice: 55.0,
        sabzimatePrice: 50.0,
        unit: { EN: 'kg', HI: 'किलो' },
        image: 'https://images.unsplash.com/photo-1587049352851-d481dd123246?q=80&w=1740&auto=format&fit=crop',
    },
    {
        name: { EN: 'Carrot', HI: 'गाजर' },
        marketPrice: 60.0,
        sabzimatePrice: 55.0,
        unit: { EN: 'kg', HI: 'किलो' },
        image: 'https://images.unsplash.com/photo-1590196921406-039c59392348?q=80&w=1740&auto=format&fit=crop',
    },
];

async function main() {
    console.log('🌱 Starting database seeding...');

    // 1. Seed Delivery Area
    const ujjainArea = await prisma.deliveryArea.upsert({
        where: { city_state: { city: 'Ujjain', state: 'Madhya Pradesh' } },
        update: {},
        create: { city: 'Ujjain', state: 'Madhya Pradesh', isActive: true },
    });
    console.log(`✅ Upserted delivery area: ${ujjainArea.city}`);

    // 2. Seed Admin User
    const adminPhone = process.env.DEFAULT_ADMIN_PHONE;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

    if (adminPhone && adminPassword) {
        const existingAdmin = await prisma.user.findUnique({ where: { phone: adminPhone } });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await prisma.user.create({
                data: {
                    phone: adminPhone,
                    password: hashedPassword,
                    name: 'Default Admin',
                    role: 'ADMIN',
                    address: 'Main Office',
                    city: 'Ujjain',
                    state: 'Madhya Pradesh',
                },
            });
            console.log('✅ Default admin user created successfully.');
        } else {
            console.log('ℹ️ Default admin user already exists.');
        }
    } else {
        console.warn('⚠️ Admin user not seeded. Set DEFAULT_ADMIN_PHONE and DEFAULT_ADMIN_PASSWORD in .env');
    }

    // 3. Seed Vegetables
    for (const veg of sampleVegetables) {
        const vegName = veg.name as Prisma.JsonObject;
        await prisma.vegetable.upsert({
            where: { name: vegName },
            update: {
                marketPrice: veg.marketPrice,
                sabzimatePrice: veg.sabzimatePrice,
                unit: veg.unit,
                image: veg.image,
            },
            create: {
                name: veg.name,
                marketPrice: veg.marketPrice,
                sabzimatePrice: veg.sabzimatePrice,
                unit: veg.unit,
                image: veg.image,
            },
        });
    }
    console.log(`✅ Seeded ${sampleVegetables.length} sample vegetables.`);
    
    console.log('🌱 Seeding finished.');
}

main()
  .catch((e) => {
    console.error('❌ An error occurred during seeding:', e);
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });