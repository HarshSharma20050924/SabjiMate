import twilio from 'twilio';
import logger from '../logger';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Sends an OTP. In development, it logs to the console. In production, it uses Twilio.
 * This behavior can be overridden by setting FORCE_DEV_OTP=true in the environment.
 */
export const sendOTP = async (phone: string, otp: string) => {
    // isDev is true if NODE_ENV is anything other than 'production' (e.g., 'development', 'undefined').
    // FORCE_DEV_OTP provides an override for situations where NODE_ENV might be incorrectly set to 'production' in a dev context.
    const isDev = process.env.NODE_ENV !== 'production' || process.env.FORCE_DEV_OTP === 'true';

    // The magic number '9876543210' always uses the dev path for testing.
    if (isDev || phone === '9876543210') {
        logger.info('--- DEV OTP ---');
        logger.info(`Phone: ${phone}`);
        logger.info(`OTP: ${otp}`);
        logger.info(`isDev evaluated to: ${isDev}`);
        logger.info(`NODE_ENV is: ${process.env.NODE_ENV}`);
        logger.info(`FORCE_DEV_OTP is: ${process.env.FORCE_DEV_OTP}`);
        logger.info('---------------');
        return;
    }

    if (!twilioClient) {
        logger.error('Twilio client is not initialized, but an attempt was made to send a production OTP.');
        throw new Error('OTP service is not configured.');
    }
    if (!process.env.TWILIO_PHONE_NUMBER) {
        logger.error('TWILIO_PHONE_NUMBER is not set.');
        throw new Error('OTP service is not configured.');
    }

    try {
        const appDomain = new URL(APP_URL).hostname;
        await twilioClient.messages.create({
            body: `Your SabziMATE verification code is: ${otp}\n@${appDomain} #${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${phone}`
        });
        logger.info({ phone }, `Successfully sent OTP via Twilio.`);
    } catch (error) {
        logger.error(error, `Failed to send SMS OTP to phone: ${phone}`);
        throw new Error('Failed to send OTP. Please try again later.');
    }
};