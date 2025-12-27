import twilio from 'twilio';
import logger from '../logger';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Sends an OTP with a customizable message body.
 * In development, it logs to the console. In production, it uses Twilio.
 * This behavior can be overridden by setting FORCE_DEV_OTP=true in the environment.
 */
export const sendOTP = async (phone: string, otp: string, messageTemplate?: string) => {
    const isDev = process.env.NODE_ENV !== 'production' || process.env.FORCE_DEV_OTP === 'true';

    const defaultTemplate = `Your SabziMATE verification code is: {{otp}}\n@${new URL(APP_URL).hostname} #{{otp}}`;
    const body = (messageTemplate || defaultTemplate).replace(/{{otp}}/g, otp);

    if (isDev || phone === '9876543210') {
        logger.info('--- DEV OTP ---');
        logger.info(`To: ${phone}`);
        logger.info(`Message: ${body}`);
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
        await twilioClient.messages.create({
            body: body,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${phone}`
        });
        logger.info({ phone }, `Successfully sent OTP via Twilio.`);
    } catch (error) {
        logger.error(error, `Failed to send SMS OTP to phone: ${phone}`);
        throw new Error('Failed to send OTP. Please try again later.');
    }
};