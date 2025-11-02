
import pino from 'pino';

// Configure pino-pretty for development, otherwise use default JSON logging for production
const transport = process.env.NODE_ENV !== 'production'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

const logger = pino({
  level: 'info',
  transport,
});

export default logger;
