
import prisma from '../db';
import bcrypt from 'bcryptjs';
import logger from '../logger';

export const initializeDefaultAdmin = async () => {
    // 1. Seed Delivery Area
    try {
        const ujjainArea = await prisma.deliveryArea.upsert({
            where: { city_state: { city: 'Ujjain', state: 'Madhya Pradesh' } },
            update: {},
            create: { city: 'Ujjain', state: 'Madhya Pradesh', isActive: true },
        });
        logger.info(`✅ Initial delivery area ensured: ${ujjainArea.city}`);
    } catch (error) {
        logger.error(error, '❌ Error seeding initial delivery area');
    }
    
    // 2. Seed Admin User
    const adminPhone = process.env.DEFAULT_ADMIN_PHONE;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

    if (!adminPhone || !adminPassword) {
        const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' }});
        if (!adminExists) {
            logger.warn('ADMIN SETUP REQUIRED: To create a default admin, add DEFAULT_ADMIN_PHONE and DEFAULT_ADMIN_PASSWORD to your .env file.');
        }
        return;
    }

    try {
        const existingAdmin = await prisma.user.findUnique({
            where: { phone: adminPhone }
        });

        if (existingAdmin) {
            logger.info('Default admin user already exists.');
            return;
        }

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
            }
        });

        logger.info('✅ Default admin user created successfully.');

    } catch (error) {
        logger.error(error, '❌ Error creating default admin user');
    }
};
