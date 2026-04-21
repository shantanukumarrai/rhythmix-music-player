const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
      ),
    }),
  ],
});

if (process.env.NODE_ENV !== 'test') {
  const logDir = path.dirname(process.env.LOG_FILE || './logs/app.log');
  require('fs').mkdirSync(logDir, { recursive: true });
  logger.add(new winston.transports.File({ filename: process.env.LOG_FILE || './logs/app.log' }));
}

module.exports = logger;
